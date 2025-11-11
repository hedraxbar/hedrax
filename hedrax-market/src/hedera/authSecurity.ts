// src/hedera/authSecurity.ts
/**
 * SentX-style per-wallet auth security:
 * - Stores ACTIVE wallet address.
 * - Stores a JWT per wallet with a 7-day TTL.
 * - Simple obfuscation (base64) for storage; replace with real crypto if you want.
 */

const ACTIVE_WALLET_KEY = "sent_auth_active_wallet";
const TOKEN_PREFIX = "sent_auth_token_";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type StoredToken = {
  token: string;
  expiresAt: number; // epoch ms
};

const b64 = {
  enc: (s: string) => (typeof btoa !== "undefined" ? btoa(s) : Buffer.from(s, "utf8").toString("base64")),
  dec: (s: string) => (typeof atob !== "undefined" ? atob(s) : Buffer.from(s, "base64").toString("utf8")),
};

function tokenKeyFor(account: string) {
  const addr = account.toLowerCase();
  return `${TOKEN_PREFIX}${addr}`;
}

export const AuthSecurity = {
  /** Active wallet helpers */
  getActiveWallet(): string | null {
    try {
      const raw = localStorage.getItem(ACTIVE_WALLET_KEY) || sessionStorage.getItem(ACTIVE_WALLET_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setActiveWallet(account: string | null) {
    const v = account ? JSON.stringify(account) : "";
    try {
      if (account) {
        localStorage.setItem(ACTIVE_WALLET_KEY, v);
        sessionStorage.setItem(ACTIVE_WALLET_KEY, v);
      } else {
        localStorage.removeItem(ACTIVE_WALLET_KEY);
        sessionStorage.removeItem(ACTIVE_WALLET_KEY);
      }
    } catch {/* ignore */}
  },

  /** Token per wallet */
  getToken(account: string): string | null {
    try {
      const key = tokenKeyFor(account);
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed: StoredToken = JSON.parse(b64.dec(raw));
      if (Date.now() >= parsed.expiresAt) {
        this.clearToken(account);
        return null;
      }
      return parsed.token;
    } catch {
      return null;
    }
  },

  saveToken(account: string, token: string, ttlMs: number = TTL_MS) {
    const key = tokenKeyFor(account);
    const data: StoredToken = { token, expiresAt: Date.now() + ttlMs };
    const val = b64.enc(JSON.stringify(data));
    try {
      localStorage.setItem(key, val);
      sessionStorage.setItem(key, val);
    } catch {/* ignore */}
  },

  clearToken(account: string) {
    const key = tokenKeyFor(account);
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {/* ignore */}
  },

  clearAll() {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(TOKEN_PREFIX) || k === ACTIVE_WALLET_KEY)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem(ACTIVE_WALLET_KEY);
    } catch {/* ignore */}
  },
};
