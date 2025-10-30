import React from "react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";

const footerLinks = {
  quickLinks: [
    { label: "Marketplace", href: "#" },
    { label: "Launchpad", href: "#" },
    { label: "Swap", href: "#" },
  ],
  account: [
    { label: "Favourites", href: "#" },
    { label: "My Collections", href: "#" },
    { label: "Settings", href: "#" },
  ],
  resources: [
    { label: "Help Center", href: "#" },
    { label: "Terms & Conditions", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Contact", href: "#" },
  ],
};

export const FooterSection = (): JSX.Element => {
  return (
    <footer className="relative w-full mt-[180px] px-4 md:px-20 opacity-0 translate-y-[-1rem] animate-fade-in [--animation-delay:200ms]">
      <div className="max-w-[1090px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-0">
          <div className="md:col-span-4">
            <img
              className="w-[122px] h-[30px] object-cover mb-5"
              alt="Hedraxlogo"
              src="https://c.animaapp.com/mh588waf3IvYis/img/hedraxlogo-2-1.png"
            />

            <p className="max-w-[289px] [font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-[normal] mb-[34px]">
              The decentralized marketplace for creators and collectors.
            </p>

            <div className="flex flex-col gap-2.5 max-w-[305px]">
              <div className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-base tracking-[-0.32px] leading-[normal]">
                Subscribe to Newsletter
              </div>

              <div className="flex h-[50px] items-center justify-between pl-2.5 pr-[3px] py-[13px] rounded-[20px] border border-solid border-[#d4d8e36e]">
                <Input
                  placeholder="Enter Email Address"
                  className="flex-1 border-0 bg-transparent opacity-[0.44] [font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-white text-xs tracking-[-0.24px] placeholder:text-white placeholder:opacity-[0.44] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
                />

                <Button
                  size="icon"
                  className="w-10 h-10 rounded-full bg-transparent hover:bg-transparent p-0 border-0"
                >
                  <img
                    className="w-10 h-10"
                    alt="Right"
                    src="https://c.animaapp.com/mh588waf3IvYis/img/right.png"
                  />
                </Button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 md:col-start-6">
            <nav className="flex flex-col gap-5">
              <h3 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-[27px] tracking-[-0.54px] leading-[normal]">
                Quick Links
              </h3>

              {footerLinks.quickLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-[normal] hover:opacity-80 transition-opacity"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="md:col-span-2 md:col-start-8">
            <nav className="flex flex-col gap-5">
              <h3 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-[27px] tracking-[-0.54px] leading-[normal]">
                Account
              </h3>

              {footerLinks.account.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-[normal] whitespace-nowrap hover:opacity-80 transition-opacity"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="md:col-span-2 md:col-start-10">
            <nav className="flex flex-col gap-5">
              <h3 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-[27px] tracking-[-0.54px] leading-[normal]">
                Resources
              </h3>

              {footerLinks.resources.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-[normal] whitespace-nowrap hover:opacity-80 transition-opacity"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex justify-center mt-[100px] pb-10">
          <img
            className="w-[220px] h-10"
            alt="Socials"
            src="https://c.animaapp.com/mh588waf3IvYis/img/socials.svg"
          />
        </div>
      </div>
    </footer>
  );
};
