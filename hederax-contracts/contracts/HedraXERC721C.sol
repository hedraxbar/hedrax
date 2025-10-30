// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@limitbreak/creator-token-standards/src/erc721c/ERC721C.sol";
import "@limitbreak/creator-token-standards/src/programmable-royalties/BasicRoyalties.sol";
import "@limitbreak/creator-token-standards/src/access/OwnableInitializable.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

import "./ERC721/phaseMint.sol";
import "./utils/PaymentSplitter.sol";
import "./utils/ImmediateRoyaltySplitter.sol";
import "./utils/TradingEnabler.sol";
import "./interfaces/IExternalMint721.sol";

/// @title HedraX ERC721C (Limit Break style) with one-time EIP-712 signatures
/// @notice Enforces per-phase/per-wallet caps via PhaseMint and requires backend signatures.
///         Users pay gas themselves. Nonces + deadlines prevent replay.
/// @dev Initializable (use with factory clones). Do not call initialize() twice.
contract HedraXERC721C is
    ERC721CInitializable,
    BasicRoyaltiesInitializable,
    OwnableInitializable,
    ReentrancyGuard,
    PhaseMint,
    PaymentSplitter,
    ImmediateRoyaltySplitter,
    TradingEnabler
{
    using ECDSA for bytes32;

    // -------- Storage --------
    string public baseURI;
    uint256 public supply;
    uint256 public firstTokenId;
    uint256 public minted;
    bool public burnEnabled;

    address public externalMintContract; // optional: forward actual minting to external contract
    address public mintFeeReceiver;      // receives per-token mint fee
    address public signer;               // backend signer (EIP-712)

    // one-time signature nonces
    mapping(bytes32 => bool) public usedNonces;

    // EIP-712 domain (immutable post-init)
    bytes32 private _DOMAIN_SEPARATOR;
    bytes32 private constant _EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    struct MintAuth {
        address wallet;
        uint256 amount;
        bytes32 phaseID;
        uint256 price;        // per token
        uint256 mintFee;      // per token
        uint256 maxPerTx;     // echoed caps (should be <= on-chain caps)
        uint256 maxPerUser;
        uint256 maxPerPhase;
        bytes32 nonce;        // one-time
        uint256 deadline;     // unix seconds
    }

    bytes32 public constant MINT_TYPEHASH = keccak256(
        "MintAuth(address wallet,uint256 amount,bytes32 phaseID,uint256 price,uint256 mintFee,uint256 maxPerTx,uint256 maxPerUser,uint256 maxPerPhase,bytes32 nonce,uint256 deadline)"
    );

    event Minted(address indexed wallet, bytes32 indexed phaseID, uint256 amount, uint256 paid);
    event MetadataUpdate(uint256 _tokenId);
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    // Empty ctor (we use initialize via factory)
    constructor() ReentrancyGuard() ERC721("", "") {}

    bool private _initialized;

    /// @notice One-time initializer called by factory (or direct deploy).
    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _baseUri,
        uint256 _supply,
        uint256 _firstTokenId,
        address _signer,
        address _owner,
        uint96 _royaltyFeeNumerator,
        address _royaltyReceiver,
        address _mintFeeReceiver
    ) external {
        require(!_initialized, "Already initialized");
        _initialized = true;

        require(_supply > 0, "Supply=0");
        require(_signer != address(0), "Bad signer");
        require(_owner != address(0), "Bad owner");
        require(bytes(_baseUri).length > 0, "Bad URI");
        require(_royaltyReceiver != address(0), "Bad royalty recv");
        require(_mintFeeReceiver != address(0), "Bad fee recv");

        initializeOwner(msg.sender);
        initializeERC721(_name, _symbol);
        transferOwnership(_owner);

        _setDefaultRoyalty(_royaltyReceiver, _royaltyFeeNumerator);

        signer = _signer;
        supply = _supply;
        minted = 0;
        baseURI = _baseUri;
        firstTokenId = _firstTokenId;
        mintFeeReceiver = _mintFeeReceiver;
        burnEnabled = false;

        _DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                _EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("HedraXERC721C")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // -------- EIP-712 hashing --------
    function _hashMintAuth(MintAuth calldata a) internal view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            MINT_TYPEHASH,
            a.wallet, a.amount, a.phaseID, a.price, a.mintFee, a.maxPerTx, a.maxPerUser, a.maxPerPhase, a.nonce, a.deadline
        ));
        return keccak256(abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, structHash));
    }

    // -------- Mint --------
    function mint(MintAuth calldata a, bytes calldata sig)
        external
        payable
        nonReentrant
    {
        require(block.timestamp <= a.deadline, "Auth expired");
        require(!usedNonces[a.nonce], "Nonce used");
        usedNonces[a.nonce] = true;

        require(msg.sender == a.wallet, "Sender!=wallet");
        require(a.amount > 0, "Amount=0");
        require(totalSupply() + a.amount <= supply, "Max supply");

        // verify backend signature (chain+contract bound)
        bytes32 digest = _hashMintAuth(a);
        require(digest.recover(sig) == signer, "Bad sig");

        // payments
        uint256 totalPrice = a.price * a.amount;
        uint256 totalFee = a.mintFee * a.amount;
        require(msg.value == totalPrice + totalFee, "Bad payment");

        // enforce caps via PhaseMint (per-tx / per-user / per-phase)
        _mintPhase(a.wallet, a.amount, a.phaseID, a.maxPerTx, a.maxPerUser, a.maxPerPhase);

        // mint
        if (externalMintContract != address(0)) {
            minted += a.amount;
            IExternalMint721(externalMintContract).mint(a.wallet, a.amount);
        } else {
            uint256 tokenId = totalSupply() + firstTokenId;
            minted += a.amount;
            for (uint256 i = 0; i < a.amount; i++) {
                _safeMint(a.wallet, tokenId++);
            }
        }

        // route mint fee immediately
        if (totalFee > 0) {
            (bool ok,) = payable(mintFeeReceiver).call{value: totalFee}("");
            require(ok, "Fee xfer failed");
        }

        emit Minted(a.wallet, a.phaseID, a.amount, msg.value);
    }

    // -------- Views --------
    function totalSupply() public view returns (uint256) { return minted; }
    function _baseURI() internal view override returns (string memory) { return baseURI; }

    // -------- Admin --------
    function setBaseURI(string memory _uri) external { _requireCallerIsContractOwner(); baseURI = _uri; }
    function setSigner(address _signer) external { _requireCallerIsContractOwner(); require(_signer!=address(0),"signer=0"); signer=_signer; }
    function setSupply(uint256 _new) external { _requireCallerIsContractOwner(); require(_new >= totalSupply(), "lt minted"); supply = _new; }
    function setDefaultRoyalty(address recv, uint96 fee) external { _requireCallerIsContractOwner(); _setDefaultRoyalty(recv, fee); }
    function setTokenRoyalty(uint256 tokenId, address recv, uint96 fee) external { _requireCallerIsContractOwner(); _setTokenRoyalty(tokenId, recv, fee); }
    function setBurnEnabled(bool e) external { _requireCallerIsContractOwner(); burnEnabled = e; }
    function setExternalMintContract(address ext) external { _requireCallerIsContractOwner(); externalMintContract = ext; }
    function setMintFeeReceiver(address recv) external { _requireCallerIsContractOwner(); require(recv!=address(0),"feeRecv=0"); mintFeeReceiver = recv; }

    // ---- Treasury & Withdrawals ----
    address public treasury;

    function setTreasury(address t) external {
        _requireCallerIsContractOwner();
        require(t != address(0), "treasury=0");
        treasury = t;
    }

    function withdrawAll() external nonReentrant {
        _requireCallerIsContractOwner();
        require(treasury != address(0), "treasury not set");
        uint256 bal = address(this).balance;
        require(bal > 0, "No funds");
        (bool ok,) = payable(treasury).call{value: bal}("");
        require(ok, "withdraw failed");
    }

    function withdraw(address payable to, uint256 amount) external nonReentrant {
        _requireCallerIsContractOwner();
        require(to != address(0), "to=0");
        require(amount > 0 && amount <= address(this).balance, "bad amount");
        (bool ok,) = to.call{value: amount}("");
        require(ok, "withdraw failed");
    }

    function burn(uint256 tokenId) external {
        require(burnEnabled, "Burn disabled");
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Not approved");
        _burn(tokenId);
    }

    // trading gate
    function enableTrading() external onlyOwner { _enableTrading(); }
    function setApprovalForAll(address op, bool appr) public override tradingEnabledOnly { super.setApprovalForAll(op, appr); }
    function approve(address to, uint256 tokenId) public override tradingEnabledOnly { super.approve(to, tokenId); }

    // metadata refresh
    function refreshMetadata() external { emit BatchMetadataUpdate(0, type(uint256).max); }

    // ERC165
    function supportsInterface(bytes4 interfaceId)
        public view virtual override(ERC721CInitializable, ERC2981)
        returns (bool)
    {
        return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
    }
}
