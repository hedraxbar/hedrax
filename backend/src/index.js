// HEDRAX — Collection & Mint Signer Server (Hedera EVM, EIP-712)
// SPDX-License-Identifier: MIT
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { ethers } = require('ethers');
// Optional: const { MongoClient } = require('mongodb');

// ABIs/bytecode (compiled with your build)
// Make sure this file contains both abi & bytecode
const HedraXERC721C = require('./artifact/HedraXERC721C.json');

const {
  PORT = 5001,
  HEDERA_RPC_URL,
  HEDERA_CHAIN_ID = '295',          // Hedera mainnet EVM
  DEPLOYER_PRIVATE_KEY,             // used for deploying & initializing
  SIGNER_PRIVATE_KEY,               // MUST match contract's `signer` (on-chain)
  ADMIN_TOKEN,
  PLATFORM_TREASURY,
  CREATION_FEE_HBAR = '10',
  // MONGODB_URI,
} = process.env;

if (!HEDERA_RPC_URL) throw new Error('HEDERA_RPC_URL missing');
if (!DEPLOYER_PRIVATE_KEY) throw new Error('DEPLOYER_PRIVATE_KEY missing');
if (!SIGNER_PRIVATE_KEY) throw new Error('SIGNER_PRIVATE_KEY missing');

const logger = pino({ level: 'info' });
const app = express();

/* =========================
   Middlewares
========================= */
app.use(helmet());
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(pinoHttp({ logger }));

/* =========================
   Provider & Wallets
========================= */
const provider = new ethers.JsonRpcProvider(HEDERA_RPC_URL, {
  chainId: Number(HEDERA_CHAIN_ID),
  name: 'hedera-evm',
});

const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
const signerWallet = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);

/* =========================
   Helpers
========================= */
function ok(res, data) {
  return res.status(200).json({ ok: true, ...data });
}
function bad(res, msg, code = 400, extra = {}) {
  return res.status(code).json({ ok: false, error: msg, ...extra });
}
function nowIso() {
  return new Date().toISOString();
}

async function getContractAt(address) {
  return new ethers.Contract(address, HedraXERC721C.abi, provider);
}

/** EIP-712 domain for HedraXERC721C */
function mintDomain(collectionAddress) {
  return {
    name: 'HedraXERC721C',
    version: '1',
    chainId: Number(HEDERA_CHAIN_ID),
    verifyingContract: ethers.getAddress(collectionAddress),
  };
}

/** EIP-712 types for MintAuth (MUST match the contract ORDER exactly) */
const mintTypes = {
  MintAuth: [
    { name: 'wallet',      type: 'address' },
    { name: 'amount',      type: 'uint256' },
    { name: 'phaseID',     type: 'bytes32' },
    { name: 'price',       type: 'uint256' },
    { name: 'mintFee',     type: 'uint256' },
    { name: 'maxPerTx',    type: 'uint256' },
    { name: 'maxPerUser',  type: 'uint256' },
    { name: 'maxPerPhase', type: 'uint256' },
    { name: 'nonce',       type: 'bytes32' },
    { name: 'deadline',    type: 'uint256' },
  ],
};

/** Verify deploy message helper (unchanged) */
async function verifyDeploySignature(owner, nonce, timestamp, signature) {
  const msg = `HedraX:deploy:${owner}:${nonce}:${timestamp}`;
  const recovered = ethers.verifyMessage(msg, signature);
  return recovered.toLowerCase() === owner.toLowerCase();
}

/* =========================
   Health
========================= */
app.get('/api/health', async (req, res) => {
  try {
    const net = await provider.getNetwork();
    const deployerBal = await provider.getBalance(deployer.address);
    const signerBal = await provider.getBalance(signerWallet.address);
    ok(res, {
      network: { chainId: Number(net.chainId) },
      deployer: {
        address: deployer.address,
        balanceHBAR: ethers.formatEther(deployerBal),
      },
      signer: {
        address: signerWallet.address,
        balanceHBAR: ethers.formatEther(signerBal),
      },
      platform: {
        treasury: PLATFORM_TREASURY ?? null,
        creationFeeHBAR: CREATION_FEE_HBAR,
      },
      time: nowIso(),
    });
  } catch (e) {
    req.log?.error?.(e);
    bad(res, 'health_error', 500);
  }
});

/**
 * GET /api/collections/:address/signer
 * Confirms on-chain signer equals backend signer.
 */
