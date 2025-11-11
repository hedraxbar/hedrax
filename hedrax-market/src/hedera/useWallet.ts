// src/hedera/useWallet.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wcClient } from "./wcClient";
import { ethers } from "ethers";
import { AuthSecurity } from "./authSecurity";
import { fetchChallenge, signChallengeMessage, verifySignature } from "./authApi";

type Status = "idle" | "connecting" | "connected" | "error";

const MIRROR_BASE =
  (import.meta.env.VITE_MIRROR_BASE as string) ||
  "https://mainnet.mirrornode.hedera.com";

/** Resolve Hedera accountId (no checksum) from an EVM address via Mirror Node */
async function resolveHederaId(evmAddress: string): Promise<string | null> {
  try {
    const r = await fetch(`${MIRROR_BASE}/api/v1/accounts/${evmAddress}`);
    if (!r.ok) return null;
    const j = await r.json();
    // The top-level "account" field is like "0.0.10030174"
    const acct = j?.account || j?.accounts?.[0]?.account;
    return typeof acct === "string" ? acct : null;
  } catch {
    return null;
  }
}

export function useWallet() {
  const [status, setStatus] = useState<Status>("idle");
  const [account, setAccount] = useState<string | null>(null);          // EVM 0x...
  const [hederaId, setHederaId] = useState<string | null>(null);        // 0.0.x (no checksum)
  const [chainId, setChainId] = useState<number | null>(null);
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const connecting = useRef(false);

  // init + events
  useEffect(() => {
    let mounted = true;

    wcClient.init().catch((e) => {
      console.error("[WC] init error", e);
      if (mounted) setError(String(e?.message || e));
    });

    const onUri = (e: any) => setDisplayUri(e.detail || null);
    const onConnect = async () => {
      setDisplayUri(null);
      try {
        const p = wcClient.provider!;
        const accounts = (await p.request({ method: "eth_accounts" })) as string[];
        const hex = (await p.request({ method: "eth_chainId" })) as string;
        let addr: string | null = null;
        if (accounts?.length) {
          addr = ethers.getAddress(accounts[0]);
          setAccount(addr);
          AuthSecurity.setActiveWallet(addr);
          // resolve Hedera account id
          const hid = await resolveHederaId(addr);
          setHederaId(hid);
        } else {
          setAccount(null);
          setHederaId(null);
        }
        setChainId(parseInt(hex, 16));
        setStatus("connected");
      } catch (e) {
        setError(String((e as any)?.message || e));
      }
    };
    const onDisconnect = () => {
      setAccount(null);
      setHederaId(null);
      setChainId(null);
      setDisplayUri(null);
      setStatus("idle");
      setToken(null);
      AuthSecurity.setActiveWallet(null);
    };
    const onAccounts = async (e: any) => {
      const accs = e.detail as string[];
      if (accs?.length) {
        const addr = ethers.getAddress(accs[0]);
        setAccount(addr);
        AuthSecurity.setActiveWallet(addr);
        setToken(AuthSecurity.getToken(addr));
        // re-resolve Hedera id on account change
        setHederaId(await resolveHederaId(addr));
      } else {
        setAccount(null);
        setHederaId(null);
        setToken(null);
      }
    };
    const onChain = (e: any) => {
      const id = e.detail;
      setChainId(typeof id === "string" ? parseInt(id, 16) : Number(id));
    };

    window.addEventListener("wc:display_uri", onUri as any);
    window.addEventListener("wc:connect", onConnect as any);
    window.addEventListener("wc:disconnect", onDisconnect as any);
    window.addEventListener("wc:accountsChanged", onAccounts as any);
    window.addEventListener("wc:chainChanged", onChain as any);

    // Silent restore
    (async () => {
      try {
        const provider = await wcClient.init();
        const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
        if (accounts?.length) {
          const chainHex = (await provider.request({ method: "eth_chainId" })) as string;
          const addr = ethers.getAddress(accounts[0]);
          setAccount(addr);
          setChainId(parseInt(chainHex, 16));
          setStatus("connected");
          AuthSecurity.setActiveWallet(addr);
          setToken(AuthSecurity.getToken(addr));
          setHederaId(await resolveHederaId(addr));
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      mounted = false;
      window.removeEventListener("wc:display_uri", onUri as any);
      window.removeEventListener("wc:connect", onConnect as any);
      window.removeEventListener("wc:disconnect", onDisconnect as any);
      window.removeEventListener("wc:accountsChanged", onAccounts as any);
      window.removeEventListener("wc:chainChanged", onChain as any);
    };
  }, []);

  const connect = useCallback(async () => {
    if (connecting.current || status === "connecting") return;
    connecting.current = true;
    setStatus("connecting");
    setError(null);

    try {
      const { accounts, chainId } = await wcClient.connect();
      await wcClient.ensureHederaChain();
      const addr = accounts?.[0] ? ethers.getAddress(accounts[0]) : null;
      setAccount(addr);
      if (addr) {
        AuthSecurity.setActiveWallet(addr);
        setToken(AuthSecurity.getToken(addr));
        setHederaId(await resolveHederaId(addr));
      } else {
        setHederaId(null);
      }
      setChainId(chainId || 295);
      setStatus("connected");
      setDisplayUri(null);
    } catch (e: any) {
      setError(e?.message || String(e));
      setStatus("error");
    } finally {
      setTimeout(() => (connecting.current = false), 250);
    }
  }, [status]);

  const disconnect = useCallback(async () => {
    await wcClient.disconnect();
    setAccount(null);
    setHederaId(null);
    setChainId(null);
    setStatus("idle");
    setDisplayUri(null);
    setToken(null);
    AuthSecurity.setActiveWallet(null);
  }, []);

  const getEthers = useCallback(async () => {
    const provider = wcClient.provider || (await wcClient.init());
    await wcClient.ensureHederaChain();
    const browserProvider = new ethers.BrowserProvider(provider as any, "any");
    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    return { provider: browserProvider, signer, address, chainId: 295 as const };
  }, []);

  /** Login to your backend like SentX (challenge → sign → verify → token w/ 7-day TTL) */
  const login = useCallback(async (): Promise<string> => {
    if (!account) throw new Error("Connect wallet first");
    // reuse cached token if valid
    const existing = AuthSecurity.getToken(account);
    if (existing) {
      setToken(existing);
      return existing;
    }

    const { signer } = await getEthers();
    const { message } = await fetchChallenge(account);
    const signature = await signChallengeMessage(signer, message);
    const { token } = await verifySignature({ account, message, signature });

    AuthSecurity.saveToken(account, token);
    setToken(token);
    return token;
  }, [account, getEthers]);

  return useMemo(
    () => ({
      status,
      account,       // EVM 0x...
      hederaId,      // 0.0.x
      chainId,
      displayUri,
      error,
      token,
      connect,
      disconnect,
      getEthers,
      login,
    }),
    [status, account, hederaId, chainId, displayUri, error, token, connect, disconnect, getEthers, login]
  );
}
