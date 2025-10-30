import { useNavigate } from "react-router-dom";
import { Button } from "../../../../components/ui/button";

export const HeroSection = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <section className="relative w-full flex items-center justify-center py-32">
      <img
        className="absolute inset-0 w-full h-full object-cover"
        alt="Full BG"
        src="https://c.animaapp.com/mh588waf3IvYis/img/full-bg.png"
      />

      <div className="relative z-10 flex flex-col w-full max-w-[885px] items-center gap-[30px] px-4">
        <div className="flex flex-col items-center gap-2.5 w-full translate-y-[-1rem] animate-fade-in opacity-0">
          <h1 className="w-full [font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-[64px] text-center tracking-[-1.28px] leading-[normal]">
            Own, Trade &amp; Build in the Decentralized Future
          </h1>

          <p className="w-full [font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-[21px] text-center tracking-[-0.42px] leading-[normal]">
            A Web3 marketplace where NFTs, tokens, and creators thrive together.
          </p>
        </div>

        <div className="inline-flex items-center gap-5 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
          <Button
            onClick={() => navigate("/marketplace")}
            className="bg-[linear-gradient(99deg,rgba(0,16,89,1)_0%,rgba(0,34,191,1)_100%)] hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2.5 px-8 py-4 h-auto rounded-[18px]"
          >
            <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-base text-center tracking-[-0.32px] leading-[normal] whitespace-nowrap">
              Explore Marketplace
            </span>
          </Button>

          {/* ⬇️ Add this onClick to go to /launchpad */}
          <Button
            onClick={() => navigate("/launchpad")}
            className="bg-[#d5d7e3] hover:bg-[#c5c7d3] transition-colors inline-flex items-center justify-center gap-2.5 px-8 py-4 h-auto rounded-[18px]"
          >
            <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#0d0d0d] text-base text-center tracking-[-0.32px] leading-[normal] whitespace-nowrap">
              Launch Your Project
            </span>
          </Button>
        </div>

        <div className="inline-flex items-center gap-2.5 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
          <span className="opacity-[0.79] [font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-base text-center tracking-[-0.32px] leading-[normal] whitespace-nowrap">
            Powered by Hedera
          </span>

          <img
            className="w-[17.98px] h-[18px]"
            alt="Logo"
            src="https://c.animaapp.com/mh588waf3IvYis/img/logo.png"
          />
        </div>
      </div>
    </section>
  );
};
