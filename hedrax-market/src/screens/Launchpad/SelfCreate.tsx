// src/screens/Launchpad/SelfCreate.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { ethers } from 'ethers';

import { NavigationSection, HeaderSpacer } from './sections/NavigationBarSection/NavigationBarSection';
import { FooterSection } from './sections/FooterSection';
import { Button } from '../../components/ui/button';
import { useHederaWallet } from '../../hedera/useHederaWallet';
import { getWcEvmProvider, getWcAddress } from '../../hedera/wcEvmProvider';

/* ----------------------- Config ----------------------- */
const FACTORY_ADDRESS =
  (import.meta.env.VITE_FACTORY_CONTRACT_ADDRESS as string) ||
  '0xba8f26A3D29934476A9752BC7c6d3D936FDD32d8';

const TARGET_CHAIN_ID = 295; // Hedera EVM Mainnet

const FACTORY_ABI = [
  {
    inputs: [
      { name: '_name', type: 'string' },
      { name: '_symbol', type: 'string' },
      { name: '_baseUri', type: 'string' },
      { name: '_supply', type: 'uint256' },
      { name: '_firstTokenId', type: 'uint256' },
      { name: '_signer', type: 'address' },
      { name: '_projectOwner', type: 'address' },
      { name: '_royaltyFeeNumerator', type: 'uint96' },
      { name: '_royaltyReceiver', type: 'address' },
      { name: '_mintFeeReceiver', type: 'address' },
    ],
    name: 'createProjectPublic',
    outputs: [{ name: 'project', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'index', type: 'uint256' },
      { indexed: true, name: 'contractAddress', type: 'address' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'symbol', type: 'string' },
      { indexed: false, name: 'supply', type: 'uint256' },
      { indexed: false, name: 'owner', type: 'address' },
      { indexed: false, name: 'signer', type: 'address' },
      { indexed: false, name: 'featured', type: 'bool' },
      { indexed: false, name: 'createdBy', type: 'address' },
    ],
    name: 'ProjectCreated',
    type: 'event',
  },
] as const;

const iface = new ethers.Interface(FACTORY_ABI);

const inputBase =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-white/40';

function getInjectedProvider(): any | null {
  const w = window as any;
  return w.ethereum || w.hashpack?.ethereum || w.hedera?.ethereum || null;
}

async function ensureInjectedOnHedera(eth: any) {
  const hex = await eth.request({ method: 'eth_chainId' }).catch(() => null);
  const id = typeof hex === 'string' ? Number(hex) : NaN;
  if (id === TARGET_CHAIN_ID) return;
  await eth.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0x' + TARGET_CHAIN_ID.toString(16) }],
  });
}

