import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();

  // ------- Real parameters (tweak via .env) -------
  const NAME   = process.env.TOKEN_NAME   || "HedraX";
  const SYMBOL = process.env.TOKEN_SYMBOL || "HDRX";

  // 18 decimals applied:
  const TOTAL_SUPPLY = ethers.parseUnits(
    process.env.TOKEN_SUPPLY || "1000000000",
    18
  );

  // Owner that can finalize migration / withdraw / set params
  const OWNER = process.env.TOKEN_OWNER || deployer.address;
  const FEE_RECIPIENT = process.env.FEE_RECIPIENT || deployer.address;

  // Curve params in HBAR (human), converted to 18-dec:
  // Example: base 0.000001 HBAR, slope 0.000000000002 HBAR per token step
  const BASE_PRICE_WEI = ethers.parseUnits(
    process.env.BASE_PRICE_HBAR || "0.000001",
    18
  );
  const SLOPE_WEI = ethers.parseUnits(
    process.env.SLOPE_HBAR || "0.000000000002",
    18
  );

  console.log("== HedraXPumpToken deploy ==");
  console.log("Deployer:", deployer.address);
  console.log("Params:", { NAME, SYMBOL, OWNER, FEE_RECIPIENT });
  console.log("Supply(wei):", TOTAL_SUPPLY.toString());
  console.log("Curve:", {
    baseHBAR: process.env.BASE_PRICE_HBAR || "0.000001",
    slopeHBAR: process.env.SLOPE_HBAR || "0.000000000002",
  });

  // ------- Deploy -------
  const Token = await ethers.getContractFactory("HedraXPumpToken");
  const token = await Token.deploy(
    NAME,
    SYMBOL,
    TOTAL_SUPPLY,
    OWNER,
    FEE_RECIPIENT,
    BASE_PRICE_WEI,
    SLOPE_WEI
  );

  const deployTx = token.deploymentTransaction();
  if (!deployTx) throw new Error("No deployment tx found");

  const receipt = await deployTx.wait();
  const tokenAddress = await token.getAddress();

  const net = await ethers.provider.getNetwork();
  console.log("Deployed at:", tokenAddress);
  console.log("Tx hash:", receipt?.hash);
  console.log("Chain ID:", net.chainId);

  // ------- Post-deploy sanity (no TypeChain needed) -------
  const modeFn = token.getFunction("mode");
  const curveActiveFn = token.getFunction("curveActive");
  const thresholdFn = token.getFunction("MIGRATION_THRESHOLD_WEI");
  const soldFn = token.getFunction("tokensSold");
  const raisedFn = token.getFunction("baseRaised");

  const mode: bigint = await modeFn();
  const curveActive: boolean = await curveActiveFn();
  const threshold: bigint = await thresholdFn();
  const sold: bigint = await soldFn();
  const raised: bigint = await raisedFn();

  console.log("Mode:", mode.toString());
  console.log("Curve active:", curveActive);
  console.log("Migration threshold (HBAR wei):", threshold.toString());
  console.log("Tokens sold (wei):", sold.toString());
  console.log("HBAR raised (wei):", raised.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
