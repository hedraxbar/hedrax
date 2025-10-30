import React from "react";
import { Card, CardContent } from "../../../../components/ui/card";
import { ScrollArea, ScrollBar } from "../../../../components/ui/scroll-area";
import { Switch } from "../../../../components/ui/switch";

const projectsData = [
  {
    id: 1,
    bannerImage: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19.png",
    creatorImage: "https://c.animaapp.com/mh588waf3IvYis/img/creator-id.png",
    title: "Tud the Ugly Duck",
    creator: "By Choice Studios",
    nftCount: "345 NFTs",
  },
  {
    id: 2,
    bannerImage: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19-1.png",
    creatorImage: "https://c.animaapp.com/mh588waf3IvYis/img/creator-id-3.png",
    title: "Reptilia Heads",
    creator: "By Mari lorem",
    nftCount: "750 NFTs",
  },
  {
    id: 3,
    bannerImage: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19-2.png",
    creatorImage: "https://c.animaapp.com/mh588waf3IvYis/img/creator-id-4.png",
    title: "Potrade",
    creator: "By Big Mouth Studios",
    nftCount: "120 NFTs",
  },
  {
    id: 4,
    bannerImage: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19-3.png",
    creatorImage: "https://c.animaapp.com/mh588waf3IvYis/img/creator-id-3.png",
    title: "Reptilia Heads",
    creator: "By Mari lorem",
    nftCount: "750 NFTs",
  },
  {
    id: 5,
    bannerImage: "https://c.animaapp.com/mh588waf3IvYis/img/rectangle-19-4.png",
    creatorImage: "https://c.animaapp.com/mh588waf3IvYis/img/creator-id-4.png",
    title: "Potrade",
    creator: "By Big Mouth Studios",
    nftCount: "120 NFTs",
  },
];

export const FeaturedProjectsSection = (): JSX.Element => {
  return (
    <section className="w-full px-4 md:px-20 py-12">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div className="flex flex-col gap-1.5 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:0ms]">
          <h2 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-4xl tracking-[-0.72px] leading-normal">
            Featured Projects
          </h2>
          <p className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-base tracking-[-0.32px] leading-normal">
            Explore this week&apos;s live and upcoming projects
          </p>
        </div>

        <div className="flex items-center gap-3 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
          <Switch />
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
        <div className="flex gap-6 pb-4">
          {projectsData.map((project, index) => (
            <Card
              key={project.id}
              className="flex-shrink-0 w-[420px] h-[500px] bg-[#0d0d0d] rounded-[30px] border border-[#d5d7e34a] overflow-hidden transition-transform hover:scale-[1.02]"
            >
              <CardContent className="p-0 relative h-full">
                <img
                  className="w-full h-[300px] object-cover"
                  alt={`${project.title} banner`}
                  src={project.bannerImage}
                />

                <img
                  className="absolute top-[243px] left-1/2 -translate-x-1/2 w-[100px] h-[100px] rounded-2xl object-cover"
                  alt={`${project.title} creator`}
                  src={project.creatorImage}
                />

                <div className="flex flex-col items-center gap-2 mt-[65px]">
                  <h3 className="[font-family:'Gilroy-Medium-Medium',Helvetica] font-medium text-[#d5d7e3] text-[27px] text-center tracking-[-0.54px] leading-normal">
                    {project.title}
                  </h3>

                  <p className="opacity-[0.63] [font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-base text-center tracking-[-0.32px] leading-normal">
                    {project.creator}
                  </p>

                  <div className="flex items-center gap-1 mt-3">
                    <img
                      className="w-5 h-5 object-cover"
                      alt="NFT icon"
                      src="https://c.animaapp.com/mh588waf3IvYis/img/nft-6298900-1-4.png"
                    />
                    <span className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-white text-base text-center tracking-[-0.32px] leading-normal">
                      {project.nftCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};
