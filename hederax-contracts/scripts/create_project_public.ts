import { ethers } from "hardhat";

async function main() {
  const factoryAddr = process.env.FACTORY!;
  const name = process.env.NAME || "Demo Collection";
  const symbol = process.env.SYMBOL || "DEMO";
  const baseUri = process.env.BASE_URI || "ipfs://YOUR_CID_PREFIX/";
  const supply = BigInt(process.env.SUPPLY || "1000");
  const firstTokenId = BigInt(process.env.FIRST_TOKEN_ID || "1");
  const signer = process.env.SIGNER!;             // EIP-712 backend signer
  const projectOwner = process.env.PROJECT_OWNER!; // admin/owner of the collection
  const royaltyBps = BigInt(process.env.ROYALTY_BPS || "500"); // 5%
  const royaltyRecv = process.env.ROYALTY_RECV!;
  const mintFeeRecv = process.env.MINT_FEE_RECV!;

  const factory = await ethers.getContractAt("HedraXFactory", factoryAddr);

  const tx = await factory.createProjectPublic(
    name,
    symbol,
    baseUri,
    supply,
    firstTokenId,
    signer,
    projectOwner,
    royaltyBps,
    royaltyRecv,
    mintFeeRecv
  );

  const receipt = await tx.wait(); // ethers v6 TransactionReceipt
  console.log("createProjectPublic tx:", receipt?.hash);

  // Parse ProjectCreated from logs using the contract interface (v6 style)
  let projectAddr: string | undefined;
  let index: bigint | undefined;

  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed && parsed.name === "ProjectCreated") {
        // args are typed as Result; use field names from the event
        projectAddr = parsed.args.contractAddress as string;
        index = parsed.args.index as bigint;
        break;
      }
    } catch {
      // not a HedraXFactory log – ignore
    }
  }

  if (projectAddr) {
    console.log("New project address:", projectAddr, "index:", index?.toString());
  } else {
    console.log("ProjectCreated event not found in receipt; check your inputs or explorer.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
