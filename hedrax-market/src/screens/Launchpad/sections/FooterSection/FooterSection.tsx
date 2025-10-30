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
    <footer className="relative w-full bg-transparent py-12 px-4 md:px-20 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
      <div className="max-w-[1090px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <img
              className="w-[122px] h-[30px] object-cover mb-5"
              alt="Hedraxlogo"
              src="https://c.animaapp.com/mh69bovfaBaEE4/img/hedraxlogo-2-1.png"
            />
            <p className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-[normal] max-w-[289px]">
              The decentralized marketplace for creators and collectors.
            </p>
          </div>

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

          <nav className="flex flex-col gap-5">
            <h3 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-[27px] tracking-[-0.54px] leading-[normal]">
              Account
            </h3>
            {footerLinks.account.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-[normal] hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <nav className="flex flex-col gap-5">
            <h3 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-[27px] tracking-[-0.54px] leading-[normal]">
              Resources
            </h3>
            {footerLinks.resources.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="[font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-[#d5d7e3] text-[21px] tracking-[-0.42px] leading-[normal] hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="max-w-[305px] mb-12">
          <h3 className="[font-family:'Gilroy-SemiBold-SemiBold',Helvetica] font-semibold text-[#d5d7e3] text-base tracking-[-0.32px] leading-[normal] mb-2.5">
            Subscribe to Newsletter
          </h3>
          <div className="flex items-center gap-2 h-[50px] pl-2.5 pr-[3px] py-[13px] rounded-[20px] border border-solid border-[#d4d8e36e]">
            <Input
              type="email"
              placeholder="Enter Email Address"
              className="flex-1 bg-transparent border-0 h-auto p-0 opacity-[0.44] [font-family:'Gilroy-Regular-Regular',Helvetica] font-normal text-white text-xs text-center tracking-[-0.24px] leading-[normal] placeholder:text-white placeholder:opacity-[0.44] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              size="icon"
              className="w-10 h-10 rounded-full bg-transparent hover:bg-transparent p-0"
            >
              <img
                className="w-10 h-10"
                alt="Right"
                src="https://c.animaapp.com/mh69bovfaBaEE4/img/right.png"
              />
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <img
            className="w-[220px] h-10"
            alt="Socials"
            src="https://c.animaapp.com/mh69bovfaBaEE4/img/socials.svg"
          />
        </div>
      </div>
    </footer>
  );
};
