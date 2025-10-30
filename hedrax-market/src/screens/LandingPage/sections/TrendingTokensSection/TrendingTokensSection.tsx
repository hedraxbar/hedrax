import { ArrowUpRightIcon } from "lucide-react";
import React from "react";
import { Button } from "../../../../components/ui/button";

const trendingTokensData = [
  {
    rank: "1.",
    name: "Masked A...",
    symbol: "MDA",
    price: "$0.067",
    change: "+154.67",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-9.png",
    chartImage: "https://c.animaapp.com/mh588waf3IvYis/img/vector-1.svg",
  },
  {
    rank: "2.",
    name: "Walter Wh..",
    symbol: "WTW",
    price: "$0.067",
    change: "+154.67",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-12.png",
    chartImage: "https://c.animaapp.com/mh588waf3IvYis/img/name-and-price.svg",
  },
  {
    rank: "3.",
    name: "Walter Wh..",
    symbol: "WTW",
    price: "$0.067",
    change: "+154.67",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-15.png",
    chartImage: "https://c.animaapp.com/mh588waf3IvYis/img/name-and-price.svg",
  },
  {
    rank: "4.",
    name: "Wolf on w...",
    symbol: "WWS",
    price: "$0.067",
    change: "+154.67",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-10.png",
    chartImage: "https://c.animaapp.com/mh588waf3IvYis/img/name-and-price.svg",
  },
  {
    rank: "5.",
    name: "Wolf on w...",
    symbol: "WWS",
    price: "$0.067",
    change: "+154.67",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-13.png",
    chartImage: "https://c.animaapp.com/mh588waf3IvYis/img/name-and-price.svg",
  },
  {
    rank: "6.",
    name: "Pepe Pixel",
    symbol: "PPX",
    price: "$0.067",
    change: "+154.67",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-16.png",
    chartImage: "https://c.animaapp.com/mh588waf3IvYis/img/name-and-price.svg",
  },
  {
    rank: "7.",
    name: "Wolf on w...",
    symbol: "WWS",
    price: "$0.067",
    change: "+154.67",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-11.png",
    chartImage: "https://c.animaapp.com/mh588waf3IvYis/img/name-and-price.svg",
  },
  {
    rank: "8.",
    name: "Wolf on w...",
    symbol: "WWS",
    price: "$0.067",
    change: "+154.67",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-14.png",
    chartImage: "https://c.animaapp.com/mh588waf3IvYis/img/name-and-price.svg",
  },
  {
    rank: "9.",
    name: "Wolf on w...",
    symbol: "WWS",
    price: "$0.067",
    change: "+154.67",
    image: "https://c.animaapp.com/mh588waf3IvYis/img/pfp-17.png",
    chartImage: "https://c.animaapp.com/mh588waf3IvYis/img/name-and-price.svg",
  },
];

export const TrendingTokensSection = (): JSX.Element => {
  return (
    <section className="w-full max-w-[1280px] mx-auto px-4 mt-20">
      <div className="flex flex-col gap-[50px] translate-y-[-1rem] animate-fade-in opacity-0">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-[5px]">
            <h2 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-4xl tracking-[-0.72px] leading-normal">
              Trending Tokens
            </h2>
            <p className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-base tracking-[-0.32px] leading-normal">
              Explore the trending tokens right now
            </p>
          </div>

          <Button
            variant="ghost"
            className="h-auto p-0 flex items-center gap-0.5 mt-6 hover:bg-transparent group transition-opacity"
          >
            <span className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-base tracking-[-0.32px] leading-normal">
              See All
            </span>
            <ArrowUpRightIcon className="w-[17px] h-[17px] text-[#d5d7e3]" />
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-[47px] gap-y-5">
          {trendingTokensData.map((token, index) => (
            <article
              key={`token-${index}`}
              className="relative flex items-center gap-[15px] pb-[7px] border-b border-[#d5d7e34f] hover:bg-[#d5d7e30a] transition-colors cursor-pointer group"
            >
              <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-white text-[21px] tracking-[-0.42px] leading-normal whitespace-nowrap min-w-[20px]">
                {token.rank}
              </span>

              <img
                className="w-20 h-[83px] object-cover"
                alt={`${token.name} profile`}
                src={token.image}
              />

              <div className="flex items-start gap-[5px] flex-1">
                <div className="flex flex-col gap-[5px]">
                  <h3 className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-normal whitespace-nowrap">
                    {token.name}
                  </h3>

                  <div className="flex items-start gap-2.5">
                    <span className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e34f] text-base tracking-[-0.32px] leading-normal whitespace-nowrap">
                      {token.price}
                    </span>
                    <span className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#2dd100] text-base tracking-[-0.32px] leading-normal whitespace-nowrap">
                      {token.change}
                    </span>
                  </div>
                </div>

                <span className="opacity-[0.56] [font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-normal whitespace-nowrap">
                  {token.symbol}
                </span>
              </div>

              <img
                className="w-10 h-[19px] object-contain"
                alt="Price chart"
                src={token.chartImage}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
