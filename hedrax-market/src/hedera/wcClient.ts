import UniversalProvider from "@walletconnect/universal-provider";
import { selectHashpackProvider } from "./selectHashpackProvider";

const HEDERA_CHAIN_ID_DEC = 295;
const HEDERA_CHAIN_ID_HEX = "0x127";

const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID as string;
if (!WC_PROJECT_ID) console.warn("[WalletConnect] Missing env VITE_WC_PROJECT_ID");

const RPC_URL =
  (import.meta.env.VITE_HEDERA_RPC as string) ||
  "https://mainnet.hashio.io/api";

declare global {
  interface Window {
    __HEDRAX_WC_PROVIDER__?: any;
    __HEDRAX_EXTENSION_MODE__?: boolean;
  }
}

type WcState = {
  provider: any | null;
  displayUri: string | null;
  isReady: boolean;
  isExtension: boolean;
};
const state: WcState = { 
  provider: null, 
  displayUri: null, 
  isReady: false,
  isExtension: false 
};

let initPromise: Promise<any> | null = null;
let connectPromise: Promise<{ accounts: string[]; chainId: number }> | null = null;

function emit(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function appMetadata() {
  return {
    name: "HedraX Launchpad",
    description: "Create & mint collections on Hedera EVM",
    url: typeof window !== "undefined" ? window.location.origin : "https://hedrax.io",
    icons: ["https://wallet.hashpack.app/assets/favicon/favicon.ico"],
  };
}

function getAddressFromSession(provider: any): string | null {
  try {
    const accounts: string[] = provider?.session?.namespaces?.eip155?.accounts || [];
    const first = accounts.find(a => a.startsWith(`eip155:${HEDERA_CHAIN_ID_DEC}:`)) || accounts[0];
    return first ? first.split(":")[2] : null;
  } catch {
    return null;
  }
}

async function createProvider(): Promise<any> {
  if (state.provider) return state.provider;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // STEP 1: Try HashPack extension first (EIP-1193 injected provider)
    const injected = selectHashpackProvider();
    
    if (injected) {
      console.log("[wcClient] HashPack extension detected - using EIP-1193 provider");
      state.isExtension = true;
      state.provider = injected;
      window.__HEDRAX_EXTENSION_MODE__ = true;
      
      // Set up EIP-1193 event listeners
      injected.on?.("accountsChanged", (accs: string[]) => {
        emit("wc:accountsChanged", accs);
      });
      injected.on?.("chainChanged", (cid: string | number) => {
        emit("wc:chainChanged", cid);
      });
      injected.on?.("disconnect", () => {
        emit("wc:disconnect");
      });

      // Check if already connected
      try {
        const accounts = await injected.request({ method: "eth_accounts" });
        if (accounts?.length) {
          console.log("[wcClient] Extension already connected:", accounts[0]);
        }
      } catch (e) {
        console.log("[wcClient] Extension not yet connected");
      }

      state.isReady = true;
      return injected;
    }

    // STEP 2: Fall back to WalletConnect for mobile/no extension
    console.log("[wcClient] No extension - initializing WalletConnect");
    
    if (!WC_PROJECT_ID) throw new Error("VITE_WC_PROJECT_ID is missing");

    const provider = await UniversalProvider.init({
      projectId: WC_PROJECT_ID,
      metadata: appMetadata(),
      logger: "error",
    });

    provider.on?.("display_uri", (uri: string) => {
      state.displayUri = uri;
      emit("wc:display_uri", uri);
    });

    provider.on?.("session_update", () => {
      emit("wc:accountsChanged", [getAddressFromSession(provider)].filter(Boolean));
    });
    provider.on?.("session_delete", () => {
      state.displayUri = null;
      emit("wc:disconnect");
    });

    provider.on?.("accountsChanged", (accs: string[]) => emit("wc:accountsChanged", accs));
    provider.on?.("chainChanged", (cid: string | number) => emit("wc:chainChanged", cid));

    window.__HEDRAX_WC_PROVIDER__ = provider;
    state.provider = provider;
    state.isReady = true;
    state.isExtension = false;
    return provider;
  })();

  return initPromise;
}

