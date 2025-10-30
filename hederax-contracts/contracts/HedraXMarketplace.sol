// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/// @title HedraX Marketplace (fixed price, HBAR, non-custodial, batch ops)
/// @notice Sellers keep NFTs; marketplace transfers on buy.
///         Supports EIP-2981 royalties, platform fee, pause, and batch list/unlist/price update.
contract HedraXMarketplace is ReentrancyGuard, Pausable, Ownable {
    // ---------- Types ----------
    struct Listing {
        address nft;
        uint256 tokenId;
        address seller;
        uint128 priceWei; // HBAR treated like "wei" in EVM context
        bool active;
    }

    // ---------- Storage ----------
    uint96  public platformFeeBps;     // e.g., 250 = 2.50%
    address public feeRecipient;       // platform fee receiver

    // key: keccak256(nft, tokenId, seller)
    mapping(bytes32 => Listing) public listings;

    // ---------- Events ----------
    event Listed(address indexed nft, uint256 indexed tokenId, address indexed seller, uint128 priceWei);
    event PriceUpdated(address indexed nft, uint256 indexed tokenId, address indexed seller, uint128 newPriceWei);
    event Unlisted(address indexed nft, uint256 indexed tokenId, address indexed seller);
    event Purchased(
        address indexed nft,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 priceWei,
        uint256 platformFee,
        uint256 royaltyPaid,
        address royaltyReceiver
    );

    // ---------- Errors ----------
    error PriceZero();
    error NotOwner();
    error MarketNotApproved();
    error NotListed();
    error AlreadyListed();
    error BadPrice();
    error TransferFailed();
    error FeeTooHigh();
    error NotSeller();
    error OwnershipChanged();
    error LengthMismatch();

    // ---------- Constructor ----------
    constructor(address _feeRecipient, uint96 _platformFeeBps) {
        // OZ v4.x Ownable has no-arg base ctor; set owner manually:
        _transferOwnership(msg.sender);

        if (_platformFeeBps > 1_000) revert FeeTooHigh(); // <= 10%
        feeRecipient = _feeRecipient;
        platformFeeBps = _platformFeeBps;
    }

    // ---------- Admin ----------
    function setFees(address _recipient, uint96 _bps) external onlyOwner {
        if (_recipient == address(0)) revert TransferFailed();
        if (_bps > 1_000) revert FeeTooHigh(); // <= 10%
        feeRecipient = _recipient;
        platformFeeBps = _bps;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ---------- Internals ----------
    function _key(address nft, uint256 tokenId, address seller) internal pure returns (bytes32) {
        return keccak256(abi.encode(nft, tokenId, seller));
    }

    function _isApproved(address nft, uint256 tokenId, address owner) internal view returns (bool) {
        IERC721 erc721 = IERC721(nft);
        return erc721.getApproved(tokenId) == address(this) || erc721.isApprovedForAll(owner, address(this));
    }

    // ERC165: supportsInterface(ERC2981)
    function _supports2981(address nft) internal view returns (bool) {
        (bool ok, bytes memory data) = nft.staticcall(abi.encodeWithSelector(0x01ffc9a7, 0x2a55205a));
        return ok && data.length >= 32 && abi.decode(data, (bool));
    }

    function _royaltyInfo(address nft, uint256 tokenId, uint256 salePrice)
        internal
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        try IERC2981(nft).royaltyInfo(tokenId, salePrice) returns (address r, uint256 a) {
            return (r, a);
        } catch {
            return (address(0), 0);
        }
    }

    // ---------- Seller actions (single) ----------
    function list(address nft, uint256 tokenId, uint128 priceWei) external whenNotPaused nonReentrant {
        if (priceWei == 0) revert PriceZero();

        IERC721 erc721 = IERC721(nft);
        if (erc721.ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (!_isApproved(nft, tokenId, msg.sender)) revert MarketNotApproved();

        bytes32 k = _key(nft, tokenId, msg.sender);
        if (listings[k].active) revert AlreadyListed();

        listings[k] = Listing({
            nft: nft,
            tokenId: tokenId,
            seller: msg.sender,
            priceWei: priceWei,
            active: true
        });

        emit Listed(nft, tokenId, msg.sender, priceWei);
    }

    function updatePrice(address nft, uint256 tokenId, uint128 newPriceWei) external whenNotPaused nonReentrant {
        if (newPriceWei == 0) revert PriceZero();
        bytes32 k = _key(nft, tokenId, msg.sender);
        Listing storage l = listings[k];
        if (!l.active) revert NotListed();
        if (l.seller != msg.sender) revert NotSeller();
        l.priceWei = newPriceWei;
        emit PriceUpdated(nft, tokenId, msg.sender, newPriceWei);
    }

    function unlist(address nft, uint256 tokenId) external nonReentrant {
        bytes32 k = _key(nft, tokenId, msg.sender);
        Listing storage l = listings[k];
        if (!l.active) revert NotListed();
        if (l.seller != msg.sender) revert NotSeller();
        l.active = false;
        emit Unlisted(nft, tokenId, msg.sender);
    }

    // ---------- Seller actions (batch) ----------
    function listBatch(address[] calldata nfts, uint256[] calldata tokenIds, uint128[] calldata pricesWei)
        external
        whenNotPaused
        nonReentrant
    {
        uint256 n = nfts.length;
        if (tokenIds.length != n || pricesWei.length != n) revert LengthMismatch();

        for (uint256 i = 0; i < n; i++) {
            address nft = nfts[i];
            uint256 tokenId = tokenIds[i];
            uint128 priceWei = pricesWei[i];
            if (priceWei == 0) revert PriceZero();

            IERC721 erc721 = IERC721(nft);
            if (erc721.ownerOf(tokenId) != msg.sender) revert NotOwner();
            if (!_isApproved(nft, tokenId, msg.sender)) revert MarketNotApproved();

            bytes32 k = _key(nft, tokenId, msg.sender);
            if (listings[k].active) revert AlreadyListed();

            listings[k] = Listing({ nft: nft, tokenId: tokenId, seller: msg.sender, priceWei: priceWei, active: true });
            emit Listed(nft, tokenId, msg.sender, priceWei);
        }
    }

    function updatePriceBatch(address[] calldata nfts, uint256[] calldata tokenIds, uint128[] calldata newPricesWei)
        external
        whenNotPaused
        nonReentrant
    {
        uint256 n = nfts.length;
        if (tokenIds.length != n || newPricesWei.length != n) revert LengthMismatch();

        for (uint256 i = 0; i < n; i++) {
            if (newPricesWei[i] == 0) revert PriceZero();
            bytes32 k = _key(nfts[i], tokenIds[i], msg.sender);
            Listing storage l = listings[k];
            if (!l.active) revert NotListed();
            if (l.seller != msg.sender) revert NotSeller();
            l.priceWei = newPricesWei[i];
            emit PriceUpdated(nfts[i], tokenIds[i], msg.sender, newPricesWei[i]);
        }
    }

    function unlistBatch(address[] calldata nfts, uint256[] calldata tokenIds) external nonReentrant {
        uint256 n = nfts.length;
        if (tokenIds.length != n) revert LengthMismatch();

        for (uint256 i = 0; i < n; i++) {
            bytes32 k = _key(nfts[i], tokenIds[i], msg.sender);
            Listing storage l = listings[k];
            if (!l.active) revert NotListed();
            if (l.seller != msg.sender) revert NotSeller();
            l.active = false;
            emit Unlisted(nfts[i], tokenIds[i], msg.sender);
        }
    }

    // ---------- Buyer action ----------
    function buy(address nft, uint256 tokenId, address seller) external payable whenNotPaused nonReentrant {
        bytes32 k = _key(nft, tokenId, seller);
        Listing storage l = listings[k];
        if (!l.active) revert NotListed();
        if (msg.value != l.priceWei) revert BadPrice();

        // Ensure seller still owns the token at purchase time
        IERC721 erc721 = IERC721(l.nft);
        if (erc721.ownerOf(l.tokenId) != l.seller) revert OwnershipChanged();
        if (!_isApproved(l.nft, l.tokenId, l.seller)) revert MarketNotApproved();

        // Compute fees
        uint256 platformFee = (uint256(l.priceWei) * platformFeeBps) / 10_000;
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);

        if (_supports2981(l.nft)) {
            (royaltyReceiver, royaltyAmount) = _royaltyInfo(l.nft, l.tokenId, l.priceWei);
            if (royaltyAmount + platformFee > l.priceWei) {
                royaltyAmount = 0;
                royaltyReceiver = address(0);
            }
        }

        // Effects
        l.active = false;

        // Payouts
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool okR, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            if (!okR) revert TransferFailed();
        }

        if (platformFee > 0 && feeRecipient != address(0)) {
            (bool okF, ) = payable(feeRecipient).call{value: platformFee}("");
            if (!okF) revert TransferFailed();
        }

        uint256 sellerProceeds = uint256(l.priceWei) - royaltyAmount - platformFee;
        (bool okS, ) = payable(l.seller).call{value: sellerProceeds}("");
        if (!okS) revert TransferFailed();

        // Transfer the NFT last
        erc721.safeTransferFrom(l.seller, msg.sender, l.tokenId);

        emit Purchased(l.nft, l.tokenId, msg.sender, l.seller, l.priceWei, platformFee, royaltyAmount, royaltyReceiver);
    }

    // ---------- Maintenance helper (optional but useful) ----------
    /// @notice Clean a listing if the seller no longer owns the NFT.
    function clean(address nft, uint256 tokenId, address seller) external {
        bytes32 k = _key(nft, tokenId, seller);
        Listing storage l = listings[k];
        if (!l.active) revert NotListed();
        if (IERC721(nft).ownerOf(tokenId) != seller) {
            l.active = false;
            emit Unlisted(nft, tokenId, seller);
        }
    }

    // ---------- Quote helper for FE ----------
    /// @notice View exact fee/royalty split for a live listing.
    function quote(address nft, uint256 tokenId, address seller)
        external
        view
        returns (
            uint256 priceWei,
            uint256 platformFee,
            address royaltyReceiver,
            uint256 royaltyAmount,
            uint256 sellerProceeds
        )
    {
        Listing storage l = listings[_key(nft, tokenId, seller)];
        if (!l.active) revert NotListed();

        uint256 _platformFee = (uint256(l.priceWei) * platformFeeBps) / 10_000;

        address rr = address(0);
        uint256 ra = 0;
        if (_supports2981(l.nft)) {
            (rr, ra) = _royaltyInfo(l.nft, l.tokenId, l.priceWei);
            if (ra + _platformFee > l.priceWei) { rr = address(0); ra = 0; }
        }

        uint256 proceeds = uint256(l.priceWei) - _platformFee - ra;
        return (l.priceWei, _platformFee, rr, ra, proceeds);
    }

    // Accept HBAR refunds if any
    receive() external payable {}
}
