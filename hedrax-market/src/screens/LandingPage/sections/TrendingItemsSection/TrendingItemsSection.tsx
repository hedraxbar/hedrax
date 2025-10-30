import { HeartIcon } from "lucide-react";
import React from "react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { ScrollArea, ScrollBar } from "../../../../components/ui/scroll-area";

const trendingItems = [
  {
    id: 1,
    image: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19-5.png",
    title: "Masked",
    creator: "By Choice Studios",
    price: "1500 HBAR",
    likes: 400,
    logo: "https://c.animaapp.com/mh588waf3IvYis/img/logo-1.png",
    imageClasses: "rounded-[20px_20px_0px_0px] object-cover",
  },
  {
    id: 2,
    image: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19-6.png",
    title: "Monalisa",
    creator: "By Choice Studios",
    price: "1500 HBAR",
    likes: 400,
    logo: "https://c.animaapp.com/mh588waf3IvYis/img/logo-2.png",
    imageClasses: "",
  },
  {
    id: 3,
    image: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19-7.png",
    title: "Wolf on the wall Street",
    creator: "By Choice Studios",
    price: "1500 HBAR",
    likes: 400,
    logo: "https://c.animaapp.com/mh588waf3IvYis/img/logo-3.png",
    imageClasses: "",
    titleWidth: "w-[239px]",
  },
  {
    id: 4,
    image: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19-9.png",
    title: "COWWWW",
    creator: "By Choice Studios",
    price: "1500 HBAR",
    likes: 400,
    logo: "https://c.animaapp.com/mh588waf3IvYis/img/logo-4.png",
    imageClasses: "rounded-[20px_20px_0px_0px] object-cover",
    titleWidth: "w-[239px]",
  },
  {
    id: 5,
    image: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19-9.png",
    title: "COWWWW",
    creator: "By Choice Studios",
    price: "1500 HBAR",
    likes: 400,
    logo: "https://c.animaapp.com/mh588waf3IvYis/img/logo-5.png",
    imageClasses: "rounded-[20px_20px_0px_0px] object-cover",
    titleWidth: "w-[239px]",
  },
];

export const TrendingItemsSection = (): JSX.Element => {
  return (
    <section className="w-full mt-20 px-4 md:px-20">
      <div className="max-w-[1309px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-[68px]">
          <div className="flex flex-col gap-[5px] translate-y-[-1rem] animate-fade-in opacity-0">
            <h2 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-4xl tracking-[-0.72px] leading-[normal]">
              Trending Items
            </h2>
            <p className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-base tracking-[-0.32px] leading-[normal]">
              Explore this week&apos;s live and upcoming projects
            </p>
          </div>

          <img
            className="w-[90px] h-10 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]"
            alt="Toggle"
            src="https://c.animaapp.com/mh588waf3IvYis/img/toggle.svg"
          />
        </div>

        <ScrollArea className="w-full whitespace-nowrap translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
          <div className="flex gap-[26px] pb-4">
            {trendingItems.map((item, index) => (
              <Card
                key={item.id}
                className="w-[299px] h-[365px] flex-shrink-0 bg-[#0d0d0d] rounded-[20px] border border-solid border-[#d5d7e34a] overflow-hidden transition-transform hover:scale-105"
              >
                <CardContent className="p-0 relative h-full">
                  <div className="relative">
                    <img
                      className={`w-[299px] h-[239px] ${item.imageClasses}`}
                      alt={item.title}
                      src={item.image}
                    />
                    <Badge className="absolute top-[13px] left-[9px] bg-[#0d0d0d] rounded-xl px-1.5 py-0.5 gap-0.5 h-auto border-0 hover:bg-[#0d0d0d]">
                      <HeartIcon className="w-3.5 h-3.5 fill-current" />
                      <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-xs tracking-[-0.24px] leading-[normal]">
                        {item.likes}
                      </span>
                    </Badge>
                  </div>

                  <div
                    className={`flex flex-col items-center gap-[5px] mt-6 px-[30px] ${
                      item.titleWidth || "w-[111px]"
                    } mx-auto`}
                  >
                    <h3 className="w-full text-center [font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-2xl tracking-[-0.48px] leading-[normal]">
                      {item.title}
                    </h3>
                    <p className="w-full text-center opacity-[0.63] [font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-sm tracking-[-0.28px] leading-[normal]">
                      {item.creator}
                    </p>
                    <div className="flex items-center gap-[5px] mt-1">
                      <img
                        className="w-[18px] h-[18px]"
                        alt="Logo"
                        src={item.logo}
                      />
                      <span className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-white text-base tracking-[-0.32px] leading-[normal]">
                        {item.price}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="flex justify-center mt-[61px] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms]">
          <Button className="h-auto px-8 py-4 rounded-[18px] bg-[linear-gradient(99deg,rgba(0,16,89,1)_0%,rgba(0,34,191,1)_100%)] hover:opacity-90 transition-opacity">
            <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-base text-center tracking-[-0.32px] leading-[normal] whitespace-nowrap">
              Load More
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
};
