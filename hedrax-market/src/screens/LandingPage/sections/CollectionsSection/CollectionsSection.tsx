import { ArrowUpRightIcon } from "lucide-react";
import React from "react";
import { Button } from "../../../../components/ui/button";

const collectionsData = [
  {
    rank: "1.",
    name: "Masked Arabi",
    floorPrice: "150 HBAR",
    change: "+33.5%",
    changeColor: "text-[#2dd100]",
    volume: "15.4k HBAR",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp.png",
  },
  {
    rank: "2.",
    name: "Pepe Pixel",
    floorPrice: "100 HBAR",
    change: "-",
    changeColor: "text-[#282828]",
    volume: "10.4k HBAR",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-3.png",
  },
  {
    rank: "3.",
    name: "No Head Guy",
    floorPrice: "500 HBAR",
    change: "-1.5%",
    changeColor: "text-[#d10000]",
    volume: "15.4k HBAR",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-6.png",
  },
  {
    rank: "4.",
    name: "Monalisa",
    floorPrice: "200 HBAR",
    change: "-1.5%",
    changeColor: "text-[#d10000]",
    volume: "15.4k HBAR",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-1.png",
  },
  {
    rank: "5.",
    name: "Ponke",
    floorPrice: "650 HBAR",
    change: "-",
    changeColor: "text-[#282828]",
    volume: "8.4k HBAR",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-4.png",
  },
  {
    rank: "6.",
    name: "Lady Samurai",
    floorPrice: "500 HBAR",
    change: "-35.6",
    changeColor: "text-[#d10000]",
    volume: "15.4k HBAR",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-7.png",
  },
  {
    rank: "7.",
    name: "Pixel Head",
    floorPrice: "150 HBAR",
    change: "+33.5%",
    changeColor: "text-[#2dd100]",
    volume: "15.4k HBAR",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-2.png",
  },
  {
    rank: "8.",
    name: "Pixel Head II",
    floorPrice: "150 HBAR",
    change: "+33.5%",
    changeColor: "text-[#2dd100]",
    volume: "15.4k HBAR",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-5.png",
  },
  {
    rank: "9.",
    name: "Masked",
    floorPrice: "500 HBAR",
    change: "-1.5%",
    changeColor: "text-[#d10000]",
    volume: "15.4k HBAR",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-8.png",
  },
];

export const CollectionsSection = (): JSX.Element => {
  return (
    <section className="w-full max-w-[1280px] mx-auto px-4 mt-20 flex flex-col gap-[50px]">
      <header className="flex items-start justify-between gap-4 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:0ms]">
        <div className="flex flex-col gap-[5px]">
          <h2 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-4xl tracking-[-0.72px] leading-normal">
            Hot Collections
          </h2>
          <p className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-base tracking-[-0.32px] leading-normal">
            Explore the trending collections right now
          </p>
        </div>

        <Button
          variant="ghost"
          className="h-auto p-0 flex items-center gap-0.5 hover:bg-transparent group translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]"
        >
          <span className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-base tracking-[-0.32px] leading-normal group-hover:text-white transition-colors">
            See All
          </span>
          <ArrowUpRightIcon className="w-[17px] h-[17px] text-[#d5d7e3] group-hover:text-white transition-colors" />
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-[47px] gap-y-5 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
        {collectionsData.map((collection, index) => (
          <article
            key={index}
            className="relative flex items-center gap-[15px] pb-[7px] border-b border-[#d5d7e34f] group cursor-pointer hover:border-[#d5d7e380] transition-colors"
          >
            <span className="absolute left-0.5 top-8 [font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-white text-[21px] tracking-[-0.42px] leading-normal">
              {collection.rank}
            </span>

            <div className="ml-[29px] flex items-center gap-[15px] flex-1">
              <img
                className="w-20 h-[83px] object-cover"
                alt={collection.name}
                src={collection.image}
              />

              <div className="flex flex-col gap-[5px] flex-1 min-w-0">
                <h3 className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-normal truncate group-hover:text-white transition-colors">
                  {collection.name}
                </h3>
                <p className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-base tracking-[-0.32px] leading-normal">
                  <span className="text-[#d5d7e34f] tracking-[-0.05px]">
                    Floor Price:{" "}
                  </span>
                  <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] tracking-[-0.05px]">
                    {collection.floorPrice}
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-[5px]">
                <span
                  className={`[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-base tracking-[-0.32px] leading-normal whitespace-nowrap ${collection.changeColor}`}
                >
                  {collection.change}
                </span>
                <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-normal whitespace-nowrap">
                  {collection.volume}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
