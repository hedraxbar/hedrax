// Lightweight sign-in via message signature (works with EVM providers and HashConnect if it exposes a signer)

import { getHashconnect } from "../hedera/hashconnectClient";

const LS_KEY = "hedrax.authSignature.v1";

export type AuthRecord = {
  evm?: string | null;
  hedera?: string | null;
  signature: string;
  nonce: string;
  issuedAt: string;  // ISO timestamp
  domain: string;
  statement: string;
};

export function loadAuth(): AuthRecord | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthRecord;
  } catch {
    return null;
  }
}

export function clearAuth() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

export function randomNonce(len = 16) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export function buildAuthMessage(params: {
  addressOrAccount: string;
  domain?: string;
  nonce?: string;
  statement?: string;
}) {
  const domain = params.domain ?? (typeof window !== "undefined" ? window.location.host : "hedrax.io");
  const nonce = params.nonce ?? randomNonce();
  const issuedAt = new Date().toISOString();
  const statement = params.statement ?? "Sign this message to authenticate with HedraX.";
  // Simple, deterministic message
  const msg =
`${domain} wants you to sign in with your wallet.

${statement}

Nonce: ${nonce}
Issued At: ${issuedAt}`;
  return { message: msg, domain, nonce, issuedAt, statement };
}

const toHex = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
};

async function personalSign(address: string, message: string): Promise<string> {
  // Try injected EIP-1193 first
  const w = window as any;
  const eth = w?.ethereum || w?.hashpack?.ethereum || w?.hedera?.ethereum;
  if (eth?.request) {
    const hexMsg = toHex(message);
    // personal_sign expects [data, address]
    return await eth.request({ method: "personal_sign", params: [hexMsg, address] });
  }
  // If you use WalletConnect provider directly, it also implements .request
  const wc = w?.__HEDRAX_WC_PROVIDER__;
  if (wc?.request) {
    const hexMsg = toHex(message);
    return await wc.request({ method: "personal_sign", params: [hexMsg, address] });
  }
  throw new Error("No EVM provider available for personal_sign");
}

async function hashconnectSign(accountId: string, message: string): Promise<string> {
  // HashConnect has different method names across versions; try a few
  const hc: any = getHashconnect();
  if (!hc) throw new Error("HashConnect is not initialized");
  // Common variant 1:
  if (typeof hc.signMessage === "function") {
    // Some builds want { message: Uint8Array | string, accountId }
    return await hc.signMessage({ message, accountId });
  }
  // Common variant 2:
  if (hc?.signProvider?.sign) {
    const bytes = new TextEncoder().encode(message);
    const sig = await hc.signProvider.sign(bytes, accountId);
    // normalize return to hex/base64 if possible
    return typeof sig === "string" ? sig : (sig?.signature || JSON.stringify(sig));
  }
  // Variant 3: generic sign(...)
  if (typeof hc.sign === "function") {
    const bytes = new TextEncoder().encode(message);
    const sig = await hc.sign(bytes, accountId);
    return typeof sig === "string" ? sig : (sig?.signature || JSON.stringify(sig));
  }
  throw new Error("HashConnect does not expose a message-sign method in this build");
}

export async function signInAfterConnect(opts: {
  evm?: string | null;
  hedera?: string | null;
  force?: boolean; // if true, ignore any stored signature and re-sign
}): Promise<AuthRecord> {
  const existing = loadAuth();
  if (!opts.force && existing && ((opts.evm && existing.evm === opts.evm) || (opts.hedera && existing.hedera === opts.hedera))) {
    return existing; // reuse
  }

  const who = (opts.evm || opts.hedera);
  if (!who) throw new Error("No connected account to sign with");

  const { message, domain, nonce, issuedAt, statement } = buildAuthMessage({ addressOrAccount: who! });

  // Prefer EVM personal_sign if address is available
  let signature: string;
  if (opts.evm) {
    signature = await personalSign(opts.evm, message);
  } else if (opts.hedera) {
    signature = await hashconnectSign(opts.hedera, message);
  } else {
    throw new Error("No provider available for signing");
  }

  const record: AuthRecord = {
    evm: opts.evm ?? null,
    hedera: opts.hedera ?? null,
    signature,
    nonce,
    issuedAt,
    domain,
    statement,
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify(record)); } catch {}
  return record;
}
