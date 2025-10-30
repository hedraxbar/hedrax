// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

contract HedraXPumpToken is ERC20, Ownable2Step, ReentrancyGuard, Pausable {
    // ----- Modes -----
    uint256 public constant MODE_NORMAL                = 0; // free transfers; curve disabled
    uint256 public constant MODE_TRANSFER_RESTRICTED   = 1; // restrict transfers during migration
    uint256 public constant MODE_TRANSFER_CONTROLLED   = 2; // (optional) owner-controlled transfers
    uint256 public constant MODE_CURVE_TRADING         = 3; // internal AMM enabled (startup)
    uint256 public mode;

    // ----- Fees -----
    uint256 public constant FEE_BPS = 100;     // 1%
    uint256 public constant BPS_DENOM = 10_000;

    // ----- Supply / Treasury -----
    uint256 public immutable maxSupply;        // e.g., 1_000_000_000e18
    address public feeRecipient;               // collects the 1% curve fee

    // ----- Bonding curve (linear) -----
    // price (HBAR wei) = basePrice + slope * sold
    // sold/token amounts are in 1e18
    uint256 public basePrice;                  // wei per token at sold=0
    uint256 public slope;                      // wei increase per token sold

    // ----- Accounting -----
    uint256 public tokensSold;                 // tokens sold via curve (1e18 units)
    uint256 public baseRaised;                 // total HBAR (wei) raised by buys (net of seller payouts)

    // ----- Migration trigger: fixed at 100,000 HBAR -----
    // In EVM-style units this is `100_000 ether` (18 decimals).
    uint256 public constant MIGRATION_THRESHOLD_WEI = 100_000 ether;
    bool public migrationReady;

    // ----- Events -----
    event CurveTrade(address indexed user, bool isBuy, uint256 tokenAmount, uint256 paidOrReceived, uint256 fee);
    event MigrationReady(uint256 baseRaised, uint256 tokenReserveForLP);
    event FinalizedMigration(address indexed executor);
    event ModeChanged(uint256 newMode);
    event FeeRecipientChanged(address indexed to);
    event CurveParamsChanged(uint256 basePrice, uint256 slope);
    event Paused();
    event Unpaused();

    error TransfersRestricted();
    error CurveDisabled();
    error InsufficientOutput();
    error NotReadyToMigrate();
    error AlreadyMigrated();
    error BadValue();
    error BadMode();

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,      // recommend 1_000_000_000e18 to mirror pump-style presets
        address _owner,
        address _feeRecipient,
        uint256 _basePrice,        // wei per token at start (configure off-chain)
        uint256 _slope             // wei increase per token sold (configure off-chain)
    ) ERC20(_name, _symbol) {
        require(_owner != address(0), "owner=0");
        require(_feeRecipient != address(0), "feeRecipient=0");
        require(_totalSupply > 0, "supply=0");

        maxSupply = _totalSupply;
        _mint(address(this), _totalSupply);   // contract inventory sells on the curve
        _transferOwnership(_owner);

        feeRecipient = _feeRecipient;
        basePrice    = _basePrice;
        slope        = _slope;

        mode = MODE_CURVE_TRADING;            // start with curve trading; no external LP needed
        emit ModeChanged(mode);
        emit CurveParamsChanged(_basePrice, _slope);
        emit FeeRecipientChanged(_feeRecipient);
    }

    // ---------- Admin ----------
    function setFeeRecipient(address to) external onlyOwner {
        require(to != address(0), "to=0");
        feeRecipient = to;
        emit FeeRecipientChanged(to);
    }

    /// Adjust the linear curve params (preferably before heavy trading).
    function setCurveParams(uint256 _basePrice, uint256 _slope) external onlyOwner {
        basePrice = _basePrice;
        slope     = _slope;
        emit CurveParamsChanged(_basePrice, _slope);
    }

    function setMode(uint256 v) external onlyOwner {
        if (mode == MODE_NORMAL && v != MODE_NORMAL) revert BadMode();
        if (migrationReady && v == MODE_CURVE_TRADING) revert BadMode();
        mode = v;
        emit ModeChanged(v);
    }

    function pause() external onlyOwner { _pause(); emit Paused(); }
    function unpause() external onlyOwner { _unpause(); emit Unpaused(); }

    // ---------- Pricing (linear bonding curve) ----------
    function _buyQuote(uint256 sold, uint256 amount) internal view returns (uint256) {
        uint256 a = amount;
        // sum_{i=0..a-1} (base + slope*(sold+i)) = a*base + slope*(a*sold + a*(a-1)/2)
        return a * basePrice + slope * (a * sold + (a * (a - 1)) / 2);
    }

    function _sellQuote(uint256 sold, uint256 amount) internal view returns (uint256) {
        // sum of last `amount` prices: a*base + slope*(a*(sold-1) - (a-1)*a/2)
        uint256 a = amount;
        return a * basePrice + slope * (a * (sold - 1) - (a * (a - 1)) / 2);
    }

    // Frontend helpers
    function buyQuote(uint256 tokenAmount) external view returns (uint256 gross, uint256 fee, uint256 net) {
        uint256 cost = _buyQuote(tokensSold, tokenAmount);
        uint256 f = (cost * FEE_BPS) / BPS_DENOM;
        return (cost, f, cost + f);
    }

    function sellQuote(uint256 tokenAmount) external view returns (uint256 gross, uint256 fee, uint256 net) {
        require(tokenAmount <= tokensSold, "excess");
        uint256 out = _sellQuote(tokensSold, tokenAmount);
        uint256 f = (out * FEE_BPS) / BPS_DENOM;
        return (out, f, out - f);
    }

    // ---------- Curve trading (HBAR in/out) ----------
    /// @notice Buy `tokenAmount` from the bonding curve. Pass a cost cap to guard slippage.
    /// @param tokenAmount Exact token amount (1e18 units)
    /// @param maxCostWei  Max HBAR (wei) you're willing to pay (cost + fee)
    function buy(uint256 tokenAmount, uint256 maxCostWei) external payable nonReentrant whenNotPaused {
        if (mode != MODE_CURVE_TRADING || migrationReady) revert CurveDisabled();
        require(tokenAmount > 0, "amt=0");

        uint256 cost = _buyQuote(tokensSold, tokenAmount);
        uint256 fee  = (cost * FEE_BPS) / BPS_DENOM;
        uint256 totalIn = cost + fee;

        require(totalIn <= maxCostWei, "slippage");
        if (msg.value != totalIn) revert BadValue();

        _transfer(address(this), msg.sender, tokenAmount);
        tokensSold += tokenAmount;
        baseRaised += cost;

        if (fee > 0) {
            (bool ok, ) = payable(feeRecipient).call{value: fee}("");
            require(ok, "fee xfer");
        }

        emit CurveTrade(msg.sender, true, tokenAmount, totalIn, fee);

        // latch migration at 100,000 HBAR (EVM 18-dec units)
        if (!migrationReady && baseRaised >= MIGRATION_THRESHOLD_WEI) {
            migrationReady = true;
            mode = MODE_TRANSFER_RESTRICTED;
            emit ModeChanged(mode);
            emit MigrationReady(baseRaised, balanceOf(address(this)));
        }
    }

    function sell(uint256 tokenAmount, uint256 minHbarOut) external nonReentrant whenNotPaused {
        if (mode != MODE_CURVE_TRADING || migrationReady) revert CurveDisabled();
        require(tokenAmount > 0, "amt=0");
        require(tokenAmount <= tokensSold, "excess");

        uint256 out = _sellQuote(tokensSold, tokenAmount);
        uint256 fee = (out * FEE_BPS) / BPS_DENOM;
        uint256 net = out - fee;
        if (net < minHbarOut) revert InsufficientOutput();

        _transfer(msg.sender, address(this), tokenAmount);

        tokensSold -= tokenAmount;
        baseRaised = out > baseRaised ? 0 : baseRaised - out;

        if (fee > 0) {
            (bool okf, ) = payable(feeRecipient).call{value: fee}("");
            require(okf, "fee xfer");
        }
        (bool ok, ) = payable(msg.sender).call{value: net}("");
        require(ok, "refund");

        emit CurveTrade(msg.sender, false, tokenAmount, net, fee);
    }

    // ---------- Migration lifecycle ----------
    /// Call this AFTER your server seeds DEX liquidity with all baseRaised + your chosen token amount.
    function finalizeMigration() external onlyOwner {
        if (!migrationReady) revert NotReadyToMigrate();
        if (mode == MODE_NORMAL) revert AlreadyMigrated();
        mode = MODE_NORMAL;
        emit ModeChanged(mode);
        emit FinalizedMigration(msg.sender);
    }

    // ---------- Owner helpers for the migration job ----------
    function withdrawBase(address payable to, uint256 amount) external onlyOwner {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "hbar xfer");
    }

    function withdrawTokens(address to, uint256 amount) external onlyOwner {
        _transfer(address(this), to, amount);
    }

    // ---------- ERC20 transfer policy ----------
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        if (mode == MODE_TRANSFER_RESTRICTED) {
            if (from != address(0) && to != address(0) && msg.sender != owner()) {
                revert TransfersRestricted();
            }
        } else if (mode == MODE_TRANSFER_CONTROLLED) {
            if (from != address(0) && to != address(0)) {
                if (from != owner() && to != owner()) revert TransfersRestricted();
            }
        }
        super._update(from, to, amount);
    }

    // ---------- Views ----------
    function curveActive() external view returns (bool) {
        return (mode == MODE_CURVE_TRADING) && !migrationReady;
    }

    function tokenReserve() external view returns (uint256) {
        return balanceOf(address(this));
    }

    receive() external payable {}
}
