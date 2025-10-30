import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { ScrollArea, ScrollBar } from "../../../../components/ui/scroll-area";

const dropsData = [
  {
    id: 1,
    title: "Tud the Ugly Duck",
    creator: "By Choice Studios",
    nftCount: "345 NFTs",
    status: "Coming Soon",
    isLive: false,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-5.png",
    hasMintButton: false,
  },
  {
    id: 2,
    title: "Reptilia Heads",
    creator: "By Mari lorem",
    nftCount: null,
    status: "Live Mint",
    isLive: true,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19-1.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-8.png",
    hasMintButton: true,
  },
  {
    id: 3,
    title: "Potrade",
    creator: "By Big Mouth Studios",
    nftCount: "120 NFTs",
    status: "Coming Soon",
    isLive: false,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19-2.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-9.png",
    hasMintButton: false,
  },
  {
    id: 4,
    title: "Reptilia Heads",
    creator: "By Mari lorem",
    nftCount: "750 NFTs",
    status: null,
    isLive: false,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19-3.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-8.png",
    hasMintButton: false,
  },
  {
    id: 5,
    title: "Potrade",
    creator: "By Big Mouth Studios",
    nftCount: "120 NFTs",
    status: null,
    isLive: false,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19-4.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-9.png",
    hasMintButton: false,
  },
];

const dropsDataRow2 = [
  {
    id: 6,
    title: "Tud the Ugly Duck",
    creator: "By Choice Studios",
    nftCount: "345 NFTs",
    status: "Coming Soon",
    isLive: false,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19-5.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-5.png",
    hasMintButton: false,
  },
  {
    id: 7,
    title: "Reptilia Heads",
    creator: "By Mari lorem",
    nftCount: null,
    status: "Live Mint",
    isLive: true,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19-6.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-8.png",
    hasMintButton: true,
  },
  {
    id: 8,
    title: "Potrade",
    creator: "By Big Mouth Studios",
    nftCount: "120 NFTs",
    status: "Coming Soon",
    isLive: false,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19-7.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-9.png",
    hasMintButton: false,
  },
  {
    id: 9,
    title: "Reptilia Heads",
    creator: "By Mari lorem",
    nftCount: "750 NFTs",
    status: null,
    isLive: false,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19-8.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-8.png",
    hasMintButton: false,
  },
  {
    id: 10,
    title: "Potrade",
    creator: "By Big Mouth Studios",
    nftCount: "120 NFTs",
    status: null,
    isLive: false,
    bannerImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/rectangle-19-9.png",
    creatorImage: "https://c.animaapp.com/mh69bovfaBaEE4/img/creator-id-9.png",
    hasMintButton: false,
  },
];