app.get('/api/collections/:address/signer', async (req, res) => {
  try {
    const address = req.params.address;
    if (!ethers.isAddress(address)) return bad(res, 'bad_address');
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== Number(HEDERA_CHAIN_ID)) {
      return bad(res, `provider_chain_mismatch (got ${Number(net.chainId)})`, 500);
    }
    const c = await getContractAt(address);
    const onChainSigner = await c.signer();
    const matches = onChainSigner.toLowerCase() === signerWallet.address.toLowerCase();
    ok(res, { collection: address, onChainSigner, backendSigner: signerWallet.address, matches });
  } catch (e) {
    req.log?.error?.(e);
    bad(res, 'signer_check_error', 500);
  }
});

/**
 * GET /api/mint/domain?collection=0x...
 * Returns the exact EIP-712 domain the server uses to sign mint payloads.
 */
app.get('/api/mint/domain', (req, res) => {
  try {
    const collection = String(req.query.collection || '');
    if (!ethers.isAddress(collection)) return bad(res, 'bad_collection');
    return ok(res, { domain: mintDomain(collection), types: mintTypes });
  } catch (e) {
    bad(res, 'domain_error', 500);
  }
});

/* =========================
   Deploy & Initialize
========================= */

/**
 * POST /api/collections/deploy
 * Body:
 * {
 *   name, symbol, baseURI, supply, firstTokenId,
 *   signer, owner, royaltyFeeBps, royaltyReceiver, mintFeeReceiver,
 *   nonce, timestamp, signature
 * }
 * Auth: x-admin-token === ADMIN_TOKEN OR owner-signed message
 */
app.post('/api/collections/deploy', async (req, res) => {
  try {
    const adminHeader = req.header('x-admin-token');
    const {
      name,
      symbol,
      baseURI,
      supply,
      firstTokenId,
      signer: signerAddr,
      owner,
      royaltyFeeBps,
      royaltyReceiver,
      mintFeeReceiver,
      // auth
      nonce,
      timestamp,
      signature,
    } = req.body ?? {};

    // Validate inputs
    if (!name || !symbol || !baseURI) return bad(res, 'missing_fields (name/symbol/baseURI)');
    if (!supply || Number(supply) <= 0) return bad(res, 'bad_supply');
    if (firstTokenId === undefined || firstTokenId === null) return bad(res, 'missing_firstTokenId');
    if (!ethers.isAddress(signerAddr)) return bad(res, 'bad_signer');
    if (!ethers.isAddress(owner)) return bad(res, 'bad_owner');
    if (!ethers.isAddress(royaltyReceiver)) return bad(res, 'bad_royaltyReceiver');
    if (!ethers.isAddress(mintFeeReceiver)) return bad(res, 'bad_mintFeeReceiver');

    // Auth
    if (ADMIN_TOKEN && adminHeader === ADMIN_TOKEN) {
      // trusted request
    } else {
      if (!nonce || !timestamp || !signature) return bad(res, 'missing_signature');
      const okSig = await verifyDeploySignature(owner, String(nonce), String(timestamp), signature);
      if (!okSig) return bad(res, 'bad_signature', 401);
      const nowSec = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSec - Number(timestamp)) > 600) return bad(res, 'stale_signature');
    }

    // Network guard
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== Number(HEDERA_CHAIN_ID)) {
      return bad(res, `provider_chain_mismatch (got ${Number(net.chainId)})`, 500);
    }

    // Deploy contract
    if (!HedraXERC721C?.abi || !HedraXERC721C?.bytecode) {
      return bad(res, 'artifact_missing', 500);
    }

    const factory = new ethers.ContractFactory(HedraXERC721C.abi, HedraXERC721C.bytecode, deployer);
    const contract = await factory.deploy(); // empty constructor
    const deployTx = contract.deploymentTransaction();
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    // Initialize
    const initTx = await contract.initialize(
      name,
      symbol,
      baseURI,
      BigInt(supply),
      BigInt(firstTokenId),
      signerAddr,
      owner,
      BigInt(royaltyFeeBps ?? 0),
      royaltyReceiver,
      mintFeeReceiver
    );
    const initRcpt = await initTx.wait();

    // OPTIONAL: persist to DB here

    return ok(res, {
      address,
      tx: {
        deployHash: deployTx?.hash ?? null,
        initHash: initRcpt?.hash ?? null,
      },
    });
  } catch (e) {
    req.log?.error?.(e);
    return bad(res, e?.shortMessage || e?.message || 'deploy_error', 500);
  }
});

/**
 * GET /api/collections/prepare-message?owner=0x...&nonce=...&timestamp=...
 * Returns message to sign for deploy authorization.
 */
