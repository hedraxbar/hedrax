// src/screens/LandingPage/sections/NavigationSection/NavigationSection.tsx
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Search as SearchIcon,
  ChevronDown,
  X,
  Wallet as WalletIcon,
  ExternalLink,
  ChevronRight,
  Info,
  Loader2,
  Copy as CopyIcon,
  LogOut,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { useWallet } from "../../../../hedera/useWallet";
import { wcClient } from "../../../../hedera/wcClient";
import { selectHashpackProvider } from "../../../../hedera/selectHashpackProvider";

export const HeaderSpacer: React.FC = () => <div className="h-16 md:h-20" />;

const navItems = [
  { label: "Marketplace", to: "/marketplace" },
  { label: "Launchpad", to: "/launchpad" },
  { label: "Create", to: "/create" },
  { label: "Swap", to: "/swap" },
] as const;

function shortId(id?: string | null, head = 10, tail = 6) {
  if (!id) return "";
  return id.length > head + tail ? `${id.slice(0, head)}…${id.slice(-tail)}` : id;
}

export const NavigationSection: React.FC = () => {
  const {
    status,
    account,      // EVM 0x…
    hederaId,     // Hedera 0.0.x (no checksum)
    connect,      // useWallet.connect() -> WC/extension
    disconnect,
    login,
    token,
    displayUri,   // WalletConnect pairing URI
  } = useWallet();

  const isAuthed = !!token;

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [connectModal, setConnectModal] = React.useState(false);

  // Dedicated pairing modal (separate from connect list)
  const [pairingOpen, setPairingOpen] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Auth modal
  const [authOpen, setAuthOpen] = React.useState(false);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const [isActing, setIsActing] = React.useState(false);

  const rowRef = React.useRef<HTMLDivElement | null>(null);
  const hasAutoOpenedRef = React.useRef(false); // NEW: ensure deep link opens once
  const location = useLocation();

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rowRef.current) return;
      if (!rowRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  React.useEffect(() => setMenuOpen(false), [location.pathname]);

  const resetPairingUI = React.useCallback(() => {
    try { (wcClient as any).clearDisplayUri?.(); } catch {}
    setPairingOpen(false);
    setConnectModal(false);
    setQrDataUrl(null);
    setCopied(false);
    setAuthBusy(false);
    setIsActing(false);
    hasAutoOpenedRef.current = false; // NEW: reset auto-open flag
  }, []);

  /** Try to trigger HashPack extension popup (EIP-1193) right away. Return true if it popped/connected. */
  const tryExtensionPopup = React.useCallback(async (): Promise<boolean> => {
    try {
      const injected = selectHashpackProvider();
      if (!injected?.request) return false;

      // Ask for accounts (this triggers the HashPack browser extension prompt)
      await injected.request({ method: "eth_requestAccounts" });

      // Ensure wcClient is init'd (prefers extension mode)
      try { await wcClient.init(); } catch {}

      return true;
    } catch {
      // 4001 (user rejected) or others → fall back
      return false;
    }
  }, []);

  async function handleWalletButtonClick() {
    if (account || hederaId) {
      setMenuOpen((v) => !v);
      return;
    }

    // 1) Try to pop the HashPack extension immediately
    const popped = await tryExtensionPopup();
    if (popped) return;

    // 2) Otherwise open the connector list (WC QR etc.)
    setConnectModal(true);
  }

  // When displayUri appears → open pairing modal, build QR, and auto-open deep link once
  React.useEffect(() => {
    let cancelled = false;
    async function handleUri() {
      if (!displayUri) {
        setQrDataUrl(null);
        setPairingOpen(false);
        hasAutoOpenedRef.current = false; // reset for next time
        return;
      }
      setConnectModal(false);
      setPairingOpen(true);
      try {
        const QR = await import("qrcode");
        const dataUrl = await QR.toDataURL(displayUri, { margin: 1, width: 256 });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }

      // NEW: auto-open deep link once so wallet shows approval prompt
      if (!hasAutoOpenedRef.current) {
        hasAutoOpenedRef.current = true;
        setTimeout(() => openDeepLink(displayUri), 50);
      }
    }
    handleUri();
    return () => { cancelled = true; };
  }, [displayUri]);

  async function chooseWallet(
    kind: "hashpack-wc" | "hashpack-hc" | "walletconnect" | "kabila" | "blade"
  ) {
    if (isActing) return;
    setIsActing(true);
    try {
      const pref =
        kind === "hashpack-wc" || kind === "walletconnect"
          ? { provider: "wc", wallet: "hashpack" }
          : kind === "hashpack-hc"
          ? { provider: "hashconnect" }
          : kind === "kabila"
          ? { provider: "wc", wallet: "kabila" }
          : { provider: "wc", wallet: "blade" };

      localStorage.setItem("hedrax_wallet_pref", JSON.stringify(pref));

      // If user clicked HashPack (WC), try extension again before falling back to WC QR
      if (kind === "hashpack-wc") {
        const popped = await tryExtensionPopup();
        if (popped) return;
      }

      // Triggers WC; displayUri effect will open deep link
      await connect();

      // Optional: if URI is already present very quickly, open now too
      if (displayUri && !hasAutoOpenedRef.current) {
        hasAutoOpenedRef.current = true;
        openDeepLink(displayUri);
      }
    } finally {
      setIsActing(false);
    }
  }

  // After connect → if not authed → show auth modal and run login()
  React.useEffect(() => {
    if (!(account || hederaId)) return;
    if (isAuthed) {
      setAuthOpen(false);
      setAuthBusy(false);
      setAuthError(null);
      return;
    }
    setAuthOpen(true);
    setAuthBusy(true);
    setAuthError(null);

    (async () => {
      try {
        await login();
        setAuthBusy(false);
        setAuthOpen(false);
      } catch (e: any) {
        setAuthBusy(false);
        setAuthError(e?.message || "Authentication failed. Please try again.");
      }
    })();
  }, [account, hederaId, isAuthed, login]);

  const isBusy = status === "connecting" || isActing;
  const busyTitle = isBusy ? "Connecting…" : undefined;

  const copy = async (text: string | null | undefined) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {/* noop */}
  };

  const openDeepLink = (uri: string | null) => {
    if (!uri) return;
    window.open(uri, "_blank", "noopener,noreferrer");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-5 md:px-8 lg:px-20 h-16 md:h-20 bg-[#0d0d0d30] backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)_brightness(100%)]">
      <NavLink to="/" className="shrink-0" aria-label="Go home">
        <img
          className="w-[90px] h-[22px] object-cover"
          alt="Hedrax logo"
          src="https://c.animaapp.com/mh588waf3IvYis/img/hedraxlogo-2-1.png"
        />
      </NavLink>

      <nav className="hidden md:flex items-center gap-5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-base tracking-[-0.32px] leading-[normal] cursor-pointer transition-colors ${
                isActive ? "text-[#d5d7e3]" : "text-[#d5d7e38c] hover:text-[#d5d7e3]"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="relative hidden lg:block w-[420px] xl:w-[526px]">
          <Input
            type="text"
            placeholder="Search collections, tokens and creators"
            className="w-full h-[44px] xl:h-[50px] px-4 py-[11px] xl:py-[13px] rounded-[18px] border border-[#d4d8e36e] bg-transparent text-white placeholder:text-white/50 pr-12"
          />
          <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 xl:w-6 xl:h-6 text-white/50" />
        </div>

        {/* Wallet button */}
        <div className="relative" ref={rowRef}>
          <Button
            onClick={handleWalletButtonClick}
            className={`h-[40px] md:h-[43px] rounded-[18px] [font-family:'Gilroy-Medium-Medium',Helvetica] font-medium ${
              account || hederaId
                ? "bg-white/10 hover:bg-white/15 text-[#d5d7e3] px-2 md:px-3"
                : "bg-[#d5d7e3] hover:bg-[#e5e7f3] text-[#0d0d0d] w-[128px] md:w-[140px]"
            } flex items-center gap-2`}
            title={busyTitle}
            disabled={isBusy}
          >
            {account || hederaId ? (
              <>
                <img
                  src="https://avatars.githubusercontent.com/u/9919?v=4"
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                />
                <div className="text-left leading-tight">
                  <div className="text-xs opacity-70">Hedera</div>
                  <div className="text-sm font-semibold">
                    {hederaId ? shortId(hederaId) : shortId(account)}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 opacity-70 ml-1" />
              </>
            ) : (
              <>
                <WalletIcon className="w-4 h-4" />
                Log in
              </>
            )}
          </Button>

          {/* Dropdown */}
          {(account || hederaId) && menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-[360px] rounded-xl border border-white/10 bg-[#12161c]/95 backdrop-blur p-0 text-sm text-white shadow-2xl z-[120]"
            >
              <div className="px-4 py-3 border-b border-white/10">
                <div className="text-xs opacity-70">Active Account (Hedera)</div>
                <div className="mt-1 font-mono break-all">{hederaId || "—"}</div>

                {account ? (
                  <div className="mt-3 rounded-md bg-white/5 p-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase opacity-60">EVM ADDRESS</div>
                      <div className="font-mono text-xs sm:text-sm break-all">{account}</div>
                    </div>
                    <button
                      className={`p-2 rounded-md ${copied ? "bg-emerald-600/20 text-emerald-300" : "hover:bg-white/10"}`}
                      onClick={() => copy(account)}
                      title={copied ? "Copied!" : "Copy EVM address"}
                    >
                      <CopyIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <img
                    src="https://blob.sentx.io/media/web/hashpack-icon.png?width=50"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="text-base leading-5">{hederaId || "Hedera: —"}</div>
                    <div className="text-xs opacity-70">{account ? `EVM: ${shortId(account)}` : "EVM: —"}</div>
                  </div>
                </div>
              </div>

              <div className="py-2 border-t border-white/10">
                <MenuItem label="My NFTs" />
                <MenuItem label="Creator Panel" />
                <MenuItem label="Settings" />
              </div>

              <div className="py-2 border-t border-white/10">
                <MenuItem label="Allowances" iconRight />
              </div>

              <div className="py-2 border-t border-white/10">
                <MenuItem label="Rewards Center" />
                <MenuItem label="Rev Share" />
                <MenuItem label="Your Magic Effects" />
                <MenuItem label="Link Thrive Wallet" />
              </div>

              <div className="py-2 border-t border-white/10">
                <MenuItem label="Get Support" />
              </div>

              <div className="py-2 border-t border-white/10">
                <div className="px-3 pb-1 text-xs uppercase tracking-wide opacity-60">Wallet Connection</div>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center justify-between"
                  onClick={async () => {
                    await disconnect();
                    setMenuOpen(false);
                  }}
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Disconnect wallet
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connect list modal */}
      {connectModal && !(account || hederaId) && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-[720px] rounded-2xl border border-white/10 bg-[#0f141a] text-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
              <button
                className="rounded-md px-2 py-1 hover:bg-white/10"
                onClick={resetPairingUI}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-white/10">
              <WalletRow title="HashPack" subtitle="Wallet Connect" onConnect={() => chooseWallet("hashpack-wc")} loading={isBusy} iconUrl="https://blob.sentx.io/media/web/hashpack-icon.png?width=50" />
              <WalletRow title="HashPack" subtitle="HashConnect" onConnect={() => chooseWallet("hashpack-hc")} loading={isBusy} iconUrl="https://blob.sentx.io/media/web/hashpack-icon.png?width=50" />
              <WalletRow title="Wallet Connect" onConnect={() => chooseWallet("walletconnect")} loading={isBusy} iconUrl="https://blob.sentx.io/media/web/walletconnect-icon-filled-256.png?height=50" />
              <WalletRow title="Kabila Wallet" onConnect={() => chooseWallet("kabila")} loading={isBusy} iconUrl="https://blob.sentx.io/media/partners/Kabila_Wallet_Logo.png" />
              <WalletRow title="Blade Wallet" onConnect={() => chooseWallet("blade")} loading={isBusy} iconUrl="https://bladewallet.io/favicon-32x32.png" />
            </div>

            <details className="px-6 py-3 border-t border-white/10">
              <summary className="list-none cursor-pointer select-none flex items-center justify-between">
                <span className="text-sm text-white/80">Trouble Connecting?…</span>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </summary>
              <p className="mt-2 text-xs text-white/60">
                If the HashPack extension is installed, it may pop automatically. Otherwise, a pairing modal with QR & link will appear.
              </p>
            </details>
          </div>
        </div>
      )}

      {/* Pairing modal (QR + link) */}
      {pairingOpen && !(account || hederaId) && displayUri && (
        <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-[720px] rounded-2xl border border-white/10 bg-[#0f141a] text-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold">Pair with Wallet</h3>
              <button
                className="rounded-md px-2 py-1 hover:bg-white/10"
                onClick={resetPairingUI}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-[260px,1fr] gap-4">
              <div className="rounded-xl bg-white/5 p-3 flex items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="WalletConnect QR" className="w-[220px] h-[220px] object-contain" />
                ) : (
                  <div className="text-xs opacity-70">Generating QR…</div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Pairing link</div>
                <div className="text-xs opacity-80 break-all bg-white/5 rounded-md p-3">
                  {displayUri}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    className={`h-9 rounded-md px-3 text-sm inline-flex items-center gap-2 ${copied ? "bg-emerald-600/20 text-emerald-300" : "bg-white/10 hover:bg-white/15"}`}
                    onClick={() => copy(displayUri)}
                  >
                    <CopyIcon className="w-4 h-4" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    className="h-9 rounded-md px-3 bg-white/10 hover:bg-white/15 text-sm inline-flex items-center gap-2"
                    onClick={() => openDeepLink(displayUri)}
                  >
                    Open link <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-3 text-xs opacity-60">
                  On desktop, the HashPack extension may intercept the link. On mobile, this should open your wallet directly. You can also scan the QR.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth modal */}
      {authOpen && (account || hederaId) && !isAuthed && (
        <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-[#0f141a] text-white p-0 shadow-2xl">
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
              <Info className="w-5 h-5 text-cyan-300" />
              <h3 className="text-base font-semibold">Please sign the message on your wallet to authenticate…</h3>
              <button
                className="ml-auto rounded-md px-2 py-1 hover:bg-white/10"
                onClick={() => !authBusy && setAuthOpen(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-6">
              <div className="flex items-center gap-3">
                {authBusy ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white/90" />
                ) : authError ? (
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 grid place-items-center">
                    <span className="text-rose-300 text-xs">!</span>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 grid place-items-center">
                    <span className="text-emerald-300 text-xs">✓</span>
                  </div>
                )}
                <div className="text-sm text-white/80">
                  {authBusy
                    ? "A signature prompt should appear in HashPack."
                    : authError
                    ? authError
                    : "Authenticated successfully."}
                </div>
              </div>

              {authError && (
                <div className="mt-4">
                  <Button
                    onClick={async () => {
                      setAuthBusy(true);
                      setAuthError(null);
                      try {
                        await login();
                        setAuthBusy(false);
                        setAuthOpen(false);
                      } catch (e: any) {
                        setAuthBusy(false);
                        setAuthError(e?.message || "Authentication failed. Please try again.");
                      }
                    }}
                    className="h-10 rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3]"
                  >
                    Authenticate
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

/* ---------------------------- Small components ---------------------------- */

function WalletRow({
  title,
  subtitle,
  onConnect,
  loading,
  iconUrl,
}: {
  title: string;
  subtitle?: string;
  onConnect: () => void;
  loading?: boolean;
  iconUrl?: string;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        {iconUrl ? (
          <img src={iconUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-white/10 grid place-items-center">
            <WalletIcon className="w-5 h-5" />
          </div>
        )}
        <div>
          <div className="text-[15px] font-medium">{title}</div>
          {subtitle && <div className="text-xs opacity-70">{subtitle}</div>}
        </div>
      </div>
      <button
        onClick={onConnect}
        disabled={loading}
        className={`min-w-[96px] h-9 rounded-lg px-4 text-sm ${
          loading ? "opacity-50 cursor-not-allowed" : "bg-white/10 hover:bg-white/15"
        }`}
      >
        {loading ? "Please wait…" : "Connect"}
      </button>
    </div>
  );
}

function MenuItem({ label, iconRight }: { label: string; iconRight?: boolean }) {
  return (
    <button className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center justify-between">
      <span>{label}</span>
      {iconRight ? <ExternalLink className="w-4 h-4 opacity-60" /> : null}
    </button>
  );
}
