// src/hedera/wcEvmProvider.ts
import UniversalProvider from "@walletconnect/universal-provider";

// Vite envs (make sure these are set)
const PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID as string;
const RPC_URL = (import.meta.env.VITE_HEDERA_RPC_URL as string) || "https://mainnet.hashio.io/api";
const CHAIN_ID = 295; // Hedera mainnet
const EIP155 = `eip155:${CHAIN_ID}`;

// Keep a global singleton to avoid "WalletConnect Core already initialized"
declare global {
  interface Window {
    __HEDRAX_WC_PROVIDER__?: any;
    __HEDRAX_WC_INIT_PROMISE__?: Promise<any>;
  }
}

async function initOnce() {
  if (window.__HEDRAX_WC_PROVIDER__) return window.__HEDRAX_WC_PROVIDER__;
  if (window.__HEDRAX_WC_INIT_PROMISE__) return window.__HEDRAX_WC_INIT_PROMISE__;

  if (!PROJECT_ID) throw new Error("VITE_WC_PROJECT_ID is missing");

  const metadata = {
    name: "HedraX",
    description: "HedraX Launchpad",
    url: typeof window !== "undefined" ? window.location.origin : "https://hedrax.io",
    icons: ["https://c.animaapp.com/mh25bcdiL6JXsX/img/hedraxlogo-2-1.png"],
  };

  window.__HEDRAX_WC_INIT_PROMISE__ = (async () => {
    const provider = await UniversalProvider.init({
      logger: "error",
      projectId: PROJECT_ID,
      metadata,
    });

    // Connect (opens HashPack popup/QR if no session yet)
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
          ],
          events: ["accountsChanged", "chainChanged"],
          rpcMap: {
            [CHAIN_ID]: RPC_URL,
          },
        },
      },
    });

    provider.on?.("display_uri", (uri: string) => {
      // For debugging: mobile deeplink or QR
      console.log("[HedraX][WC display_uri]", uri);
    });

    window.__HEDRAX_WC_PROVIDER__ = provider as any;
    return window.__HEDRAX_WC_PROVIDER__;
  })();

  return window.__HEDRAX_WC_INIT_PROMISE__;
}

export async function getWcEvmProvider(): Promise<any> {
  return initOnce();
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
