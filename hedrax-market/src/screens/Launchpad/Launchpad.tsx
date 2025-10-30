import { Button } from "../../components/ui/button";
import { FooterSection } from "./sections/FooterSection";
import { HeroSection } from "./sections/HeroSection";
import { LiveUpcomingDropsSection } from "./sections/LiveUpcomingDropsSection/LiveUpcomingDropsSection";
import { NavigationSection } from "./sections/NavigationBarSection";
import { useNavigate } from "react-router-dom";

const paginationDots = [{ active: false }, { active: true }, { active: false }];

export const Launchpad = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <div
      className="bg-[#0d0d0d] w-full min-w-[1440px] relative flex flex-col"
      data-model-id="595:1978"
    >
      <NavigationSection />

      <HeroSection />

      <div className="relative w-full flex flex-col items-center">
        <div className="inline-flex items-center gap-5 mt-8 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
          <Button className="w-[209px] bg-[linear-gradient(99deg,rgba(0,16,89,1)_0%,rgba(0,34,191,1)_100%)] hover:bg-[linear-gradient(99deg,rgba(0,16,89,0.9)_0%,rgba(0,34,191,0.9)_100%)] flex items-center justify-center gap-2.5 px-8 py-4 rounded-[18px] h-auto transition-colors">
            <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-base text-center tracking-[-0.32px] leading-[normal] whitespace-nowrap">
              Explore Drops
            </span>
          </Button>

          <Button
            className="w-[220px] bg-[#d5d7e3] hover:bg-[#c5c7d3] flex items-center justify-center gap-2.5 px-8 py-4 rounded-[18px] h-auto transition-colors"
            onClick={() => navigate("/launchpad/create")}
          >
            <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#0d0d0d] text-base text-center tracking-[-0.32px] leading-[normal] whitespace-nowrap">
              Create Your Collection
            </span>
          </Button>
        </div>

        <div className="inline-flex items-center gap-2.5 mt-8 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms]">
          {paginationDots.map((dot, index) => (
            <div
              key={`pagination-dot-${index}`}
              className={`w-[60px] h-2.5 rounded-[10px] transition-colors ${
                dot.active ? "bg-[#d5d7e3]" : "bg-[#d5d7e326]"
              }`}
            />
          ))}
        </div>
      </div>

      <LiveUpcomingDropsSection />

      <FooterSection />
    </div>
  );
};