export const wcClient = {
  get isReady() { return state.isReady; },
  get provider() { return state.provider; },
  get displayUri() { return state.displayUri; },
  get isExtension() { return state.isExtension; },

  // Added so NavigationSection.resetPairingUI() can clear the QR/link explicitly
  clearDisplayUri() {
    state.displayUri = null;
    emit("wc:display_uri", null);
  },

  async init() {
    return await createProvider();
  },

  async connect(): Promise<{ accounts: string[]; chainId: number }> {
    const provider = await createProvider();

    // EXTENSION MODE: Standard EIP-1193 flow
    if (state.isExtension) {
      console.log("[wcClient] Requesting accounts from extension...");
      
      try {
        // This triggers the HashPack popup!
        const accounts = await provider.request({ 
          method: "eth_requestAccounts" 
        });
        
        console.log("[wcClient] Extension approved:", accounts);
        
        const chainHex = await provider.request({ 
          method: "eth_chainId" 
        }).catch(() => HEDERA_CHAIN_ID_HEX);
        
        const chainId = typeof chainHex === "string" 
          ? parseInt(chainHex, 16) 
          : Number(chainHex);

        if (accounts?.length) {
          emit("wc:connect", { accounts, chainId });
          return { accounts, chainId };
        }
        
        throw new Error("User rejected the request");
      } catch (e: any) {
        console.error("[wcClient] Extension connection error:", e);
        if (e?.code === 4001) {
          const err = new Error("User rejected the connection");
          (err as any).code = 4001;
          throw err;
        }
        throw e;
      }
    }

    // WALLETCONNECT MODE: Session-based flow (mobile)
    const existingAddr = getAddressFromSession(provider);
    if (existingAddr) {
      const chainHex = await provider.request({ method: "eth_chainId" }).catch(() => HEDERA_CHAIN_ID_HEX);
      const chainId = typeof chainHex === "string" ? parseInt(chainHex, 16) : Number(chainHex);
      emit("wc:connect", { accounts: [existingAddr], chainId });
      return { accounts: [existingAddr], chainId };
    }

    if (connectPromise) return connectPromise;

    connectPromise = (async () => {
      console.log("[wcClient] Starting WalletConnect pairing...");
      
      await provider.connect({
        namespaces: {
          eip155: {
            chains: [`eip155:${HEDERA_CHAIN_ID_DEC}`],
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
            rpcMap: { [HEDERA_CHAIN_ID_DEC]: RPC_URL },
          },
        },
      });

      const addr = await waitForAccount(provider);
      const chainHex = await provider.request({ method: "eth_chainId" }).catch(() => HEDERA_CHAIN_ID_HEX);
      const chainId = typeof chainHex === "string" ? parseInt(chainHex, 16) : Number(chainHex);

      state.displayUri = null;
      emit("wc:connect", { accounts: [addr], chainId });
      return { accounts: [addr], chainId };
    })().finally(() => {
      connectPromise = null;
    });

    return connectPromise;
  },

  async ensureHederaChain() {
    const provider = await createProvider();
    
    try {
      const current = await provider.request({ method: "eth_chainId" }).catch(() => null);
      const currentDec = typeof current === "string" ? parseInt(current, 16) : Number(current);
      
      if (currentDec === HEDERA_CHAIN_ID_DEC) return;

      console.log("[wcClient] Switching to Hedera chain...");

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HEDERA_CHAIN_ID_HEX }],
      }).catch(async (switchError: any) => {
        if (switchError?.code === 4902) {
          console.log("[wcClient] Adding Hedera chain...");
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: HEDERA_CHAIN_ID_HEX,
              chainName: "Hedera EVM Mainnet",
              nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: ["https://hashscan.io/mainnet"],
            }],
          });
          
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: HEDERA_CHAIN_ID_HEX }],
          });
        } else {
          throw switchError;
        }
      });
    } catch (e) {
      console.warn("[wcClient] Chain switch failed:", e);
    }
  },

  async disconnect() {
    if (!state.provider) return;
    
    try {
      if (state.isExtension) {
        console.log("[wcClient] Extension disconnect - clearing state");
      } else {
        const topic = state.provider?.session?.topic;
        if (topic) {
          await state.provider.disconnect({ 
            topic, 
            reason: { code: 6000, message: "User disconnected" } 
          });
        }
      }
    } catch (e) {
      console.warn("[wcClient] Disconnect error:", e);
    }
    
    state.displayUri = null;
    emit("wc:disconnect");
  },
};

function waitForAccount(provider: any, timeoutMs = 120_000): Promise<string> {
  const existing = getAddressFromSession(provider);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const start = Date.now();

    const onUpdate = () => {
      const addr = getAddressFromSession(provider);
      if (addr) {
        cleanup();
        resolve(addr);
      } else if (Date.now() - start > timeoutMs) {
        cleanup();
        reject(new Error("Timeout waiting for account"));
      }
    };

    const onDelete = () => {
      cleanup();
      reject(new Error("Session closed before account provided"));
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
