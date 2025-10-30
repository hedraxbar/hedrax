import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 500 },
      viaIR: true,
    },
  },
  networks: {
    hedera: {
      url: process.env.HEDERA_RPC_URL || "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  mocha: { timeout: 120000 },
  typechain: { outDir: "typechain-types", target: "ethers-v6" },
};

export default config;
