// src/hedera/useHederaWallet.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Status = "idle" | "initializing" | "ready" | "connecting" | "connected" | "error";

type Adapter = {
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  getAccountId: () => string | null;
  destroy?: () => Promise<void> | void;
};

function useStableRef<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

// Global singletons to avoid re-initializing WalletConnect core inside this hook.
let CONNECTOR_PROMISE: Promise<Adapter> | null = null;
let CONNECTOR_SINGLETON: Adapter | null = null;

export function useHederaWallet() {
  const [status, setStatus] = useState<Status>("idle");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [err, setErr] = useState<unknown>(null);

  const adapterRef = useRef<Adapter | null>(null);
  useStableRef(status);

  const appMeta = {
    name: "HedraX",
    description: "HedraX early access",
    icons: ["https://c.animaapp.com/mh25bcdiL6JXsX/img/hedraxlogo-2-1.png"],
    url: typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
  };

  const ensureAdapter = useCallback(async (): Promise<Adapter> => {
    if (CONNECTOR_SINGLETON) return CONNECTOR_SINGLETON;
    if (CONNECTOR_PROMISE) return CONNECTOR_PROMISE;

    setStatus("initializing");

    CONNECTOR_PROMISE = (async () => {
      let DAppConnector: any,
        HederaSessionEvent: any,
        HederaChainId: any,
        HederaJsonRpcMethod: any,
        LedgerId: any;

      try {
        const mod = await import("@hashgraph/hedera-wallet-connect");
        DAppConnector = mod?.DAppConnector;
        HederaSessionEvent = mod?.HederaSessionEvent;
        HederaChainId = mod?.HederaChainId;
        HederaJsonRpcMethod = mod?.HederaJsonRpcMethod;

        const sdkMod = await import("@hashgraph/sdk");
        LedgerId = sdkMod?.LedgerId;
      } catch (e) {
        console.error("[HedraX] Failed to load Hedera WC:", e);
        setErr(e);
        setStatus("error");
        throw e;
      }

      const projectId = "24f627ca64d15e24ba06692cf3b2439d"; // your WC id for Hedera SDK path
      const mainnetLedgerId = LedgerId.MAINNET || LedgerId.Mainnet || LedgerId.fromString("mainnet");

      const wantedMethods = Object.values(HederaJsonRpcMethod ?? {});
      const wantedEvents = [
        HederaSessionEvent?.ChainChanged,
        HederaSessionEvent?.AccountsChanged,
        HederaSessionEvent?.SessionConnected,
        HederaSessionEvent?.SessionDisconnected,
      ].filter(Boolean);

      const supportedChains = [HederaChainId?.Mainnet].filter(Boolean);

      const connector = new DAppConnector(
        appMeta,
        mainnetLedgerId,
        projectId,
        wantedMethods,
        wantedEvents,
        supportedChains
      );

      await connector.init({ logger: "silent" });
      console.log("[HedraX] dAppConnector.init OK (MAINNET)");

      const extractAccount = (x: any): string | null => {
        if (!x) return null;
        return (
          x.accountId ||
          x?.account?.accountId ||
          x?.accounts?.[0]?.accountId ||
          x?.accounts?.[0] ||
          x?.accountIds?.[0] ||
          null
        );
      };

      const on = (ev: string, cb: (...a: any[]) => void) => {
        try {
          if (ev && typeof connector.on === "function") connector.on(ev, cb);
        } catch {}
      };

      on(HederaSessionEvent?.SessionConnected ?? "SESSION_CONNECTED", (payload: any) => {
        const acct = extractAccount(payload) || extractAccount(connector);
        if (acct) {
          setAccountId(acct);
          setStatus("connected");
        } else {
          setStatus("ready");
        }
      });

      on(HederaSessionEvent?.AccountsChanged ?? "ACCOUNTS_CHANGED", (payload: any) => {
        const acct = extractAccount(payload) || extractAccount(connector);
        if (acct) {
          setAccountId(acct);
          setStatus("connected");
        }
      });

      on(HederaSessionEvent?.SessionDisconnected ?? "SESSION_DISCONNECTED", () => {
        setAccountId(null);
        setStatus("ready");
      });

      const adapter: Adapter = {
        getAccountId: () => {
          try {
            return extractAccount(connector);
          } catch {
            return null;
          }
        },
        connect: async () => {
          setStatus("connecting");
          try {
            await connector.openModal?.();
            await new Promise((r) => setTimeout(r, 400));
            let acct =
              (connector as any)?.session?.accounts?.[0] ??
              (connector as any)?.accounts?.[0] ??
              (connector as any)?.accountIds?.[0] ??
              extractAccount(connector);

            if (!acct) {
              try {
                const signers = connector.signers || [];
                if (signers.length > 0 && signers[0]?.getAccountId) {
                  const accountIdObj = signers[0].getAccountId();
                  acct = accountIdObj?.toString() || null;
                }
              } catch {}
            }

            if (acct) {
              setAccountId(acct);
              setStatus("connected");
              return acct;
            }
            setStatus("ready");
            const err = new Error("USER_REJECTED");
            (err as any).code = "USER_REJECTED";
            throw err;
          } catch (e: any) {
            setStatus("ready");
            throw e;
          }
        },
        disconnect: async () => {
          try {
            await connector.disconnect?.();
          } finally {
            setAccountId(null);
            setStatus("ready");
          }
        },
        destroy: async () => {
          try {
            await connector.disconnect?.();
          } catch {}
        },
      };

      // initial state
      try {
        const acct = adapter.getAccountId();
        if (acct) {
          setAccountId(acct);
          setStatus("connected");
        } else {
          setStatus("ready");
        }
      } catch {
        setStatus("ready");
      }

      CONNECTOR_SINGLETON = adapter;
      return CONNECTOR_SINGLETON;
    })();

    return CONNECTOR_PROMISE;
  }, []);

  useEffect(() => {
    // no auto-init; caller triggers connect()
    return () => {
      adapterRef.current?.destroy?.();
    };
  }, []);

  const connect = useCallback(async () => {
    const a = await ensureAdapter();
    adapterRef.current = a;
    return a.connect();
  }, [ensureAdapter]);

  const disconnect = useCallback(async () => {
    const a = adapterRef.current || (await ensureAdapter());
    return a.disconnect();
  }, [ensureAdapter]);

  const value = useMemo(
    () => ({
      status,
      accountId,
      network: "mainnet",
      error: err,
      connect,
      disconnect,
    }),
    [status, accountId, err, connect, disconnect]
  );

  return value;
}
