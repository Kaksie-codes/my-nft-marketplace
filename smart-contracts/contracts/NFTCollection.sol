// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ERC721 with per-token metadata storage (tokenURI)
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// ERC2981 = NFT royalty standard
import "@openzeppelin/contracts/token/common/ERC2981.sol";

// Ownable gives us ownership + onlyOwner modifier
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTCollection
 * @notice One contract = one NFT collection
 *
 * FEATURES:
 * - Mint permissions (owner / public / collaborators)
 * - Optional mint fee (ETH)
 * - ERC2981 royalties
 *
 * IMPORTANT FOR STUDENTS:
 * - The factory creates this contract
 * - This contract controls ALL rules for its NFTs
 */
contract NFTCollection is ERC721URIStorage, ERC2981, Ownable {

    // Counter for token IDs
    uint256 private _tokenIds;

    // ======== MINT CONTROL ========

    // If true, anyone can mint
    bool public publicMintEnabled;

    // Optional mint price (in wei)
    uint256 public mintPrice;

    // Addresses allowed to mint even if public mint is disabled
    mapping(address => bool) public collaborators;

    // ======== EVENTS ========

    // Emitted whenever an NFT is minted
    event NFTMinted(
        address indexed minter,
        uint256 indexed tokenId,
        string tokenURI
    );

    // ======== CONSTRUCTOR ========

    /**
     * @param name_ Collection name (e.g. "Cosmic Art")
     * @param symbol_ Collection symbol (e.g. "COSM")
     */
    constructor(
        string memory name_,
        string memory symbol_
    )
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {}

    // ======== ADMIN FUNCTIONS (ONLY OWNER) ========

    /**
     * @notice Enable or disable public minting
     */
    function setPublicMint(bool enabled) external onlyOwner {
        publicMintEnabled = enabled;
    }

    /**
     * @notice Set the mint price (in wei)
     * Example: 0.01 ETH = 0.01 * 1e18
     */
    function setMintPrice(uint256 price) external onlyOwner {
        mintPrice = price;
    }

    /**
     * @notice Add or remove a collaborator
     * Collaborators can mint even if public mint is disabled
     */
    function setCollaborator(address user, bool allowed)
        external
        onlyOwner
    {
        collaborators[user] = allowed;
    }

    /**
     * @notice Set royalty information (ERC2981)
     * @param receiver Who receives royalties
     * @param feeNumerator Royalty percentage in basis points
     * Example: 500 = 5%, 1000 = 10%
     */
    function setRoyalties(address receiver, uint96 feeNumerator)
        external
        onlyOwner
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Withdraw ETH collected from minting fees
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // ======== MINT FUNCTION ========

    /**
     * @notice Mint a new NFT into this collection
     * @param tokenURI Metadata URI (IPFS / Arweave)
     *
     * RULES:
     * - Caller must be owner OR collaborator OR public mint must be enabled
     * - If mintPrice > 0, correct ETH amount must be sent
     */
    function mintNFT(string memory tokenURI)
        external
        payable
        returns (uint256)
    {
        // Check mint permission
        require(
            msg.sender == owner() ||
            publicMintEnabled ||
            collaborators[msg.sender],
            "Minting not allowed"
        );

        // Check mint fee
        require(msg.value == mintPrice, "Incorrect ETH amount");

        // Increment token counter
        _tokenIds += 1;
        uint256 newTokenId = _tokenIds;

        // Mint NFT to caller
        _safeMint(msg.sender, newTokenId);

        // Set metadata
        _setTokenURI(newTokenId, tokenURI);

        // Emit event for frontend / indexers
        emit NFTMinted(msg.sender, newTokenId, tokenURI);

        return newTokenId;
    }

    // ======== VIEW FUNCTIONS ========

    /**
     * @notice Total NFTs minted in this collection
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIds;
    }

    // ======== OVERRIDES ========

    /**
     * @dev Required override for ERC2981 compatibility
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
