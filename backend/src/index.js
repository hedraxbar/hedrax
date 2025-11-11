// backend/src/index.js
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { Wallet, id, verifyMessage, getAddress } = require('ethers');
const jwt = require('jsonwebtoken');
const { connectMongo, getDb } = require('./db');

/* ----------------------------- Config ----------------------------- */
const {
  PORT = 4000,
  NODE_ENV = 'development',
  ALLOWED_ORIGINS = 'http://localhost:5173',
  ADMIN_TOKEN,
  SIGNER_PRIVATE_KEY,
  HEDERA_NETWORK = 'mainnet',
  RPC_URL,
  MIRROR_URL,
  AUTH_JWT_SECRET = ''
} = process.env;

if (!SIGNER_PRIVATE_KEY) throw new Error('SIGNER_PRIVATE_KEY missing');
if (!AUTH_JWT_SECRET) console.warn('[auth] AUTH_JWT_SECRET is empty — tokens will be unsigned!');

/** Hedera EVM chain IDs — mainnet=295, testnet=296 */
const CHAIN_ID = 295;

/* ----------------------------- App Setup ----------------------------- */
const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

const allowed = ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow curl/postman
    return cb(null, allowed.includes(origin));
  }
}));

app.use(express.json({ limit: '1mb' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

/* ----------------------------- Signer ----------------------------- */
const signer = new Wallet(SIGNER_PRIVATE_KEY);

/* ----------------------- Validation Schemas ----------------------- */
// FE -> get signature for mint
const MintAuthRequest = z.object({
  collection: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'bad collection address'),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'bad wallet'),
  amount: z.number().int().positive(),
  phaseID: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'phaseID must be bytes32 hex'),
  deadline: z.number().int().positive()
});

// Admin/ops -> create collection record after factory emits ProjectCreated
const CreateCollectionRequest = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  name: z.string().min(1),
  symbol: z.string().min(1),
  baseUri: z.string().min(1),
  supply: z.number().int().positive(),
  firstTokenId: z.number().int().nonnegative(),
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  royaltyReceiver: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  royaltyBps: z.number().int().min(0).max(10_000),
  mintFeeReceiver: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  // sale config
  priceWei: z.string().regex(/^\d+$/),
  mintFeeWei: z.string().regex(/^\d+$/),
  maxPerTx: z.string().regex(/^\d+$/),
  maxPerUser: z.string().regex(/^\d+$/),
  maxPerPhase: z.string().regex(/^\d+$/),
  // flags
  featured: z.boolean().optional().default(false),
  chainId: z.number().int().optional().default(CHAIN_ID)
});

// Admin -> toggle featured
const ToggleFeaturedRequest = z.object({
  featured: z.boolean()
});

/* ---------------------- Nonce Store (In-Mem) ---------------------- */
const usedNonces = new Set();
/** For login challenges — nonce cache with TTL (in-memory). */
const loginNonces = new Map(); // key: lowercased account, val: { nonce, issuedAt, expiresAt }

/* --------------------------- Admin Middleware --------------------------- */
function requireAdmin(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

/* ------------------------------ Routes ------------------------------ */

// Health
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    env: NODE_ENV,
    network: HEDERA_NETWORK,
    chainId: CHAIN_ID,
    rpc: Boolean(RPC_URL),
    mirror: Boolean(MIRROR_URL)
  });
});

