import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { NavigationSection } from "./sections/NavigationBarSection";
import { FooterSection } from "./sections/FooterSection";
import { ChevronLeft, Sparkles, ShieldCheck, Coins } from "lucide-react";

export default function CreateDropHub(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0d0d0d] w-full min-w-[1440px] relative flex flex-col">
      <NavigationSection />

      <div className="mx-auto w-full max-w-[1240px] px-6 pt-10 pb-20">
        {/* Back + Title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-0"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 text-white/80" />
          </Button>
          <h1 className="text-[28px] leading-none tracking-tight text-[#d5d7e3] font-semibold">
            Create NFT Drop
          </h1>
        </div>

        {/* Cards */}
        <div className="mt-8 grid grid-cols-3 gap-6">
          {/* Self-Created */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center">
                <Sparkles className="h-5 w-5 text-white/80" />
              </div>
              <h2 className="text-xl font-semibold text-[#d5d7e3]">
                Self-Created Collection (Instant Drop)
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-white/70">
              Create and launch your own NFT collection instantly.
            </p>

            <Button
              className="mt-6 w-full h-12 rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3]"
              onClick={() => navigate("/launchpad/create/self")}
              aria-label="Create self collection"
            >
              Create Collection
            </Button>
          </div>

          {/* Verified / Featured */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center">
                <ShieldCheck className="h-5 w-5 text-white/80" />
              </div>
              <h2 className="text-xl font-semibold text-[#d5d7e3]">
                Featured Collection
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-white/70">
              Apply for a verified, promoted drop on HedraX.
            </p>

            <Button
              className="mt-6 w-full h-12 rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3]"
              onClick={() => navigate("/launchpad/create/verified")}
              aria-label="Create verified drop"
            >
              Create Verified Drop
            </Button>
          </div>

          {/* Token */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 opacity-80">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center">
                <Coins className="h-5 w-5 text-white/80" />
              </div>
              <h2 className="text-xl font-semibold text-[#d5d7e3]">
                Token Creation
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-white/70">
              Configure a custom token for rewards or utility.
            </p>

            <Button
              className="mt-6 w-full h-12 rounded-xl bg-white/10 text-white/60 hover:bg-white/15"
              variant="ghost"
              onClick={() => navigate("/launchpad/create/token")}
              aria-label="Create token"
            >
              Create Token
            </Button>
          </div>
        </div>
      </div>

      <FooterSection />
    </div>
  );
}
