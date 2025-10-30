import * as fs from "fs";
import * as path from "path";

const SOURCIFY_URL = "https://server-verify.hashscan.io/verify"; // Hedera Sourcify
const CHAIN_ID = "295"; // Hedera mainnet

function readJSON(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

async function main() {
  const address = process.env.ADDRESS!;
  const artifactPath = process.env.ARTIFACT!; // e.g. artifacts/contracts/HedraXERC721C.sol/HedraXERC721C.json

  if (!address || !artifactPath) {
    throw new Error("Set ADDRESS=0x... and ARTIFACT=path/to/*.json");
  }

  const artifact = readJSON(artifactPath);
  if (!artifact.metadata) throw new Error("Artifact missing 'metadata' field (string). Recompile with hardhat.");
  const metadataStr: string = artifact.metadata; // already a JSON string

  // Parse to discover which sources Sourcify expects (keys are file paths)
  const metadata = JSON.parse(metadataStr);
  const sources: Record<string, any> = metadata.sources || {};

  // Build "files" map: include metadata.json and each source path with exact on-disk content
  const files: Record<string, string> = { "metadata.json": metadataStr };

  for (const filePath of Object.keys(sources)) {
    // Keep the SAME relative path as in metadata
    const abs = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(abs)) {
      throw new Error(`Missing source on disk: ${filePath} (looked for ${abs})`);
    }
    files[filePath] = fs.readFileSync(abs, "utf-8");
  }

  const body = {
    address,
    chain: CHAIN_ID,
    files,
  };

  // Post to Sourcify
  const res = await fetch(SOURCIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Verify failed: ${res.status} ${res.statusText}\n${text}`);
  }

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