app.get('/api/collections/prepare-message', (req, res) => {
  const owner = String(req.query.owner || '');
  const nonce = String(req.query.nonce || '');
  const timestamp = String(req.query.timestamp || '');
  if (!ethers.isAddress(owner)) return bad(res, 'bad_owner');
  if (!nonce || !timestamp) return bad(res, 'missing_nonce_or_timestamp');
  return ok(res, { message: `HedraX:deploy:${owner}:${nonce}:${timestamp}` });
});

/* =========================
   Mint — EIP-712 Signature
========================= */

/**
 * POST /api/mint/sign
 * Body:
 * {
 *   collection: "0x...",
 *   wallet: "0xUser",
 *   amount: "1",
 *   phaseID: "0x<32-bytes hex>",
 *   price: "10000000000000000",      // per token (wei)
 *   mintFee: "0",                    // per token (wei)
 *   maxPerTx: "3",
 *   maxPerUser: "5",
 *   maxPerPhase: "1000",
 *   deadline: 1732848000,            // unix seconds
 *   nonce: "0x<32-bytes hex>"
 * }
 *
 * Returns: { signature, digest, domain, types }
 */
app.post('/api/mint/sign', async (req, res) => {
  try {
    const {
      collection,
      wallet,
      amount,
      phaseID,
      price,
      mintFee,
      maxPerTx,
      maxPerUser,
      maxPerPhase,
      deadline,
      nonce,
    } = req.body ?? {};

    // Basic validation
    if (!ethers.isAddress(collection)) return bad(res, 'bad_collection');
    if (!ethers.isAddress(wallet)) return bad(res, 'bad_wallet');
    if (!phaseID || !ethers.isHexString(phaseID, 32)) return bad(res, 'bad_phaseID (bytes32)');
    if (!nonce || !ethers.isHexString(nonce, 32)) return bad(res, 'bad_nonce (bytes32)');

    const amt = BigInt(amount ?? 0);
    const priceWei = BigInt(price ?? 0);
    const feeWei = BigInt(mintFee ?? 0);
    const perTx = BigInt(maxPerTx ?? 0);
    const perUser = BigInt(maxPerUser ?? 0);
    const perPhase = BigInt(maxPerPhase ?? 0);
    const dl = BigInt(deadline ?? 0n);

    if (amt <= 0n) return bad(res, 'amount<=0');
    if (dl <= BigInt(Math.floor(Date.now() / 1000))) return bad(res, 'deadline_in_past');

    // Chain/contract checks
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== Number(HEDERA_CHAIN_ID)) {
      return bad(res, `provider_chain_mismatch (got ${Number(net.chainId)})`, 500);
    }

    const c = await getContractAt(collection);

    // Ensure backend signer matches on-chain signer
    const onChainSigner = await c.signer();
    if (onChainSigner.toLowerCase() !== signerWallet.address.toLowerCase()) {
      return bad(res, 'backend_signer_mismatch', 500, {
        onChainSigner,
        backendSigner: signerWallet.address,
      });
    }

    // Optional safety checks: supply cap (cannot fully guarantee phase caps off-chain)
    const maxSupply = await c.supply();
    const minted = await c.totalSupply();
    if (minted + amt > maxSupply) {
      return bad(res, 'exceeds_max_supply', 400, {
        minted: minted.toString(),
        supply: maxSupply.toString(),
        requested: amt.toString(),
      });
    }

    // Build EIP-712
    const domain = mintDomain(collection);
    const message = {
      wallet,
      amount: amt,
      phaseID,
      price: priceWei,
      mintFee: feeWei,
      maxPerTx: perTx,
      maxPerUser: perUser,
      maxPerPhase: perPhase,
      nonce,
      deadline: dl,
    };

    // ethers v6 typed-data signing
    const signature = await signerWallet.signTypedData(domain, mintTypes, message);

    // Also return the digest (what contract recovers)
    const digest = ethers.TypedDataEncoder.hash(domain, mintTypes, message);

    return ok(res, { signature, digest, domain, types: mintTypes });
  } catch (e) {
    req.log?.error?.(e);
    return bad(res, e?.shortMessage || e?.message || 'mint_sign_error', 500);
  }
});

/* =========================
   Server boot
========================= */
app.listen(Number(PORT), () => {
  logger.info(`HedraX Collection Server listening on :${PORT}`);
  logger.info(`RPC: ${HEDERA_RPC_URL} (chainId=${HEDERA_CHAIN_ID})`);
  logger.info(`Deployer: ${deployer.address}`);
  logger.info(`Mint Signer: ${signerWallet.address}`);
});