/* ========== Login challenge (SentX-style) ========== */
const ChallengeQuery = z.object({
  account: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

/** GET /api/auth/challenge?account=0x... */
app.get('/api/auth/challenge', (req, res) => {
  const parsed = ChallengeQuery.safeParse({ account: (req.query.account || '').toString() });
  if (!parsed.success) return res.status(400).json({ error: 'bad account' });

  const account = parsed.data.account.toLowerCase();
  const nonce = id(`${account}:${Date.now()}:${Math.random()}`);
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 10 * 60; // 10 minutes

  loginNonces.set(account, { nonce, issuedAt, expiresAt });

  const message =
    `HedraX Login\n` +
    `Address: ${getAddress(account)}\n` +
    `Nonce: ${nonce}\n` +
    `Issued: ${issuedAt}\n` +
    `Expires: ${expiresAt}`;

  return res.json({ message });
});

const VerifyBody = z.object({
  account: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/)
});

/** POST /api/auth/verify  { account, message, signature } */
app.post('/api/auth/verify', async (req, res) => {
  const parsed = VerifyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'bad payload' });

  const account = parsed.data.account.toLowerCase();
  const message = parsed.data.message;
  const signature = parsed.data.signature;

  // Recover signer
  let recovered;
  try {
    recovered = getAddress(verifyMessage(message, signature)).toLowerCase();
  } catch {
    return res.status(400).json({ error: 'invalid signature' });
  }
  if (recovered !== account) {
    return res.status(400).json({ error: 'signer mismatch' });
  }

  // Validate nonce + expiry from stored challenge
  const rec = loginNonces.get(account);
  if (!rec) return res.status(400).json({ error: 'no challenge' });

  const now = Math.floor(Date.now() / 1000);
  if (now > rec.expiresAt) {
    loginNonces.delete(account);
    return res.status(400).json({ error: 'challenge expired' });
  }
  if (!message.includes(`Nonce: ${rec.nonce}`)) {
    return res.status(400).json({ error: 'bad nonce' });
  }

  // Persist/update the user record
  try {
    const db = getDb();
    const users = db.collection('users');
    const ts = new Date();
    await users.updateOne(
      { address: getAddress(account).toLowerCase() },
      {
        $setOnInsert: { createdAt: ts },
        $set: { lastLoginAt: ts, lastSig: signature, lastMsg: message },
      },
      { upsert: true }
    );
  } catch (e) {
    if (NODE_ENV !== 'production') console.warn('[auth] user upsert failed:', e);
  }

  // Issue JWT (7 days)
  const payload = { sub: getAddress(account), typ: 'hedrax-login' };
  const token = AUTH_JWT_SECRET
    ? jwt.sign(payload, AUTH_JWT_SECRET, { expiresIn: '7d' })
    : Buffer.from(JSON.stringify({ ...payload, expDays: 7 })).toString('base64'); // fallback

  // Optional: clear challenge (one-time)
  loginNonces.delete(account);

  return res.json({ token });
});

/* --------------------- User-auth public persistence --------------------- */

// simple user JWT guard (accepts proper JWT or unsigned fallback)
function requireUser(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'missing token' });

  if (AUTH_JWT_SECRET) {
    try {
      const payload = jwt.verify(token, AUTH_JWT_SECRET);
      req.user = payload;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'bad token' });
    }
  }

  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (!parsed?.sub) return res.status(401).json({ error: 'bad token' });
    req.user = parsed;
    return next();
  } catch {
    return res.status(401).json({ error: 'bad token' });
  }
}

/** POST /api/projects  (USER JWT) */
app.post('/api/projects', requireUser, async (req, res, next) => {
  try {
    const body = req.body || {};
    const required = ['name', 'symbol', 'baseUri', 'supply', 'firstTokenId', 'contractAddress', 'owner', 'signer'];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === '') {
        return res.status(400).json({ error: `missing ${k}` });
      }
    }

    const db = getDb();
    const col = db.collection('collections');
    const now = new Date();

    const doc = {
      address: String(body.contractAddress).toLowerCase(),
      name: String(body.name),
      symbol: String(body.symbol),
      baseUri: String(body.baseUri),
      supply: Number(body.supply),
      firstTokenId: Number(body.firstTokenId),
      owner: String(body.owner).toLowerCase(),
      signer: String(body.signer).toLowerCase(),
      royaltyReceiver: String(body.royaltyReceiver || body.owner).toLowerCase(),
      royaltyBps: Number(body.royaltyBps || 0),
      mintFeeReceiver: String(body.mintFeeReceiver || body.owner).toLowerCase(),
      featured: Boolean(body.featured || false),
      chainId: CHAIN_ID,
      description: String(body.description || ''),
      imageUrl: String(body.imageUrl || ''),
      createdBy: String(body.createdBy || req.user?.sub || '').toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    await col.updateOne(
      { address: doc.address },
      { $setOnInsert: doc, $set: { updatedAt: now } },
      { upsert: true }
    );

    const saved = await col.findOne({ address: doc.address });
    res.status(201).json(saved);
  } catch (err) { next(err); }
});

/* ==================== Collections (admin) & Mint ==================== */

/** POST /collections  (ADMIN/OPS) */
app.post('/collections', requireAdmin, async (req, res, next) => {
  try {
    const parsed = CreateCollectionRequest.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const payload = parsed.data;

    const db = getDb();
    const col = db.collection('collections');

    // Normalize
    payload.address = payload.address.toLowerCase();
    payload.owner = payload.owner.toLowerCase();
    payload.signer = payload.signer.toLowerCase();
    payload.royaltyReceiver = payload.royaltyReceiver.toLowerCase();
    payload.mintFeeReceiver = payload.mintFeeReceiver.toLowerCase();

    const now = new Date();
    const doc = { ...payload, createdAt: now, updatedAt: now };

    await col.updateOne(
      { address: doc.address },
      { $setOnInsert: doc },
      { upsert: true }
    );

    const saved = await col.findOne({ address: doc.address });
    res.status(201).json(saved);
  } catch (err) { next(err); }
});

