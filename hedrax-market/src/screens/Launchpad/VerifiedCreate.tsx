import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent } from "../../components/ui/card";
import { NavigationSection } from "./sections/NavigationBarSection";
import { FooterSection } from "./sections/FooterSection";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import emailjs from "@emailjs/browser";

const SERVICE_ID   = String(import.meta.env.VITE_EMAILJS_SERVICE_ID);
const TEMPLATE_ID  = String(import.meta.env.VITE_EMAILJS_TEMPLATE_ID);
const PUBLIC_KEY   = String(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

export default function VerifiedCreate(): JSX.Element {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = React.useState(false);

  // form state
  const [projectName, setProjectName] = React.useState("");
  const [teamEmail, setTeamEmail] = React.useState("");
  const [site, setSite] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [supply, setSupply] = React.useState("");
  const [mintPrice, setMintPrice] = React.useState("");
  const [story, setStory] = React.useState("");

  const ready = projectName && teamEmail && story;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      toast.error("EmailJS env vars missing.");
      return;
    }
    try {
      setSubmitting(true);
      const resp = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          project_name: projectName,
          team_email: teamEmail,
          website: site,
          twitter,
          supply,
          mint_price: mintPrice,
          story,
          submitted_at: new Date().toISOString(),
        },
        { publicKey: PUBLIC_KEY }
      );
      if (resp.status === 200) {
        toast.success("Application sent. We’ll contact you soon.");
        navigate("/launchpad");
      } else {
        toast.error("Failed to send. Try again.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to send");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#0d0d0d] w-full min-w-[1440px] relative flex flex-col">
      <NavigationSection />

      <div className="mx-auto w-full max-w-[940px] px-6 pt-10 pb-20">
        <h1 className="text-[26px] font-semibold text-[#d5d7e3]">Create Verified Drop</h1>
        <p className="text-white/60 mt-1">
          Tell us about your project. Our team will review and reach out.
        </p>

        <Card className="mt-8 bg-white/[0.04] border-white/10">
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/80">Project Name*</Label>
                  <Input value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="HedraX Origins" />
                </div>
                <div>
                  <Label className="text-white/80">Contact Email*</Label>
                  <Input type="email" value={teamEmail} onChange={e=>setTeamEmail(e.target.value)} placeholder="team@yourproject.xyz" />
                </div>
                <div>
                  <Label className="text-white/80">Website</Label>
                  <Input value={site} onChange={e=>setSite(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label className="text-white/80">Twitter / X</Label>
                  <Input value={twitter} onChange={e=>setTwitter(e.target.value)} placeholder="@yourhandle" />
                </div>
                <div>
                  <Label className="text-white/80">Planned Supply</Label>
                  <Input value={supply} onChange={e=>setSupply(e.target.value)} placeholder="e.g., 10,000" />
                </div>
                <div>
                  <Label className="text-white/80">Target Mint Price</Label>
                  <Input value={mintPrice} onChange={e=>setMintPrice(e.target.value)} placeholder="e.g., 50 HBAR" />
                </div>
              </div>

              <div>
                <Label className="text-white/80">Project Story / Details*</Label>
                <Textarea rows={6} value={story} onChange={e=>setStory(e.target.value)} placeholder="Tell us about your art, team, utility, timeline…" />
              </div>

              <div className="flex items-center justify-end pt-2">
                <Button
                  type="submit"
                  disabled={!ready || submitting}
                  className="rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3] min-w-[160px]"
                >
                  {submitting ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending…</span> : "Submit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <FooterSection />
    </div>
  );
}
