// src/hedera/hashconnectClient.ts
// Version-agnostic HashConnect bootstrap WITHOUT importing any hashconnect types.

import * as HashConnectPkg from "hashconnect";
import { LedgerId } from "@hashgraph/sdk";

const PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID as string;
if (!PROJECT_ID) throw new Error("Missing VITE_WC_PROJECT_ID in your .env");

const APP_METADATA = {
  name: "HedraX",
  description: "HedraX — Hedera dApp",
  icons: ["https://c.animaapp.com/mh25bcdiL6JXsX/img/hedraxlogo-2-1.png"],
  url: typeof window !== "undefined" ? window.location.origin : "https://hedrax.io",
};

// Pick whichever export exists (ESM named, CJS default, or namespace)
const HashConnectCtor: any =
  (HashConnectPkg as any).HashConnect ||
  (HashConnectPkg as any).default ||
  (HashConnectPkg as any);

let hc: any | null = null;
let pairing: any | null = null;
let connState: any = "Disconnected";

type Listener = (s: { connected: boolean; accountId: string | null; state: any }) => void;
const listeners = new Set<Listener>();
function emit() {
  const accountId = pairing?.accountIds?.[0] ?? null;
  const payload = { connected: !!accountId, accountId, state: connState };
  for (const fn of listeners) { try { fn(payload); } catch {} }
}

function wireEvents(h: any) {
  h?.pairingEvent?.on?.((p: any) => { pairing = p; emit(); });
  h?.disconnectionEvent?.on?.(() => { pairing = null; emit(); });
  h?.connectionStatusChangeEvent?.on?.((s: any) => { connState = s; emit(); });
}

// Try a few constructor/init shapes to be robust across versions
async function initAny(network: "mainnet" | "testnet") {
  const LEDGER = (LedgerId as any)?.MAINNET ?? (LedgerId as any)?.Mainnet ?? "mainnet";

  // Shape A (v3): new HashConnect(ledgerId, projectId, metadata, debug); await init()
  try {
    const hA: any = new HashConnectCtor(LEDGER, PROJECT_ID, APP_METADATA, false);
    wireEvents(hA);
    await hA.init?.();
    return hA;
  } catch {}

  // Shape B (v2-ish): new HashConnect(); await init(metadata, network, debug?)
  try {
    const hB: any = new HashConnectCtor();
    wireEvents(hB);
    if (typeof hB.init === "function") {
      await hB.init(APP_METADATA, network, false);
      return hB;
    }
  } catch {}

  // Shape C: new HashConnect(metadata, network, debug?); await init()
  try {
    const hC: any = new HashConnectCtor(APP_METADATA, network, false);
    wireEvents(hC);
    await hC.init?.();
    return hC;
  } catch {}

  // Shape D: new HashConnect(metadata); await init(network)
  try {
    const hD: any = new HashConnectCtor(APP_METADATA);
    wireEvents(hD);
    await (hD.init?.(network) ?? Promise.reject());
    return hD;
  } catch {}

  throw new Error("HashConnect initialization failed: incompatible package API.");
}

export async function initHashConnect(): Promise<any> {
  if (hc) return hc;
  hc = await initAny("mainnet");
  return hc;
}

export function onHashconnectChange(cb: Listener): () => void {
  listeners.add(cb);
  cb({ connected: !!(pairing?.accountIds?.[0]), accountId: pairing?.accountIds?.[0] ?? null, state: connState });
  return () => listeners.delete(cb);
}

export function getPairedAccountId(): string | null {
  return pairing?.accountIds?.[0] ?? null;
}

/**
 * Open HashConnect's built-in pairing modal.
 * IMPORTANT: do NOT call h.connect()/connectToLocalWallet() here — that double-pairs and breaks the session.
 */
export async function openPairingModal(theme: "dark" | "light" = "dark") {
  const h = await initHashConnect();
  h.openPairingModal?.(theme);     // let HC manage pairing; extension will prompt itself
}

/** Optional: hard reset if you ever get "No matching key / Failed to decode message" */
export async function resetHashconnect() {
  try {
    const h = await initHashConnect();
    await h.disconnect?.();
    await h.clearConnectionsAndData?.();
  } catch {}
  try {
    const ls = window.localStorage;
    Object.keys(ls).forEach((k) => {
      if (
        k.startsWith("walletconnect") || k.startsWith("wc@") || k.startsWith("wc:") ||
        k.startsWith("hashconnect")  || k.includes("hashconnect") || k.includes("walletconnect")
      ) ls.removeItem(k);
    });
  } catch {}
  window.location.reload();
}

export async function disconnectHashconnect() {
  const h = await initHashConnect();
  try { await h.disconnect?.(); } catch {}
  try { await h.clearConnectionsAndData?.(); } catch {}
  pairing = null;
  emit();
}

export function getHashconnect(): any | null { return hc; }
