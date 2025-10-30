import { ethers } from "hardhat";

async function main() {
  const feeRecipient = process.env.FEE_RECIPIENT!;
  const bps = Number(process.env.PLATFORM_FEE_BPS || "250");

  if (!feeRecipient) throw new Error("FEE_RECIPIENT is required");
  if (isNaN(bps)) throw new Error("PLATFORM_FEE_BPS must be a number");

  const Mkt = await ethers.getContractFactory("HedraXMarketplace");
  const mkt = await Mkt.deploy(feeRecipient, bps);
  await mkt.waitForDeployment();

  const addr = await mkt.getAddress();
  console.log("HedraXMarketplace:", addr);
  console.log("tx:", mkt.deploymentTransaction()?.hash);
}

main().catch((e) => { console.error(e); process.exit(1); });
