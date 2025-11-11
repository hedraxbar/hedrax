// src/hedera/selectHashpackProvider.ts
/**
 * Return the HashPack EVM injected provider if available.
 * Never returns MetaMask/Rabby/etc.
 */
export function selectHashpackProvider(): any | null {
    const w = window as any;
  
    // Most common HashPack injection points
    if (w.hedera?.ethereum) return w.hedera.ethereum;
    if (w.hashpack?.ethereum) return w.hashpack.ethereum;
  
    // Single injected provider but flagged as HashPack
    if (w.ethereum && (w.ethereum.isHashPack || w.ethereum.__IS_HASHPACK)) return w.ethereum;
  
    // Multiple injected providers (MetaMask, Rabby, HashPack…)
    const list = w.ethereum?.providers;
    if (Array.isArray(list)) {
      const byFlag = list.find((p: any) => p?.isHashPack || p?.__IS_HASHPACK);
      if (byFlag) return byFlag;
  
      const byName =
        list.find((p: any) => p?.info?.name?.toLowerCase?.() === "hashpack") ||
        list.find((p: any) => p?._walletInfo?.name?.toLowerCase?.() === "hashpack") ||
        list.find((p: any) => p?.walletMeta?.name?.toLowerCase?.() === "hashpack");
      if (byName) return byName;
    }
  
    // Some builds expose a name on the single provider
    const name = String(
      (w.ethereum?.walletMeta?.name || w.ethereum?.info?.name || "")
    ).toLowerCase();
    if (name.includes("hashpack")) return w.ethereum;
  
    return null;
  }
  