import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent } from "../../components/ui/card";
import { NavigationSection } from "./sections/NavigationBarSection";
import { FooterSection } from "./sections/FooterSection";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ethers } from "ethers";
import { useHederaWallet } from "../../hedera/useHederaWallet";

// ----- IMPORTANT: Bring your compiled artifact here -----
// Must contain: { abi, bytecode }
// Example:
// import HedraXPumpToken from "../../contracts/HedraXPumpToken.json";
const HedraXPumpToken: any = undefined; // <-- replace with JSON import

// Hedera EVM chain guard (mainnet=295, testnet=296)
const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_HEDERA_CHAIN_ID ?? 295);

// Helpers to get provider/signer from an injected EVM wallet
function getBrowserProvider(): ethers.BrowserProvider {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No injected EVM wallet found (window.ethereum).");
  return new ethers.BrowserProvider(eth);
}

function formatHBARWei(v?: bigint | number | string) {
  try {
    if (typeof v === "bigint") return ethers.formatEther(v);
    if (typeof v === "number") return ethers.formatEther(BigInt(v));
    if (typeof v === "string") return ethers.formatEther(BigInt(v));
  } catch {}
  return "0";
}

export default function TokenCreate(): JSX.Element {
  const navigate = useNavigate();

  // Your wallet hook (we only need to know if connected)
  const { status, connect } = useHederaWallet() as {
    status: "idle" | "connecting" | "connected" | "disconnected" | string;
    connect: () => Promise<string | null>;
  };
  const isConnected = status === "connected";

  // ------------------------------
  // Deploy form state
  // ------------------------------
  const [name, setName] = React.useState("HedraX Pump");
  const [symbol, setSymbol] = React.useState("HXP");
  const [totalSupply, setTotalSupply] = React.useState<string>("1000000000"); // whole tokens; we convert to 1e18
  const [owner, setOwner] = React.useState<string>("");            // 0xOwner
  const [feeRecipient, setFeeRecipient] = React.useState<string>(""); // collects 1% curve fee
  const [basePriceWei, setBasePriceWei] = React.useState<string>("100000000000000"); // 0.0001 HBAR in wei
  const [slopeWei, setSlopeWei] = React.useState<string>("100000000000"); // tiny slope (in wei)
  const [deploying, setDeploying] = React.useState(false);

  // ------------------------------
  // Existing or newly deployed token address + contract instance
  // ------------------------------
  const [tokenAddress, setTokenAddress] = React.useState<string>("");
  const [contract, setContract] = React.useState<any>(null);

  // ------------------------------
  // Trade (Buy/Sell) state
  // ------------------------------
  const [buyAmount, setBuyAmount] = React.useState<string>("1000");  // tokens (whole)
  const [buyQuote, setBuyQuote] = React.useState<{gross: string; fee: string; net: string}>({gross:"0", fee:"0", net:"0"});
  const [buying, setBuying] = React.useState(false);

  const [sellAmount, setSellAmount] = React.useState<string>("500"); // tokens (whole)
  const [sellQuote, setSellQuote] = React.useState<{gross: string; fee: string; net: string}>({gross:"0", fee:"0", net:"0"});
  const [selling, setSelling] = React.useState(false);

  // Validate required
  const deployReady =
    !!name &&
    !!symbol &&
    !!owner &&
    !!feeRecipient &&
    !!totalSupply &&
    !!basePriceWei &&
    !!slopeWei;

  // Ensure correct network
  async function ensureChain(provider: ethers.BrowserProvider) {
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== EXPECTED_CHAIN_ID) {
      throw new Error(`Wrong network. Connect to Hedera (chainId ${EXPECTED_CHAIN_ID}).`);
    }
  }

  async function attachContract(address: string) {
    if (!HedraXPumpToken?.abi) {
      toast.error("Missing HedraXPumpToken ABI import.");
      return;
    }
    const provider = getBrowserProvider();
    await ensureChain(provider);
    const signer = await provider.getSigner();
    const c = new ethers.Contract(address, HedraXPumpToken.abi, signer);
    setContract(c);
  }

  // If user pastes a known address, attach to it
  React.useEffect(() => {
    if (ethers.isAddress(tokenAddress)) {
      attachContract(tokenAddress).catch((e) => console.error(e));
    } else {
      setContract(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress]);

  // ------------------------------
  // Deploy token
  // ------------------------------
  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();

    if (!isConnected) {
      await connect?.();
    }
    if (!HedraXPumpToken?.abi || !HedraXPumpToken?.bytecode) {
      toast.error("Missing contract artifact (abi/bytecode). Import HedraXPumpToken.json.");
      return;
    }
    try {
      setDeploying(true);
      const provider = getBrowserProvider();
      await ensureChain(provider);
      const signer = await provider.getSigner();

      // Convert totalSupply to wei (1e18)
      const supplyWei = ethers.parseUnits(totalSupply.trim(), 18);

      // Deploy
      const factory = new ethers.ContractFactory(
        HedraXPumpToken.abi,
        HedraXPumpToken.bytecode,
        signer
      );

      const contract = await factory.deploy(
        name,
        symbol,
        supplyWei,
        owner,
        feeRecipient,
        BigInt(basePriceWei),
        BigInt(slopeWei)
      );

      await contract.waitForDeployment();
      const addr: string = await contract.getAddress();
      toast.success(`Token deployed: ${addr}`);
      setTokenAddress(addr);
      setContract(contract);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.shortMessage || err?.message || "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  // ------------------------------
  // Quotes
  // ------------------------------
  async function refreshBuyQuote() {
    try {
      if (!contract || !buyAmount) return;
      const amountWei = ethers.parseUnits(buyAmount.trim(), 18);
      const [gross, fee, net] = await contract.buyQuote(amountWei);
      setBuyQuote({
        gross: formatHBARWei(gross),
        fee: formatHBARWei(fee),
        net: formatHBARWei(net),
      });
    } catch (e) {
      setBuyQuote({ gross: "0", fee: "0", net: "0" });
    }
  }

  async function refreshSellQuote() {
    try {
      if (!contract || !sellAmount) return;
      const amountWei = ethers.parseUnits(sellAmount.trim(), 18);
      const [gross, fee, net] = await contract.sellQuote(amountWei);
      setSellQuote({
        gross: formatHBARWei(gross),
        fee: formatHBARWei(fee),
        net: formatHBARWei(net),
      });
    } catch (e) {
      setSellQuote({ gross: "0", fee: "0", net: "0" });
    }
  }

  React.useEffect(() => {
    refreshBuyQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, buyAmount]);

  React.useEffect(() => {
    refreshSellQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, sellAmount]);

  // ------------------------------
  // Buy / Sell actions
  // ------------------------------
  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!contract) return;
    try {
      setBuying(true);
      const amountWei = ethers.parseUnits(buyAmount.trim(), 18);

      // Get a fresh quote for safety
      const [, , net] = await contract.buyQuote(amountWei);
      const tx = await contract.buy(amountWei, net, { value: net });
      await tx.wait();
      toast.success("Buy successful");
      await refreshBuyQuote();
      await refreshSellQuote();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.shortMessage || err?.message || "Buy failed");
    } finally {
      setBuying(false);
    }
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (!contract) return;
    try {
      setSelling(true);
      const amountWei = ethers.parseUnits(sellAmount.trim(), 18);
      const [, , net] = await contract.sellQuote(amountWei);
      const tx = await contract.sell(amountWei, net);
      await tx.wait();
      toast.success("Sell successful");
      await refreshBuyQuote();
      await refreshSellQuote();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.shortMessage || err?.message || "Sell failed");
    } finally {
      setSelling(false);
    }
  }

  return (
    <div className="bg-[#0d0d0d] w-full min-w-[1440px] relative flex flex-col">
      <NavigationSection />

      <div className="mx-auto w-full max-w-[1140px] px-6 pt-10 pb-20">
        <h1 className="text-[26px] font-semibold text-[#d5d7e3]">Token Creation (Bonding Curve)</h1>
        <p className="text-white/60 mt-1">
          Deploy <code>HedraXPumpToken</code> and (optionally) trade via the built-in linear bonding curve.
        </p>

        <div className="grid grid-cols-3 gap-6 mt-8">
          {/* Deploy / Attach */}
          <Card className="col-span-2 bg-white/[0.04] border-white/10">
            <CardContent className="p-6 space-y-5">
              <h2 className="text-lg font-semibold text-[#d5d7e3]">Deploy New Token</h2>

              <form onSubmit={handleDeploy} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="HedraX Pump" />
                  </div>
                  <div>
                    <Label className="text-white/80">Symbol</Label>
                    <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="HXP" />
                  </div>

                  <div>
                    <Label className="text-white/80">Total Supply (whole tokens)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={totalSupply}
                      onChange={(e) => setTotalSupply(e.target.value)}
                      placeholder="1000000000"
                    />
                  </div>

                  <div>
                    <Label className="text-white/80">Owner Address</Label>
                    <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="0xOwner..." />
                  </div>

                  <div>
                    <Label className="text-white/80">Fee Recipient (1% curve fee)</Label>
                    <Input value={feeRecipient} onChange={(e) => setFeeRecipient(e.target.value)} placeholder="0xFeeRecipient..." />
                  </div>

                  <div>
                    <Label className="text-white/80">Base Price (wei per token)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={basePriceWei}
                      onChange={(e) => setBasePriceWei(e.target.value)}
                      placeholder="100000000000000 (0.0001 HBAR)"
                    />
                  </div>

                  <div>
                    <Label className="text-white/80">Slope (wei increase per token)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={slopeWei}
                      onChange={(e) => setSlopeWei(e.target.value)}
                      placeholder="100000000000"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {!isConnected ? (
                    <Button type="button" className="rounded-xl" onClick={() => connect?.()}>
                      Connect Wallet
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!deployReady || deploying}
                      className="rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3] min-w-[170px]"
                    >
                      {deploying ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Deploying…
                        </span>
                      ) : (
                        "Deploy Token"
                      )}
                    </Button>
                  )}
                </div>
              </form>

              <div className="border-t border-white/10 pt-5">
                <h3 className="text-sm text-white/70">Or attach to existing token</h3>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-3">
                  <Input
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="0x… existing HedraXPumpToken address"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (ethers.isAddress(tokenAddress)) {
                        attachContract(tokenAddress);
                      } else {
                        toast.error("Enter a valid address.");
                      }
                    }}
                    className="rounded-xl"
                  >
                    Attach
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-white/[0.04] border-white/10">
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="text-[#d5d7e3] font-semibold">Network</div>
                <div className="text-white/60 text-sm">Hedera EVM (chainId {EXPECTED_CHAIN_ID})</div>
              </div>
              <div>
                <div className="text-[#d5d7e3] font-semibold">Token Address</div>
                <div className="text-white/60 text-sm break-all">
                  {tokenAddress || "—"}
                </div>
              </div>
              <div className="text-white/60 text-sm">
                Contract starts in <b>Curve Trading</b> mode. When `baseRaised` ≥ 100,000 HBAR, it flips to
                <b> Transfer Restricted</b> and marks migration-ready. After you seed DEX LP, call <code>finalizeMigration()</code> to set <b>Normal</b> mode.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trade Panel */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          {/* Buy */}
          <Card className="bg-white/[0.04] border-white/10">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#d5d7e3]">Buy from Curve</h2>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <Label className="text-white/80">Amount (tokens)</Label>
                  <Input
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="1000"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={refreshBuyQuote} className="rounded-xl">
                    Quote
                  </Button>
                </div>
              </div>

              <div className="text-white/70 text-sm">
                <div>Gross Cost: {buyQuote.gross} HBAR</div>
                <div>Fee (1%): {buyQuote.fee} HBAR</div>
                <div>Net Payable: <b>{buyQuote.net}</b> HBAR</div>
              </div>

              <Button
                disabled={!contract || buying}
                onClick={handleBuy}
                className="rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3] min-w-[160px]"
              >
                {buying ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Buying…
                  </span>
                ) : (
                  "Buy"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Sell */}
          <Card className="bg-white/[0.04] border-white/10">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#d5d7e3]">Sell to Curve</h2>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <Label className="text-white/80">Amount (tokens)</Label>
                  <Input
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={refreshSellQuote} className="rounded-xl">
                    Quote
                  </Button>
                </div>
              </div>

              <div className="text-white/70 text-sm">
                <div>Gross Out: {sellQuote.gross} HBAR</div>
                <div>Fee (1%): {sellQuote.fee} HBAR</div>
                <div>Net Receivable: <b>{sellQuote.net}</b> HBAR</div>
              </div>

              <Button
                disabled={!contract || selling}
                onClick={handleSell}
                className="rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3] min-w-[160px]"
              >
                {selling ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Selling…
                  </span>
                ) : (
                  "Sell"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <FooterSection />
    </div>
  );
}
