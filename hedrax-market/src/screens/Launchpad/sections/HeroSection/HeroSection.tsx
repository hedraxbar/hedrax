import { Button } from "../../../../components/ui/button";

export const HeroSection = (): JSX.Element => {
  return (
    <section className="relative w-full bg-[url(https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-4719.png)] bg-cover bg-center">
      <div className="flex flex-col items-start gap-6 px-10 py-24 max-w-[672px] translate-y-[-1rem] animate-fade-in opacity-0">
        <h1 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-[47px] tracking-[-0.94px] leading-[normal] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
          Discover &amp; Launch the Next Big NFT Collection
        </h1>

        <p className="[font-family:'Gilmer_Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-[normal] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
          Explore live and upcoming drops from top creators, or start your own.
        </p>

        <div className="flex gap-4 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms]">
          <Button className="bg-[#6366f1] hover:bg-[#5558e3] text-white px-6 py-3 h-auto transition-colors">
            Explore Drops
          </Button>
          <Button
            variant="outline"
            className="bg-white hover:bg-gray-100 text-gray-900 border-white px-6 py-3 h-auto transition-colors"
          >
            Create Your Collection
          </Button>
        </div>
      </div>
    </section>
  );
};
