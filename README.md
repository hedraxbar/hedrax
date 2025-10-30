
HedraX is an NFT marketplace and launchpad designed to automate the creation and
maintenance of creator-specific token ecosystems.
When a collection sells out, HedraX automatically launches a fungible token (via HTS) for that
creator’s project and routes a portion of that token’s transaction fees toward repurchasing NFTs
from the floor — ensuring sustained liquidity and community engagement.
The system is composed of three coordinated layers:
• Marketplace Layer – Handles NFT minting, listings, sales, and discovery.
• Automation Layer – Smart contracts that trigger token creation, manage fee routing,
and execute periodic buybacks.
• Ecosystem Layer – APIs, dashboards, and UX components that expose data, analytics,
and controls to users and creators.
this is the certification course taken by our developer aka phillyreigns
https://certs.hashgraphdev.com/4ed12430-2f4c-4900-9c0c-02ced9f1706a.pdf
here is the demo video link of how it works
https://www.youtube.com/watch?v=Myw0BuIke2w
link to the pitch deck
https://drive.google.com/file/d/1LZ7tQ5Ft1065jAkLDqYeAMg9AUEQNkDI/view?usp=drive_link

2. Core Functional Modules
2.1 Marketplace Engine
• Features: Minting, fixed-price listings, bidding, royalties, and transfers.
• Technology:
o Smart contracts for listing and royalty enforcement (HSCS).
o Off-chain caching through PostgreSQL or MongoDB.
o Real-time indexing via Hedera Mirror Node API.
• UX Goals:
o Seamless listing flow (mint → preview → price set → confirm).
o Minimal transaction friction (confirmations < 2 seconds).
o Consistent card-grid UI with responsive filtering and search.
2.2 Creator Launchpad
• Purpose: Low-code interface for creators to deploy NFT collections and opt-in to the
auto-tokenization feature.
• Flow:
1. Upload artwork + metadata.
2. Set supply, price, royalties, and sell-out conditions.
3. Choose “Enable Auto-Tokenization.”
4. Launch collection (mint contract deployed).
• UI Considerations: Progress tracker for setup, real-time mint-status display, dynamic
preview of NFTs.
2.3 Auto-Tokenization Engine
• Trigger: When collection supply = sold-out event detected by backend listener.
• Action: Deploys a fungible HTS token with metadata pulled from the NFT project.
• Default Parameters: Name, symbol, supply cap, and automatic fee routing address.
• Creator Ownership: Admin keys assigned solely to the creator wallet.
• UI Elements: “Token Launched” modal with token details, contract address, and live
market data once trading starts.
2.4 Fee-Routing & Buyback Mechanism
• Core Logic:
o Smart contract intercepts a defined % of each token’s transaction fee.
o Fees accumulate in a Buyback Pool.
o When threshold reached, a Buyback Executor automatically purchases NFTs from
that collection’s floor.
• Data & Tracking:
o Real-time dashboard showing: pool balance, number of NFTs repurchased,
average buy price, and recent transactions.
• UI Design: Simple visual gauge + “Recent Support Buys” list to make the support
mechanism transparent to the community.
2.5 Soft-Staking / Holder Rewards
• Mechanism: Contract checks ownership snapshots at fixed intervals.
• Eligibility: Wallets holding NFTs that are not listed on the marketplace.
• Reward: Distribution of the project’s fungible token proportionate to holding duration.
• UX Requirements:
o “My Rewards” tab showing accrual, claimable amount, and history.
o Optional auto-claim toggle.
2.6 Analytics & Creator Dashboard
• Portfolio analytics: floor price, volume, token buyback stats.
• Token lifecycle metrics: total supply, transactions, liquidity pool status.
• UI style: clean, modular cards; light/dark theme support.
3. Architecture Overview
Frontend
• Stack: React / Next.js + TailwindCSS + TypeScript.
• Wallets Supported: HashPack, Blade Wallet, Kabila Wallet (Hedera JS SDK).
• State Management: Redux Toolkit or Zustand.
• Animations: Framer Motion for smooth onboarding and feedback.
• Design System: Shadcn/UI components, Lucide icons, and consistent 8-px spacing grid.
Backend
• Stack: Node.js (Express) + PostgreSQL.
• Responsibilities:
o User / creator auth sessions.
o Event listeners for NFT sales and collection status.
o Queue system (RabbitMQ / BullMQ) for token launch events.
o API gateway for frontend and third-party integrations.
Smart Contracts / On-Chain Logic
1. NFT Minting Contract – handles collection creation + royalties.
2. Auto Token Generator Contract – deploys fungible HTS token post-sellout.
3. Fee Router Contract – collects % of token trading fees and sends to Buyback Pool.
4. Buyback Executor – purchases NFTs from floor via marketplace API.
5. Soft-Staking Contract – snapshots ownership and distributes rewards.
4. Data Flow Summary
1. Mint Phase: Creator → Launchpad → NFT Minting Contract → Marketplace Listing.
2. Sell-out Detection: Backend listener monitors mirror node events.
3. Token Launch: Trigger Auto Token Generator → create HTS token.
4. Fee Routing: DEX / token transaction → Fee Router → Buyback Pool.
5. Buyback: Executor purchases NFT → sends to Support Vault.
6. Reward Cycle: Soft-Staking contract distributes tokens to eligible holders.
5. Security & Compliance
• Audits: Independent contract audits pre-mainnet.
• Key Management: Creator-only admin keys; HedraX holds temporary deployment rights
during mint only.
• Data Integrity: Hashed metadata storage with content hash validation.
• User Safety: Transaction confirmation modals and clear gas/fee estimates.
6. UI/UX Guidelines
• Design Tone: Clean and neutral so collections stand out.
• Color Palette: Dark backgrounds with accent gradients for buttons and status states.
• Typography: Inter / Satoshi – legible in both light and dark modes.
• Navigation: 3-layer system — Marketplace, Launchpad, Dashboard.
• Responsiveness: Optimized for desktop first; progressive simplification for mobile.
• Accessibility: WCAG 2.1 AA contrast ratios and keyboard navigation support.
7. Scalability & Extensibility
• Modular micro-service architecture — each component deployable independently.
• Supports multi-collection management for one creator.
• Future expansions: cross-chain NFT bridging, DAO modules, fractionalization, analytics
API for third-party tools.
8. Technical Goals
• Provide a modular SDK for creators to integrate HedraX features into external sites.
• Achieve < 2 second average transaction confirmation time.
• Build a fully transparent buyback ledger visible on chain.
• Design a unified dashboard UX balancing technical data and accessibility for creators.
9. Outcome
HedraX will empower developers, designers, and creators to collectively build self-sustaining
NFT economies where:
• Each project owns its own token ecosystem.
• Fees flow back to support NFT value.
• Holders are rewarded automatically.
• The entire experience is fast, transparent, and user-friendly.
HedraX is not merely a marketplace, it’s the infrastructure for the next generation of
autonomous NFT projects on Hedera.