/* --------------------------- Page --------------------------- */
export default function SelfCreate(): JSX.Element {
  const navigate = useNavigate();

  const { status: hederaStatus, accountId: hederaAccountId } = (useHederaWallet() as any) || {};
  const hederaConnected = !!hederaAccountId;

  // Form
  const [form, setForm] = useState({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    baseUri: '',
    supply: '10000',
    firstTokenId: '1',
    royaltyBps: '500',
    royaltyReceiver: '',
    mintFeeReceiver: '',
    signer: '',
    projectOwner: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [successAddr, setSuccessAddr] = useState<string>('');

  // Prefill addresses from injected provider if present (non-blocking)
  useEffect(() => {
    (async () => {
      try {
        const eth = getInjectedProvider();
        if (!eth) return;
        await ensureInjectedOnHedera(eth).catch(() => {});
        const browser = new ethers.BrowserProvider(eth);
        const signer = await browser.getSigner().catch(() => null);
        const addr = await signer?.getAddress().catch(() => null);
        if (addr) {
          setForm((p) => ({
            ...p,
            royaltyReceiver: p.royaltyReceiver || addr,
            mintFeeReceiver: p.mintFeeReceiver || addr,
            signer: p.signer || addr,
            projectOwner: p.projectOwner || addr,
          }));
        }
      } catch {}
    })();
  }, []);

  const isAddr = (v: string) => {
    try {
      return !!v && ethers.isAddress(v);
    } catch {
      return false;
    }
  };

  const canSubmit = useMemo(() => {
    try {
      return (
        FACTORY_ADDRESS &&
        form.name.trim().length > 0 &&
        form.symbol.trim().length > 0 &&
        form.baseUri.trim().length > 0 &&
        BigInt(form.supply) > 0n &&
        BigInt(form.firstTokenId) >= 0n &&
        /^\d+$/.test(form.royaltyBps) &&
        isAddr(form.signer) &&
        isAddr(form.projectOwner) &&
        isAddr(form.royaltyReceiver) &&
        isAddr(form.mintFeeReceiver)
      );
    } catch {
      return false;
    }
  }, [form]);

  async function getEvmProvider(): Promise<ethers.BrowserProvider> {
    // Prefer injected; otherwise use our singleton WalletConnect provider
    const eth = getInjectedProvider();
    if (eth) {
      await ensureInjectedOnHedera(eth);
      return new ethers.BrowserProvider(eth);
    }
    const wc = await getWcEvmProvider(); // singleton; no duplicate init
    // If no addr yet, WC will open HashPack popup
    const addr = getWcAddress(wc);
    if (!addr) {
      // Calling request accounts will force wallet UI
      await wc.request({ method: "eth_requestAccounts", params: [] }).catch(() => {});
    }
    return new ethers.BrowserProvider(wc);
  }

  async function deployWithFactory() {
    try {
      setSubmitting(true);
      setError('');
      setSuccessAddr('');

      const provider = await getEvmProvider();
      const signer = await provider.getSigner();

      const supply = BigInt(form.supply);
      const firstId = BigInt(form.firstTokenId);
      const royaltyBps = BigInt(form.royaltyBps);

      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
      const tx = await factory.createProjectPublic(
        form.name.trim(),
        form.symbol.trim(),
        form.baseUri.trim(),
        supply,
        firstId,
        form.signer,
        form.projectOwner,
        royaltyBps,
        form.royaltyReceiver,
        form.mintFeeReceiver
      );

      const rcpt = await tx.wait();

      let newAddr: string | undefined;
      for (const log of rcpt.logs) {
        try {
          const parsed = iface.parseLog({ data: log.data, topics: [...log.topics] });
          if (parsed?.name === 'ProjectCreated') {
            newAddr = parsed.args?.contractAddress as string;
            break;
          }
        } catch {}
      }

      if (!newAddr) throw new Error('Deployed, but could not resolve new contract address from logs.');
      setSuccessAddr(newAddr);
    } catch (e: any) {
      setError(e?.info?.error?.message || e?.shortMessage || e?.message || 'Deployment failed');
    } finally {
      setSubmitting(false);
    }
  }

  const busy = hederaStatus === 'initializing' || hederaStatus === 'connecting';

  return (
    <div className="bg-[#0d0d0d] w-full min-w-[320px] relative flex flex-col">
      <NavigationSection />
      <HeaderSpacer />

      <div className="border-b border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">
        <div className="mx-auto w-full max-w-[1240px] px-6 pt-4 pb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-0"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-white/80" />
            </Button>
            <div>
              <h1 className="text-[28px] leading-none tracking-tight text-[#d5d7e3] font-semibold">
                Self-Created Collection
              </h1>
              <p className="mt-2 text-sm text-white/60">Deploy an ERC-721 collection on Hedera EVM.</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              {hederaConnected ? (
                <>
                  <span className="opacity-80">Hedera:</span>
                  <span className="font-mono">{hederaAccountId}</span>
                </>
              ) : busy ? (
                'Connecting…'
              ) : (
                'Not connected'
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-6 py-10">
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {successAddr ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 grid place-items-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="text-white">
                <h3 className="text-lg font-semibold">Collection Deployed</h3>
                <p className="mt-1 text-sm text-white/70 break-words">
                  Contract address: <span className="font-mono">{successAddr}</span>
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={`https://hashscan.io/mainnet/address/${successAddr}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
                  >
                    <LinkIcon className="h-4 w-4" />
                    View on HashScan
                  </a>
                  <Link
                    to="/marketplace"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#d5d7e3] px-4 py-2 text-sm font-medium text-[#0d0d0d] hover:bg-[#c5c7d3]"
                  >
                    Go to Marketplace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Project Name</label>
                <input
                  className={inputBase}
                  placeholder="Cool Apes"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Symbol</label>
                <input
                  className={inputBase}
                  placeholder="COOL"
                  value={form.symbol}
                  onChange={(e) => setForm((p) => ({ ...p, symbol: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-white/70 mb-2">Description</label>
              <textarea
                rows={3}
                className={inputBase}
                placeholder="A collection of 10,000 unique digital collectibles..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Total Supply</label>
                <input
                  type="number"
                  className={inputBase}
                  value={form.supply}
                  onChange={(e) => setForm((p) => ({ ...p, supply: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">First Token ID</label>
                <input
                  type="number"
                  className={inputBase}
                  value={form.firstTokenId}
                  onChange={(e) => setForm((p) => ({ ...p, firstTokenId: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Royalty (BPS)</label>
                <input
                  type="number"
                  className={inputBase}
                  placeholder="500 = 5%"
                  value={form.royaltyBps}
                  onChange={(e) => setForm((p) => ({ ...p, royaltyBps: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm text-white/70 mb-2">Base URI</label>
              <input
                className={inputBase}
                placeholder="ipfs://your-metadata-cid/"
                value={form.baseUri}
                onChange={(e) => setForm((p) => ({ ...p, baseUri: e.target.value }))}
              />
              <p className="mt-2 text-xs text-white/50">
                Metadata base, e.g. <span className="font-mono">ipfs://CID/</span> so token 1 resolves to{" "}
                <span className="font-mono">ipfs://CID/1</span>
              </p>
            </div>

            <div className="mt-8 h-px w-full bg-white/10" />

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Project Owner (EVM)</label>
                <input
                  className={inputBase}
                  value={form.projectOwner}
                  onChange={(e) => setForm((p) => ({ ...p, projectOwner: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Signer (EVM)</label>
                <input
                  className={inputBase}
                  value={form.signer}
                  onChange={(e) => setForm((p) => ({ ...p, signer: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Royalty Receiver</label>
                <input
                  className={inputBase}
                  value={form.royaltyReceiver}
                  onChange={(e) => setForm((p) => ({ ...p, royaltyReceiver: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Mint Fee Receiver</label>
                <input
                  className={inputBase}
                  value={form.mintFeeReceiver}
                  onChange={(e) => setForm((p) => ({ ...p, mintFeeReceiver: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Button
                className="h-12 rounded-xl bg-[#d5d7e3] text-[#0d0d0d] hover:bg-[#c5c7d3] disabled:opacity-60"
                disabled={!canSubmit || submitting}
                onClick={deployWithFactory}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Deploying…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    Deploy on Hedera
                  </span>
                )}
              </Button>
              {!hederaConnected && (
                <span className="text-sm text-white/60">
                  Approval opens in HashPack (WalletConnect).
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center">
                <ImageIcon className="h-5 w-5 text-white/80" />
              </div>
              <h3 className="text-[#d5d7e3] font-semibold">Preview & Tips</h3>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-white/70 mb-2">Project Image URL</label>
              <input
                className={inputBase}
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
              />
              <div className="mt-4 aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="preview"
                    className="h-full w-full object-cover"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = '0.25')}
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-white/40 text-sm">Image preview</div>
                )}
              </div>
              <p className="mt-3 text-xs text-white/50">
                Use a square image (e.g. 512×512 or 1024×1024) for best results across cards & embeds.
              </p>
            </div>

            <div className="mt-6 h-px w-full bg-white/10" />

            <div className="mt-6 text-sm text-white/70 leading-6">
              <p>
                Deploys via <span className="font-mono">HedraXFactory</span> on Hedera EVM Mainnet (chainId 295).
              </p>
              <p className="mt-2">
                No extension? We open a WalletConnect session so you can approve in HashPack.
              </p>
              <p className="mt-2 text-white/50">
                Factory: <span className="font-mono">{FACTORY_ADDRESS}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <FooterSection />
    </div>
  );
}
