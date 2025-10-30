import { ethers } from "hardhat";

async function main() {
  const factoryAddr = process.env.FACTORY!;
  const name = process.env.NAME!;
  const symbol = process.env.SYMBOL!;
  const baseUri = process.env.BASE_URI!;
  const supply = BigInt(process.env.SUPPLY!);
  const firstTokenId = BigInt(process.env.FIRST_TOKEN_ID || "1");
  const signer = process.env.SIGNER!;
  const projectOwner = process.env.PROJECT_OWNER!;
  const royaltyBps = BigInt(process.env.ROYALTY_BPS || "500");
  const royaltyRecv = process.env.ROYALTY_RECV!;
  const mintFeeRecv = process.env.MINT_FEE_RECV!;

  const factory = await ethers.getContractAt("HedraXFactory", factoryAddr);

  const tx = await factory.createProjectFeatured(
    name, symbol, baseUri, supply, firstTokenId,
    signer, projectOwner, royaltyBps, royaltyRecv, mintFeeRecv
  );

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Transaction dropped or replaced before confirmation");
  }

  console.log("createProjectFeatured tx:", receipt.hash);

  // Optional: parse ProjectCreated event from logs
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === "ProjectCreated") {
        // Adjust the fields if your event args differ
        const projectAddr = parsed.args.contractAddress as string;
        const index = parsed.args.index as bigint;
        const featured = (parsed.args.featured as boolean) ?? true;
        const createdBy = parsed.args.createdBy as string | undefined;

        console.log(
          "New project address:", projectAddr,
          "index:", index.toString(),
          "featured:", featured,
          createdBy ? `createdBy: ${createdBy}` : ""
        );
        break;
      }
    } catch {
      // not our event; skip
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
