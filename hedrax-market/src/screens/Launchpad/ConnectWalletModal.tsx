// src/components/ConnectWalletModal.tsx
import * as React from "react";
import { Loader2 } from "lucide-react";
import QRCode from "qrcode";
import {
  initHashConnect,
  openPairingModal,
  onHashconnectChange,
  getPairedAccountId,
  disconnectHashconnect,
} from "../../hedera/hashconnectClient";
import {
  ensureWcConnected,
  getWcEvmProvider,
  getWcAddress,
  onWcDisplayUri,
} from "../../hedera/wcEvmProvider";
import { signInAfterConnect } from "../../lib/auth";

type Props = {
  open: boolean;
  onClose: () => void;
  onConnected?: (evmOrHedera: { evm?: string; hedera?: string }) => void;
};

export const ConnectWalletModal: React.FC<Props> = ({ open, onClose, onConnected }) => {
  const [tab, setTab] = React.useState<"hashpack" | "walletconnect">("hashpack");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string>("");

  const [wcUri, setWcUri] = React.useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");

  React.useEffect(() => onWcDisplayUri((uri) => setWcUri(uri)), []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (wcUri) {
        try {
          const url = await QRCode.toDataURL(wcUri, { margin: 1, scale: 6 });
          if (mounted) setQrDataUrl(url);
        } catch {
          setQrDataUrl("");
        }
      } else setQrDataUrl("");
    })();
    return () => {
      mounted = false;
    };
  }, [wcUri]);

  React.useEffect(
    () =>
      onHashconnectChange(async (s) => {
        if (s.connected) {
          try {
            // After Hedera connect (0.0.x), ask for a message signature
            await signInAfterConnect({ hedera: s.accountId || undefined });
          } catch (e: any) {
            // Not fatal; user can still proceed
            console.warn("[Auth] Hedera sign-in failed:", e?.message || e);
          }
          onConnected?.({ hedera: s.accountId || undefined });
          onClose();
        }
      }),
    [onClose, onConnected]
  );

  if (!open) return null;

  async function doHashPack() {
    setErr("");
    setBusy(true);
    try {
      await initHashConnect();   // sets up HashConnect (auto-detects extension)
      openPairingModal("dark");  // opens modal (extension will pop if installed)
      // onHashconnectChange will take it from here
    } catch (e: any) {
      setErr(e?.message || "HashPack connection failed");
    } finally {
      setBusy(false);
    }
  }

  async function doWalletConnect() {
    setErr("");
    setBusy(true);
    try {
      const provider = await ensureWcConnected(); // display_uri → QR shows via onWcDisplayUri
      const addr = getWcAddress(provider) || getWcAddress(await getWcEvmProvider());
      if (addr) {
        try {
          // After EVM connect, ask for personal_sign
          await signInAfterConnect({ evm: addr });
        } catch (e: any) {
          console.warn("[Auth] EVM sign-in failed:", e?.message || e);
        }
        onConnected?.({ evm: addr });
        onClose();
      }
    } catch (e: any) {
      setErr(e?.message || "WalletConnect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-[#111]/95 text-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Connect Wallet</h3>
          <button className="rounded-md px-2 py-1 hover:bg-white/10" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setTab("hashpack")}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === "hashpack" ? "bg-white/15" : "bg-white/5 hover:bg-white/10"}`}
          >
            HashPack (HashConnect)
          </button>
          <button
            onClick={() => setTab("walletconnect")}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === "walletconnect" ? "bg-white/15" : "bg-white/5 hover:bg-white/10"}`}
          >
            WalletConnect
          </button>
        </div>

        {tab === "hashpack" ? (
          <div className="mt-5">
            <p className="text-sm text-white/70">Connect HashPack. On desktop with the extension installed, it opens directly (no QR).</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={doHashPack}
                disabled={busy}
                className="rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3] px-4 py-2 text-sm"
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening…
                  </span>
                ) : (
                  "Connect HashPack"
                )}
              </button>
              {getPairedAccountId() ? (
                <button
                  onClick={async () => {
                    await disconnectHashconnect();
                  }}
                  className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-sm"
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-sm text-white/70">Scan with HashPack (mobile) or other Hedera wallets that support WalletConnect.</p>
            <div className="mt-4 grid place-items-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="WalletConnect QR" className="rounded-lg border border-white/10" />
              ) : (
                <div className="h-[260px] w-[260px] grid place-items-center text-white/60">
                  {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : "Click Connect to generate QR"}
                </div>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={doWalletConnect}
                disabled={busy}
                className="rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3] px-4 py-2 text-sm"
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening…
                  </span>
                ) : (
                  "Connect via WalletConnect"
                )}
              </button>
            </div>
          </div>
        )}

        {err ? <div className="mt-4 text-xs text-rose-300">{err}</div> : null}
      </div>
    </div>
  );
};
