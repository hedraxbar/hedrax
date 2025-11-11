// src/hedera/authApi.ts
import { ethers } from "ethers";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function fetchChallenge(account: string): Promise<{ message: string }> {
  const url = `${API_BASE}/api/auth/challenge?account=${encodeURIComponent(account)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Challenge failed (${res.status})`);
  return res.json();
}

export async function verifySignature(payload: {
  account: string;
  message: string;
  signature: string;
}): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let err = "Verify failed";
    try { const j = await res.json(); err = j?.error ?? err; } catch {}
    throw new Error(err);
  }
  return res.json();
}

/** Generic EVM message signer with ethers Signer (HashPack via WalletConnect works) */
export async function signChallengeMessage(signer: ethers.Signer, message: string): Promise<string> {
  // HashPack supports personal_sign; ethers Signer.signMessage wraps correctly
  return await signer.signMessage(message);
}
