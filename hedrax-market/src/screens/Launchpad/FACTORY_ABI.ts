// FACTORY_ABI.ts
export const FACTORY_ABI = [
    {
      inputs: [
        { name: "_implementation", type: "address" }
      ],
      stateMutability: "nonpayable",
      type: "constructor"
    },
    {
      inputs: [],
      name: "implementation",
      outputs: [{ type: "address" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ name: "_impl", type: "address" }],
      name: "setImplementation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      // permissionless
      inputs: [
        { name: "_name", type: "string" },
        { name: "_symbol", type: "string" },
        { name: "_baseUri", type: "string" },
        { name: "_supply", type: "uint256" },
        { name: "_firstTokenId", type: "uint256" },
        { name: "_signer", type: "address" },
        { name: "_projectOwner", type: "address" },
        { name: "_royaltyFeeNumerator", type: "uint96" },
        { name: "_royaltyReceiver", type: "address" },
        { name: "_mintFeeReceiver", type: "address" }
      ],
      name: "createProjectPublic",
      outputs: [{ type: "address" }],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      // owner-only curated
      inputs: [
        { name: "_name", type: "string" },
        { name: "_symbol", type: "string" },
        { name: "_baseUri", type: "string" },
        { name: "_supply", type: "uint256" },
        { name: "_firstTokenId", type: "uint256" },
        { name: "_signer", type: "address" },
        { name: "_projectOwner", type: "address" },
        { name: "_royaltyFeeNumerator", type: "uint96" },
        { name: "_royaltyReceiver", type: "address" },
        { name: "_mintFeeReceiver", type: "address" }
      ],
      name: "createProjectFeatured",
      outputs: [{ type: "address" }],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [{ name: "index", type: "uint256" }],
      name: "setFeatured",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "projectsCount",
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
      type: "function"
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true,  name: "index",          type: "uint256" },
        { indexed: true,  name: "contractAddress", type: "address" },
        { indexed: false, name: "name",           type: "string" },
        { indexed: false, name: "symbol",         type: "string" },
        { indexed: false, name: "supply",         type: "uint256" },
        { indexed: false, name: "owner",          type: "address" },
        { indexed: false, name: "signer",         type: "address" },
        { indexed: false, name: "featured",       type: "bool" },
        { indexed: false, name: "createdBy",      type: "address" }
      ],
      name: "ProjectCreated",
      type: "event"
    }
  ] as const;
  