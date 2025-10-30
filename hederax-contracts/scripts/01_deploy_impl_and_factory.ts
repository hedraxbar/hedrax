import { ethers } from "hardhat";

async function main() {
  // Deploy implementation
  const Impl = await ethers.getContractFactory("HedraXERC721C");
  const impl = await Impl.deploy();
  await impl.waitForDeployment(); // v6
  const implAddr = await impl.getAddress(); // v6
  console.log("HedraXERC721C implementation:", implAddr);
  console.log("  tx:", impl.deploymentTransaction()?.hash);

  // Deploy factory (with implementation address)
  const Factory = await ethers.getContractFactory("HedraXFactory");
  const factory = await Factory.deploy(implAddr);
  await factory.waitForDeployment(); // v6
  const factoryAddr = await factory.getAddress(); // v6
  console.log("HedraXFactory:", factoryAddr);
  console.log("  tx:", factory.deploymentTransaction()?.hash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
