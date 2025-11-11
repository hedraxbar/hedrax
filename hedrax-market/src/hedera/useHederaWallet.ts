// src/hedera/useHederaWallet.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { selectHashpackProvider } from "./selectHashpackProvider";

type Status = "idle" | "initializing" | "ready" | "connecting" | "connected" | "error";

type Adapter = {
  connect: () => Promise<string | null>;      // returns Hedera accountId (0.0.x) or null
  disconnect: () => Promise<void>;
  getAccountId: () => string | null;
  destroy?: () => Promise<void> | void;
};

// ✅ make the literal type here so we don’t need `as const` later
const HEDERA_CHAIN_ID_DEC = 295 as const;
const HEDERA_CHAIN_ID_HEX = "0x127" as const;
const HEDERA_RPC = (import.meta.env.VITE_HEDERA_RPC as string) || "https://mainnet.hashio.io/api";

function useStableRef<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

let CONNECTOR_PROMISE: Promise<Adapter> | null = null;
let CONNECTOR_SINGLETON: Adapter | null = null;

export function useHederaWallet() {
  const [status, setStatus] = useState<Status>("idle");
  const [accountId, setAccountId] = useState<string | null>(null);   // Hedera 0.0.x
  const [evmAddress, setEvmAddress] = useState<string | null>(null); // 0x...
  const [chainId, setChainId] = useState<number | null>(null);
  const [err, setErr] = useState<unknown>(null);

  const [hasExtension, setHasExtension] = useState(false);
  const adapterRef = useRef<Adapter | null>(null);
  useStableRef(status);

  const appMeta = {
    name: "HedraX",
    description: "HedraX early access",
    icons: ["https://c.animaapp.com/mh25bcdiL6JXsX/img/hedraxlogo-2-1.png"],
    url: typeof window !== "undefined" ? window.location.origin : "https://hedrax.io",
  };

  /** ————— EVM (HashPack injected) helpers ————— */
  const getInjected = useCallback(() => selectHashpackProvider(), []);
  const ensureEvmOnHedera = useCallback(async () => {
    const injected = getInjected();
    if (!injected?.request) return false;
    try {
      const current = await injected.request({ method: "eth_chainId" }).catch(() => null);
      const dec = typeof current === "string" ? parseInt(current, 16) : Number(current);
      if (dec === HEDERA_CHAIN_ID_DEC) return true;

      // try switch, then add+switch
      try {
        await injected.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HEDERA_CHAIN_ID_HEX }],
        });
        return true;
      } catch {
        await injected.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: HEDERA_CHAIN_ID_HEX,
            chainName: "Hedera EVM Mainnet",
            rpcUrls: [HEDERA_RPC],
            nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
            blockExplorerUrls: ["https://hashscan.io/mainnet"],
          }],
        });
        await injected.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HEDERA_CHAIN_ID_HEX }],
        });
        return true;
      }
    } catch {
      return false;
    }
  }, [getInjected]);

  const pullEvmAccounts = useCallback(async () => {
    const injected = getInjected();
    if (!injected?.request) return;

    // This triggers the **HashPack extension popup**
    const accs: string[] = await injected.request({ method: "eth_requestAccounts" });
    const addr = accs?.[0] ? ethers.getAddress(accs[0]) : null;
    setEvmAddress(addr || null);

    // Track chainId, try to ensure Hedera EVM
    let cid: number | null = null;
    try {
      const hex = await injected.request({ method: "eth_chainId" });
      cid = typeof hex === "string" ? parseInt(hex, 16) : Number(hex);
    } catch {}
    if (cid !== HEDERA_CHAIN_ID_DEC) {
      const ok = await ensureEvmOnHedera();
      if (ok) cid = HEDERA_CHAIN_ID_DEC;
    }
    setChainId(cid);

    // Listen to account/chain changes — keep stable refs
    const onAcc = (a: string[]) => {
      setEvmAddress(a?.[0] ? ethers.getAddress(a[0]) : null);
    };
    const onChain = (c: string | number) => {
      setChainId(typeof c === "string" ? parseInt(c, 16) : Number(c));
    };

    injected.removeListener?.("accountsChanged", onAcc as any);
    injected.removeListener?.("chainChanged", onChain as any);
    injected.on?.("accountsChanged", onAcc as any);
    injected.on?.("chainChanged", onChain as any);
  }, [getInjected, ensureEvmOnHedera]);

  /** ————— Hedera (HashConnect) adapter ————— */
  const ensureAdapter = useCallback(async (): Promise<Adapter> => {
    // Detect extension early for UI/state
    setHasExtension(!!getInjected());

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

      const projectId = import.meta.env.VITE_WC_PROJECT_ID as string;
      if (!projectId) {
        const e = new Error("VITE_WC_PROJECT_ID missing");
        setErr(e);
        setStatus("error");
        throw e;
      }

      const mainnetLedgerId = LedgerId?.MAINNET || LedgerId?.Mainnet || LedgerId.fromString("mainnet");
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
        try { if (ev && typeof connector.on === "function") connector.on(ev, cb); } catch {}
      };

      // Hedera session connected
      on(HederaSessionEvent?.SessionConnected ?? "SESSION_CONNECTED", (payload: any) => {
        const acct = extractAccount(payload) || extractAccount(connector);
        if (acct) {
          setAccountId(acct);
          setStatus("connected");
        } else {
          setStatus("ready");
        }
        // If extension exists, immediately pull EVM side (pops HashPack if needed)
        if (getInjected()) void pullEvmAccounts();
      });

      // Accounts changed
      on(HederaSessionEvent?.AccountsChanged ?? "ACCOUNTS_CHANGED", (payload: any) => {
        const acct = extractAccount(payload) || extractAccount(connector);
        if (acct) {
          setAccountId(acct);
          setStatus("connected");
        }
      });

      // Disconnected
      on(HederaSessionEvent?.SessionDisconnected ?? "SESSION_DISCONNECTED", () => {
        setAccountId(null);
        setStatus("ready");
      });

      const adapter: Adapter = {
        getAccountId: () => {
          try { return extractAccount(connector); } catch { return null; }
        },
        connect: async () => {
          setStatus("connecting");
          try {
            await connector.openModal?.();  // opens HashConnect modal
            // tiny delay for wallet to emit
            await new Promise((r) => setTimeout(r, 350));
            const acct = extractAccount(connector);
            if (acct) {
              setAccountId(acct);
              setStatus("connected");
              // If extension present → trigger EVM popup+bind
              if (getInjected()) await pullEvmAccounts();
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
          try { await connector.disconnect?.(); }
          finally {
            setAccountId(null);
            setEvmAddress(null);
            setChainId(null);
            setStatus("ready");
          }
        },
        destroy: async () => {
          try { await connector.disconnect?.(); } catch {}
        },
      };

      // Silent restore
      try {
        const acct = adapter.getAccountId();
        if (acct) {
          setAccountId(acct);
          setStatus("connected");
          if (getInjected()) void pullEvmAccounts();
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
  }, [appMeta, getInjected, pullEvmAccounts]);

  useEffect(() => {
    setHasExtension(!!getInjected());
    return () => { adapterRef.current?.destroy?.(); };
  }, [getInjected]);

  /** ————— Public API ————— */
  const connect = useCallback(async () => {
    const a = await ensureAdapter();
    adapterRef.current = a;
    return a.connect();
  }, [ensureAdapter]);

  const disconnect = useCallback(async () => {
    const a = adapterRef.current || (await ensureAdapter());
    return a.disconnect();
  }, [ensureAdapter]);

  // Return a strongly-typed chainId using the literal type from the const declaration
  type EthersCtx = {
    provider: ethers.BrowserProvider;
    signer: ethers.Signer;
    address: string;
    chainId: typeof HEDERA_CHAIN_ID_DEC;
  };

  const getEthers = useCallback(async (): Promise<EthersCtx> => {
    const injected = getInjected();
    if (!injected?.request) throw new Error("HashPack extension provider not available");
    // ensure chain id
    await ensureEvmOnHedera();
    const browserProvider = new ethers.BrowserProvider(injected as any, "any");
    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    // ✅ no `as const` here anymore
    return { provider: browserProvider, signer, address, chainId: HEDERA_CHAIN_ID_DEC };
  }, [getInjected, ensureEvmOnHedera]);

  return useMemo(
    () => ({
      status,
      network: "mainnet" as const,
      error: err,
      // Hedera + EVM
      accountId,          // Hedera 0.0.x
      evmAddress,         // 0x...
      chainId,            // number | null
      hasExtension,       // whether HashPack extension detected
      // actions
      connect,
      disconnect,
      getEthers,
    }),
    [status, err, accountId, evmAddress, chainId, hasExtension, connect, disconnect, getEthers]
  );
}
