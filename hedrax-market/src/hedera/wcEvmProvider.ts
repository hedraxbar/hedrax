import UniversalProvider from "@walletconnect/universal-provider";

const PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID as string;
const RPC_URL = (import.meta.env.VITE_HEDERA_RPC_URL as string) || "https://mainnet.hashio.io/api";
const CHAIN_ID = 295;
const EIP155 = `eip155:${CHAIN_ID}`;

declare global {
  interface Window {
    __HEDRAX_WC_PROVIDER__?: any;
  }
}

let initPromise: Promise<any> | undefined;
let connectPromise: Promise<any> | undefined;

/* ---------- display_uri listeners (for QR/deeplink UI) ---------- */
type UriListener = (uri: string) => void;
const uriListeners = new Set<UriListener>();
export function onWcDisplayUri(cb: UriListener): () => void {
  uriListeners.add(cb);
  return () => uriListeners.delete(cb);
}
function emitDisplayUri(uri: string) {
  uriListeners.forEach((cb) => { try { cb(uri); } catch {} });
}

/* ---------- helpers ---------- */
function appMetadata() {
  return {
    name: "HedraX",
    description: "HedraX Launchpad",
    url: typeof window !== "undefined" ? window.location.origin : "https://hedrax.io",
    icons: ["https://c.animaapp.com/mh25bcdiL6JXsX/img/hedraxlogo-2-1.png"],
  };
}

export function getWcAddress(provider: any): string | null {
  try {
    const accounts: string[] = provider?.session?.namespaces?.eip155?.accounts || [];
    const first = accounts.find((a) => a.startsWith(`eip155:${CHAIN_ID}:`));
    return first ? first.split(":")[2] : null;
  } catch {
    return null;
  }
}

export async function getWcEvmProvider(): Promise<any> {
  return initOnce();
}

export async function isWcConnected(): Promise<boolean> {
  const provider = await initOnce();
  return !!getWcAddress(provider);
}

/** Wait until WC session yields an address or timeout */
export async function waitForAccount(timeoutMs = 120_000): Promise<string> {
  const provider = await initOnce();
  const existing = getWcAddress(provider);
  if (existing) return existing;

  return new Promise<string>((resolve, reject) => {
    const start = Date.now();
    const onUpdate = () => {
      const addr = getWcAddress(provider);
      if (addr) {
        cleanup();
        resolve(addr);
      } else if (Date.now() - start > timeoutMs) {
        cleanup();
        reject(new Error("WalletConnect connected, but no account returned within the time limit."));
      }
    };
    const onDelete = () => {
      cleanup();
      reject(new Error("WalletConnect session was closed before an account was provided."));
    };
    const cleanup = () => {
      provider.off?.("session_update", onUpdate);
      provider.off?.("accountsChanged", onUpdate);
      provider.off?.("session_delete", onDelete);
    };

    provider.on?.("session_update", onUpdate);
    provider.on?.("accountsChanged", onUpdate);
    provider.on?.("session_delete", onDelete);
    onUpdate();
  });
}

/** Ensure WC is on Hedera chain (295) */
export async function ensureChainOnWc(): Promise<void> {
  const provider = await initOnce();
  try {
    const chainHex = await provider.request({ method: "eth_chainId" }).catch(() => null);
    const numeric = typeof chainHex === "string" ? parseInt(chainHex, 16) : Number(chainHex); // <-- fix
    if (numeric === CHAIN_ID) return;

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + CHAIN_ID.toString(16) }],
    }).catch(async () => {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x" + CHAIN_ID.toString(16),
          chainName: "Hedera Mainnet",
          rpcUrls: [RPC_URL],
          nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
          blockExplorerUrls: ["https://hashscan.io/mainnet"],
        }],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + CHAIN_ID.toString(16) }],
      });
    });
  } catch {
    // some wallets map RPC automatically; it's fine
  }
}

/* ---------- HashPack peer guards & reset tools ---------- */
export function isHashPackPeer(provider: any): boolean {
  try {
    const meta = provider?.session?.peer?.metadata;
    const name = (meta?.name || meta?.url || meta?.description || "").toLowerCase();
    return name.includes("hashpack");
  } catch { return false; }
}

export function assertHashPackWC(provider: any): void {
  if (!isHashPackPeer(provider)) {
    throw new Error("Unsupported wallet via WalletConnect. Please connect with HashPack.");
  }
}

export async function disconnectWcSession() {
  const provider = await initOnce();
  try {
    const topic = provider?.session?.topic;
    if (topic) await provider.disconnect({ topic, reason: { code: 6000, message: "reset" } });
  } catch {}
  try {
    const ls = window.localStorage;
    Object.keys(ls).forEach((k) => {
      if (k.startsWith("walletconnect") || k.startsWith("wc@") || k.startsWith("wc:")) {
        ls.removeItem(k);
      }
    });
  } catch {}
}

/* ---------- core init/connect ---------- */
async function initOnce() {
  if (window.__HEDRAX_WC_PROVIDER__) return window.__HEDRAX_WC_PROVIDER__;
  if (initPromise) return initPromise;
  if (!PROJECT_ID) throw new Error("VITE_WC_PROJECT_ID is missing");

  initPromise = (async () => {
    const provider = await UniversalProvider.init({
      projectId: PROJECT_ID,
      metadata: appMetadata(),
      logger: "error",
    });

    provider.on?.("display_uri", (uri: string) => emitDisplayUri(uri));
    window.__HEDRAX_WC_PROVIDER__ = provider;
    return provider;
  })();

  return initPromise;
}

export async function ensureWcConnected(): Promise<any> {
  const provider = await initOnce();
  const accounts: string[] = provider?.session?.namespaces?.eip155?.accounts || [];
  const has295 = accounts.some((a) => a.startsWith(`eip155:${CHAIN_ID}:`));
  if (has295) return provider;

  if (connectPromise) return connectPromise;
  connectPromise = (async () => {
    await provider.connect({
      namespaces: {
        eip155: {
          chains: [EIP155],
          methods: [
            "eth_sendTransaction",
            "eth_sign",
            "personal_sign",
            "eth_signTypedData",
            "eth_signTypedData_v4",
            "wallet_switchEthereumChain",
            "wallet_addEthereumChain",
          ],
          events: ["accountsChanged", "chainChanged"],
          rpcMap: { [CHAIN_ID]: RPC_URL },
        },
      },
    });
    return provider;
  })();

  return connectPromise;
}

/** subscribe to account changes (helper for headers/badges) */
export async function onWcAccountsChanged(cb: (addr: string | null) => void): Promise<() => void> {
  const provider = await initOnce();
  const handler = () => cb(getWcAddress(provider));
  const off = () => {
    provider.off?.("session_update", handler);
    provider.off?.("accountsChanged", handler);
    provider.off?.("session_delete", handler);
  };
  provider.on?.("session_update", handler);
  provider.on?.("accountsChanged", handler);
  provider.on?.("session_delete", handler);
  handler(); // initial
  return off;
}
