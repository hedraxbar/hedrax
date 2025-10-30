// src/screens/sections/NavigationBarSection.tsx
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { SearchIcon, ChevronDown, X } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { useHederaWallet } from "../../../../hedera/useHederaWallet";

/** Pages can reserve space for the fixed header */
export const HeaderSpacer: React.FC = () => <div className="h-16 md:h-20" />;

const navItems = [
  { label: "Marketplace", to: "/marketplace" },
  { label: "Launchpad",   to: "/launchpad"   },
  { label: "Create",      to: "/create"      },
  { label: "Swap",        to: "/swap"        },
] as const;

function shortId(id?: string | null) {
  if (!id) return "";
  return id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id;
}

export const NavigationSection: React.FC = () => {
  const { status, accountId, connect, disconnect } = (useHederaWallet() as any) || {};
  const [menuOpen, setMenuOpen] = React.useState(false);
  const rowRef = React.useRef<HTMLDivElement | null>(null);
  const connectingRef = React.useRef(false);
  const location = useLocation();

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rowRef.current) return;
      if (!rowRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Close dropdown on route change
  React.useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function handleWalletButtonClick() {
    if (accountId) {
      setMenuOpen((v) => !v);
      return;
    }
    if (connectingRef.current || status === "initializing" || status === "connecting") return;
    connectingRef.current = true;
    try {
      await connect?.();
    } finally {
      // small debounce to prevent rapid double clicks
      setTimeout(() => {
        connectingRef.current = false;
      }, 300);
    }
  }

  const isBusy = status === "initializing" || status === "connecting";
  const busyTitle =
    status === "initializing"
      ? "Initializing wallet…"
      : status === "connecting"
      ? "Check HashPack…"
      : undefined;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-5 md:px-8 lg:px-20 h-16 md:h-20
                 bg-[#0d0d0d30] backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)_brightness(100%)]"
    >
      {/* Logo */}
      <NavLink to="/" className="shrink-0" aria-label="Go home">
        <img
          className="w-[90px] h-[22px] object-cover"
          alt="Hedrax logo"
          src="https://c.animaapp.com/mh588waf3IvYis/img/hedraxlogo-2-1.png"
        />
      </NavLink>

      {/* Primary nav */}
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

      {/* Search + Wallet */}
      <div className="flex items-center gap-3 md:gap-5">
        <div className="relative hidden lg:block w-[420px] xl:w-[526px]">
          <Input
            type="text"
            placeholder="Search collections, tokens and creators"
            className="w-full h-[44px] xl:h-[50px] px-4 py-[11px] xl:py-[13px] rounded-[18px] border border-[#d4d8e36e] bg-transparent text-white placeholder:text-white/50 pr-12"
          />
          <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 xl:w-6 xl:h-6 text-white/50" />
        </div>

        {/* Wallet button + dropdown */}
        <div className="relative" ref={rowRef}>
          <Button
            onClick={handleWalletButtonClick}
            className="w-[128px] md:w-[140px] h-[40px] md:h-[43px] bg-[#d5d7e3] hover:bg-[#e5e7f3] rounded-[18px]
                       [font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#0d0d0d] text-sm md:text-base
                       flex items-center justify-center gap-1.5"
            title={busyTitle}
            disabled={isBusy}
          >
            {accountId ? (
              <>
                {shortId(accountId)}
                <ChevronDown className="w-4 h-4 opacity-70" />
              </>
            ) : (
              "Log in"
            )}
          </Button>

          {accountId && menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-[#111]/90 backdrop-blur p-3 text-sm text-white shadow-xl z-[120]"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="opacity-70">Connected</div>
                <button
                  aria-label="Close"
                  className="p-1 rounded-md hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-3 break-all rounded-lg bg-white/5 p-2 font-mono text-xs">
                {accountId}
              </div>

              <button
                className="w-full rounded-lg bg-white/10 hover:bg:white/15 py-2"
                onClick={async () => {
                  try {
                    await disconnect?.();
                  } finally {
                    setMenuOpen(false);
                  }
                }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