/** GET /collections  (FE) */
app.get('/collections', async (req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection('collections');

    const { featured, q } = req.query;
    const filter = {};
    if (typeof featured === 'string') filter.featured = featured === 'true';
    if (typeof q === 'string' && q.trim()) {
      filter.$or = [
        { name:   { $regex: q, $options: 'i' } },
        { symbol: { $regex: q, $options: 'i' } },
        { address:{ $regex: (q || '').toLowerCase(), $options: 'i' } }
      ];
    }

    const items = await col.find(filter).sort({ createdAt: -1 }).limit(100).toArray();
    res.json(items);
  } catch (err) { next(err); }
});

/** GET /collections/:address  (FE) */
app.get('/collections/:address', async (req, res, next) => {
  try {
    const address = (req.params.address || '').toLowerCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return res.status(400).json({ error: 'bad address' });

    const db = getDb();
    const col = db.collection('collections');
    const doc = await col.findOne({ address });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (err) { next(err); }
});

/** PATCH /collections/:address/featured  (ADMIN) */
app.patch('/collections/:address/featured', requireAdmin, async (req, res, next) => {
  try {
    const address = (req.params.address || '').toLowerCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return res.status(400).json({ error: 'bad address' });

    const body = ToggleFeaturedRequest.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.flatten() });

    const db = getDb();
    const col = db.collection('collections');

    const r = await col.findOneAndUpdate(
      { address },
      { $set: { featured: body.data.featured, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!r.value) return res.status(404).json({ error: 'not found' });
    res.json(r.value);
  } catch (err) { next(err); }
});

/** POST /mint/auth  (FE) */
app.post('/mint/auth', async (req, res, next) => {
  try {
    const parsed = MintAuthRequest.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { collection, wallet, amount, phaseID, deadline } = parsed.data;
    const now = Math.floor(Date.now() / 1000);
    if (deadline <= now) return res.status(400).json({ error: 'deadline in past' });

    const db = getDb();
    const col = db.collection('collections');
    const cfg = await col.findOne({ address: collection.toLowerCase() });
    if (!cfg) return res.status(404).json({ error: 'unknown collection' });
    if (cfg.chainId !== CHAIN_ID) return res.status(400).json({ error: 'chainId mismatch' });

    // Guardrails — do not exceed canonical caps
    const maxPerTx = BigInt(cfg.maxPerTx);
    const maxPerUser = BigInt(cfg.maxPerUser);
    const maxPerPhase = BigInt(cfg.maxPerPhase);
    const priceWei = BigInt(cfg.priceWei);
    const mintFeeWei = BigInt(cfg.mintFeeWei);

    if (BigInt(amount) > maxPerTx) return res.status(400).json({ error: 'exceeds maxPerTx' });

    // One-time nonce
    const nonce = id(`${wallet}:${Date.now()}:${Math.random()}`);
    if (usedNonces.has(nonce)) return res.status(409).json({ error: 'nonce collision' });
    usedNonces.add(nonce);

    // EIP-712 domain
    const domain = {
      name: 'HedraXERC721C',
      version: '1',
      chainId: cfg.chainId,
      verifyingContract: cfg.address
    };

    // EIP-712 types
    const types = {
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
        { name: 'deadline',    type: 'uint256' }
      ]
    };

    const value = {
      wallet,
      amount,
      phaseID,
      price: priceWei.toString(),
      mintFee: mintFeeWei.toString(),
      maxPerTx: maxPerTx.toString(),
      maxPerUser: maxPerUser.toString(),
      maxPerPhase: maxPerPhase.toString(),
      nonce,
      deadline
    };

    const signature = await signer.signTypedData(domain, types, value);
    const totalWei = (priceWei + mintFeeWei) * BigInt(amount);

    res.json({
      auth: value,
      signature,
      totals: {
        priceWei: priceWei.toString(),
        feeWei: mintFeeWei.toString(),
        amount,
        payWei: totalWei.toString()
      }
    });
  } catch (err) { next(err); }
});

/* --------------------------- Error Handling --------------------------- */
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  if (NODE_ENV !== 'production') console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

/* -------------------------------- Boot -------------------------------- */
(async () => {
  await connectMongo();
  app.listen(Number(PORT), () => {
    console.log(`[hedrax] signer+collections on :${PORT} (env=${NODE_ENV})`);
    console.log(`Allowed origins: ${ALLOWED_ORIGINS}`);
  });
})();