export const LiveUpcomingDropsSection = (): JSX.Element => {
  return (
    <section className="relative w-full py-12 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
      <div className="container mx-auto px-4">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-[108px]">
          <div className="flex flex-col gap-[5px]">
            <h2 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-4xl tracking-[-0.72px] leading-normal">
              Live &amp; Upcoming Drops
            </h2>
            <p className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-base text-center tracking-[-0.32px] leading-normal whitespace-nowrap">
              Explore this week&apos;s live and upcoming projects
            </p>
          </div>
          <img
            className="w-[90px] h-10"
            alt="Toggle"
            src="https://c.animaapp.com/mh69bovfaBaEE4/img/toggle.svg"
          />
        </header>

        <ScrollArea className="w-full mb-6">
          <div className="flex gap-1.5 pb-4">
            {dropsData.map((drop) => (
              <Card
                key={drop.id}
                className="flex-shrink-0 w-[420px] h-[500px] bg-[#0d0d0d] rounded-[30px] border border-solid border-[#d5d7e34a] overflow-hidden transition-transform hover:scale-[1.02]"
              >
                <CardContent className="relative p-0 h-full">
                  <img
                    className="w-full h-[300px] object-cover"
                    alt={drop.title}
                    src={drop.bannerImage}
                  />

                  <img
                    className="absolute top-[243px] left-1/2 -translate-x-1/2 w-[100px] h-[100px] rounded-2xl object-cover"
                    alt={`${drop.title} creator`}
                    src={drop.creatorImage}
                  />

                  <div className="flex flex-col items-center pt-[65px] px-4">
                    <h3 className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-[27px] text-center tracking-[-0.54px] leading-normal">
                      {drop.title}
                    </h3>

                    <p className="opacity-[0.63] [font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-base text-center tracking-[-0.32px] leading-normal whitespace-nowrap mt-[2px]">
                      {drop.creator}
                    </p>

                    {drop.hasMintButton ? (
                      <Button className="w-[204px] h-auto gap-2.5 px-8 py-4 bg-[#d5d7e3] rounded-[18px] mt-[29px] hover:bg-[#c5c7d3] transition-colors">
                        <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#0d0d0d] text-base text-center tracking-[-0.32px] leading-normal whitespace-nowrap">
                          Mint Now
                        </span>
                      </Button>
                    ) : drop.nftCount ? (
                      <div className="flex items-center gap-1 mt-[43px]">
                        <img
                          className="w-5 h-5 object-cover"
                          alt="NFT icon"
                          src="https://c.animaapp.com/mh69bovfaBaEE4/img/nft-6298900-1-7.png"
                        />
                        <span className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-white text-base text-center tracking-[-0.32px] leading-normal">
                          {drop.nftCount}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {drop.status && (
                    <Badge
                      variant="outline"
                      className="absolute top-[29px] left-[18px] inline-flex items-center gap-2.5 px-[18px] py-3 bg-[#131313] rounded-xl border border-solid border-[#d5d7e3] opacity-[0.73] h-auto"
                    >
                      <span className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-white text-base text-center tracking-[-0.32px] leading-normal whitespace-nowrap">
                        {drop.status}
                      </span>
                      {drop.isLive && (
                        <div className="relative w-4 h-4 bg-[#2dd1008c] rounded-lg">
                          <div className="absolute top-1 left-1 w-2 h-2 bg-[#2dd100] rounded" />
                        </div>
                      )}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-4">
            {dropsDataRow2.map((drop) => (
              <Card
                key={drop.id}
                className="flex-shrink-0 w-[420px] h-[500px] bg-[#0d0d0d] rounded-[30px] border border-solid border-[#d5d7e34a] overflow-hidden transition-transform hover:scale-[1.02]"
              >
                <CardContent className="relative p-0 h-full">
                  <img
                    className="w-full h-[300px] object-cover"
                    alt={drop.title}
                    src={drop.bannerImage}
                  />

                  <img
                    className="absolute top-[243px] left-1/2 -translate-x-1/2 w-[100px] h-[100px] rounded-2xl object-cover"
                    alt={`${drop.title} creator`}
                    src={drop.creatorImage}
                  />

                  <div className="flex flex-col items-center pt-[65px] px-4">
                    <h3 className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-[27px] text-center tracking-[-0.54px] leading-normal">
                      {drop.title}
                    </h3>

                    <p className="opacity-[0.63] [font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-base text-center tracking-[-0.32px] leading-normal whitespace-nowrap mt-[2px]">
                      {drop.creator}
                    </p>

                    {drop.hasMintButton ? (
                      <Button className="w-[204px] h-auto gap-2.5 px-8 py-4 bg-[#d5d7e3] rounded-[18px] mt-[29px] hover:bg-[#c5c7d3] transition-colors">
                        <span className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#0d0d0d] text-base text-center tracking-[-0.32px] leading-normal whitespace-nowrap">
                          Mint Now
                        </span>
                      </Button>
                    ) : drop.nftCount ? (
                      <div className="flex items-center gap-1 mt-[43px]">
                        <img
                          className="w-5 h-5 object-cover"
                          alt="NFT icon"
                          src="https://c.animaapp.com/mh69bovfaBaEE4/img/nft-6298900-1-7.png"
                        />
                        <span className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-white text-base text-center tracking-[-0.32px] leading-normal">
                          {drop.nftCount}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {drop.status && (
                    <Badge
                      variant="outline"
                      className="absolute top-[29px] left-[18px] inline-flex items-center gap-2.5 px-[18px] py-3 bg-[#131313] rounded-xl border border-solid border-[#d5d7e3] opacity-[0.73] h-auto"
                    >
                      <span className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-white text-base text-center tracking-[-0.32px] leading-normal whitespace-nowrap">
                        {drop.status}
                      </span>
                      {drop.isLive && (
                        <div className="relative w-4 h-4 bg-[#2dd1008c] rounded-lg">
                          <div className="absolute top-1 left-1 w-2 h-2 bg-[#2dd100] rounded" />
                        </div>
                      )}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
};
