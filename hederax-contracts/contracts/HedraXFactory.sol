// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IHedraXERC721C {
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
    ) external;
}

contract HedraXFactory is Ownable {
    using Clones for address;

    address public implementation;

    struct ProjectInfo {
        address contractAddress;
        string  name;
        string  symbol;
        string  baseUri;
        uint256 supply;
        uint256 firstTokenId;
        address owner;
        address signer;
        address royaltyReceiver;
        uint96  royaltyBps;
        address mintFeeReceiver;
        uint256 createdAt;
        bool    featured;     // true if deployed by HedraX (owner-only path) or later verified
        address createdBy;    // msg.sender who called the factory
    }

    ProjectInfo[] public projects;
    mapping(address => bool) public isProject;

    event ProjectCreated(
        uint256 indexed index,
        address indexed contractAddress,
        string name,
        string symbol,
        uint256 supply,
        address owner,
        address signer,
        bool featured,
        address createdBy
    );

    constructor(address _implementation) {
        require(_implementation != address(0), "impl=0");
        implementation = _implementation;
    }

    function setImplementation(address _impl) external onlyOwner {
        require(_impl != address(0), "impl=0");
        implementation = _impl;
    }

    /// @notice Permissionless: anyone can launch their own project.
    function createProjectPublic(
        string memory _name,
        string memory _symbol,
        string memory _baseUri,
        uint256 _supply,
        uint256 _firstTokenId,
        address _signer,
        address _projectOwner,
        uint96  _royaltyFeeNumerator,
        address _royaltyReceiver,
        address _mintFeeReceiver
    ) external returns (address project) {
        require(_projectOwner != address(0), "owner=0");
        require(_signer != address(0), "signer=0");
        require(_royaltyReceiver != address(0), "royalty=0");
        require(_mintFeeReceiver != address(0), "feeRecv=0");

        project = implementation.clone();

        IHedraXERC721C(project).initialize(
            _name,
            _symbol,
            _baseUri,
            _supply,
            _firstTokenId,
            _signer,
            _projectOwner,
            _royaltyFeeNumerator,
            _royaltyReceiver,
            _mintFeeReceiver
        );

        projects.push(ProjectInfo({
            contractAddress: project,
            name: _name,
            symbol: _symbol,
            baseUri: _baseUri,
            supply: _supply,
            firstTokenId: _firstTokenId,
            owner: _projectOwner,
            signer: _signer,
            royaltyReceiver: _royaltyReceiver,
            royaltyBps: _royaltyFeeNumerator,
            mintFeeReceiver: _mintFeeReceiver,
            createdAt: block.timestamp,
            featured: false,
            createdBy: msg.sender
        }));
        isProject[project] = true;

        emit ProjectCreated(
            projects.length - 1,
            project,
            _name,
            _symbol,
            _supply,
            _projectOwner,
            _signer,
            false,
            msg.sender
        );
    }

    /// @notice HedraX-curated: owner-only deploy that marks the project as featured.
    function createProjectFeatured(
        string memory _name,
        string memory _symbol,
        string memory _baseUri,
        uint256 _supply,
        uint256 _firstTokenId,
        address _signer,
        address _projectOwner,
        uint96  _royaltyFeeNumerator,
        address _royaltyReceiver,
        address _mintFeeReceiver
    ) external onlyOwner returns (address project) {
        project = implementation.clone();

        IHedraXERC721C(project).initialize(
            _name,
            _symbol,
            _baseUri,
            _supply,
            _firstTokenId,
            _signer,
            _projectOwner,
            _royaltyFeeNumerator,
            _royaltyReceiver,
            _mintFeeReceiver
        );

        projects.push(ProjectInfo({
            contractAddress: project,
            name: _name,
            symbol: _symbol,
            baseUri: _baseUri,
            supply: _supply,
            firstTokenId: _firstTokenId,
            owner: _projectOwner,
            signer: _signer,
            royaltyReceiver: _royaltyReceiver,
            royaltyBps: _royaltyFeeNumerator,
            mintFeeReceiver: _mintFeeReceiver,
            createdAt: block.timestamp,
            featured: true,              // <- featured when HedraX deploys
            createdBy: msg.sender
        }));
        isProject[project] = true;

        emit ProjectCreated(
            projects.length - 1,
            project,
            _name,
            _symbol,
            _supply,
            _projectOwner,
            _signer,
            true,
            msg.sender
        );
    }

    /// @notice HedraX can verify/feature an existing project later (toggle).
    function setFeatured(uint256 index, bool value) external onlyOwner {
        require(index < projects.length, "bad index");
        projects[index].featured = value;
    }

    function projectsCount() external view returns (uint256) {
        return projects.length;
    }
}
