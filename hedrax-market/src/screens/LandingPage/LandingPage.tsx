import { CollectionsSection } from "./sections/CollectionsSection";
import { FeaturedProjectsSection } from "./sections/FeaturedProjectsSection";
import { FooterSection } from "./sections/FooterSection";
import { HeroSection } from "./sections/HeroSection";
import { NavigationSection } from "./sections/NavigationSection";
import { TrendingItemsSection } from "./sections/TrendingItemsSection";
import { TrendingTokensSection } from "./sections/TrendingTokensSection";

export const LandingPage = (): JSX.Element => {
  return (
    <div
      className="relative w-full min-h-screen bg-[#0d0d0d] text-white overflow-x-hidden"
      data-model-id="595:18"
    >
      {/* content sits ABOVE any backgrounds */}
      <div className="relative z-10">
        <NavigationSection />
        <HeroSection />
        <FeaturedProjectsSection />
        <CollectionsSection />
        <TrendingTokensSection />
        <TrendingItemsSection />
        <FooterSection />
      </div>
    </div>
  );
};
