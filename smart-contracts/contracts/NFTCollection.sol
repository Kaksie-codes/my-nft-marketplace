// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  IMPORTS
// ============================================================

// ERC721URIStorage extends ERC721 to allow storing a unique
// metadata URI per token. This is how each NFT points to its
// image, name, and attributes stored on IPFS or Arweave.
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// ERC2981 is the NFT Royalty Standard.
// It lets the original creator receive a % of every secondary sale.
// Marketplaces that support ERC2981 will automatically pay royalties.
import "@openzeppelin/contracts/token/common/ERC2981.sol";

// Ownable gives us an `owner` variable and the `onlyOwner` modifier.
// Only the collection owner can change settings like mint price,
// collaborators, royalties, etc.
import "@openzeppelin/contracts/access/Ownable.sol";


// ============================================================
//  CONTRACT
// ============================================================

/**
 * @title NFTCollection
 *
 * @notice Represents a single NFT collection.
 *         One deployed contract = one collection.
 *         The NFTCollectionFactory deploys this contract on behalf of users.
 *
 * FEATURES:
 * ✅ ERC721 standard NFTs with per-token metadata (tokenURI)
 * ✅ ERC2981 royalty support for secondary sales
 * ✅ Flexible mint permissions: owner, collaborators, or public
 * ✅ Optional mint fee in ETH
 * ✅ Max supply cap to protect collection value
 * ✅ Per-wallet mint limit to prevent one address minting everything
 * ✅ On-chain category storage per NFT (Art, Music, Photography, etc.)
 *
 * ARCHITECTURE NOTE FOR STUDENTS:
 * --------------------------------
 * Category is stored directly on-chain in a mapping.
 * This means:
 *  - You can query the category of any NFT directly from the blockchain
 *  - Your Node.js backend can read it from the NFTMinted event and save it to Supabase
 *  - No backend needed to test — works directly in Remix
 *  - When your backend generates metadata JSON (for IPFS), category will also
 *    live inside the metadata attributes as a standard NFT trait
 */
contract NFTCollection is ERC721URIStorage, ERC2981, Ownable {

    // ============================================================
    //  STATE VARIABLES
    // ============================================================

    // Tracks the ID of the last minted token.
    // Token IDs start at 1 (not 0) because 0 is the default for
    // uninitialized uint256 values, which could cause confusion.
    uint256 private _tokenIds;

    // Maximum number of NFTs that can ever exist in this collection.
    // Set in the constructor. Protects the collection's scarcity.
    // Example: 10,000 = classic PFP collection size
    uint256 public maxSupply;

    // Maximum number of NFTs one wallet can mint.
    // Prevents one person from minting the entire supply.
    // Can be updated by the owner after deployment.
    // Set to 0 to disable the per-wallet limit.
    uint256 public maxPerWallet;

    // Maximum royalty the owner is allowed to set.
    // 1000 basis points = 10%. This protects buyers from
    // the owner setting an unreasonably high royalty.
    uint96 public constant MAX_ROYALTY_BPS = 1000;

    // ============================================================
    //  MINT CONTROL
    // ============================================================

    // If true, any wallet can mint from this collection.
    // If false, only the owner and collaborators can mint.
    bool public publicMintEnabled;

    // Optional ETH cost to mint one NFT (in wei).
    // If 0, minting is free.
    // Example: 10000000000000000 = 0.01 ETH
    uint256 public mintPrice;

    // Tracks how many NFTs each wallet has minted.
    // Used to enforce the maxPerWallet limit.
    mapping(address => uint256) public mintedPerWallet;

    // Addresses that are allowed to mint even when public minting is off.
    // Useful for your backend wallet or trusted partners.
    mapping(address => bool) public collaborators;

    // ============================================================
    //  CATEGORY STORAGE
    // ============================================================

    // Stores the category of each NFT by its token ID.
    // Example: tokenCategory[1] = "Art"
    //          tokenCategory[2] = "Music"
    //          tokenCategory[3] = "Photography"
    //
    // WHY ON-CHAIN?
    // Storing category on-chain means:
    // 1. It is permanent and trustless — no one can change it after minting
    // 2. Your Node.js backend can index it from the NFTMinted event into Supabase
    // 3. You can test it directly in Remix without any backend
    // 4. Any frontend or contract can read it with: tokenCategory(tokenId)
    mapping(uint256 => string) public tokenCategory;

    // ============================================================
    //  EVENTS
    // ============================================================

    /**
     * @notice Emitted every time an NFT is minted.
     *
     * Your Node.js backend should listen for this event and save:
     * - tokenId      → the unique NFT identifier
     * - minter       → who minted it
     * - tokenURI     → link to the metadata (IPFS)
     * - category     → the NFT category (Art, Music, etc.)
     * into your Supabase database for fast querying.
     */
    event NFTMinted(
        address indexed minter,
        uint256 indexed tokenId,
        string tokenURI,
        string category
    );

    // Emitted when the max per wallet limit is updated
    event MaxPerWalletUpdated(uint256 newMax);

    // Emitted when the mint price is updated
    event MintPriceUpdated(uint256 newPrice);

    // Emitted when public minting is toggled
    event PublicMintToggled(bool enabled);

    // Emitted when a collaborator is added or removed
    event CollaboratorUpdated(address indexed user, bool allowed);

    // Emitted when royalties are updated
    event RoyaltiesUpdated(address indexed receiver, uint96 feeNumerator);

    // ============================================================
    //  CONSTRUCTOR
    // ============================================================

    /**
     * @notice Called once when the collection is first deployed.
     *         The NFTCollectionFactory calls this automatically.
     *
     * @param name_        Collection name shown on marketplaces (e.g. "Cosmic Art")
     * @param symbol_      Short ticker symbol (e.g. "COSM")
     * @param maxSupply_   Maximum NFTs this collection can ever have (e.g. 10000)
     * @param maxPerWallet_ Max NFTs one wallet can mint. Pass 0 for no limit.
     *
     * STUDENT NOTE:
     * -------------
     * msg.sender here is the NFTCollectionFactory contract.
     * After deployment, the factory immediately transfers ownership
     * to the real user (the person who called createCollection()).
     * So by the time the user interacts with this contract, they are the owner.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 maxPerWallet_
    )
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {
        // Max supply must be at least 1
        require(maxSupply_ > 0, "Max supply must be > 0");

        maxSupply = maxSupply_;
        maxPerWallet = maxPerWallet_;
    }

    // ============================================================
    //  ADMIN FUNCTIONS (ONLY OWNER)
    // ============================================================

    /**
     * @notice Enable or disable public minting.
     *         When enabled, any wallet can mint from this collection.
     *         When disabled, only the owner and collaborators can mint.
     *
     * @param enabled true = public minting ON, false = public minting OFF
     */
    function setPublicMint(bool enabled) external onlyOwner {
        publicMintEnabled = enabled;
        emit PublicMintToggled(enabled);
    }

    /**
     * @notice Set the ETH price to mint one NFT.
     *
     * @param price Price in wei. Pass 0 for free minting.
     *
     * EXAMPLE:
     * 0.01 ETH = 10000000000000000 wei
     * In Remix: enter 10000000000000000 in the price field
     */
    function setMintPrice(uint256 price) external onlyOwner {
        mintPrice = price;
        emit MintPriceUpdated(price);
    }

    /**
     * @notice Update the maximum NFTs one wallet can mint.
     *         Set to 0 to remove the per-wallet limit entirely.
     *
     * @param newMax New per-wallet mint limit
     */
    function setMaxPerWallet(uint256 newMax) external onlyOwner {
        maxPerWallet = newMax;
        emit MaxPerWalletUpdated(newMax);
    }

    /**
     * @notice Add or remove a collaborator.
     *         Collaborators can mint even when public minting is disabled.
     *         Use this to whitelist your backend wallet or trusted partners.
     *
     * @param user    The wallet address to update
     * @param allowed true = add collaborator, false = remove collaborator
     */
    function setCollaborator(address user, bool allowed) external onlyOwner {
        collaborators[user] = allowed;
        emit CollaboratorUpdated(user, allowed);
    }

    /**
     * @notice Set the royalty info for this collection (ERC2981).
     *         Royalties are paid automatically by marketplaces that
     *         support the ERC2981 standard (like our NFTMarketplace).
     *
     * @param receiver     Wallet that receives royalty payments
     * @param feeNumerator Royalty % in basis points (max 1000 = 10%)
     *
     * BASIS POINTS EXAMPLES:
     * 250  = 2.5%
     * 500  = 5%
     * 1000 = 10% (maximum allowed)
     */
    function setRoyalties(address receiver, uint96 feeNumerator) external onlyOwner {
        require(receiver != address(0), "Invalid royalty receiver");
        // Cap royalties to protect buyers from excessive fees
        require(feeNumerator <= MAX_ROYALTY_BPS, "Royalty exceeds 10%");
        _setDefaultRoyalty(receiver, feeNumerator);
        emit RoyaltiesUpdated(receiver, feeNumerator);
    }

    /**
     * @notice Withdraw all ETH collected from mint fees.
     *         Only the owner can call this.
     *
     * WHY .call() INSTEAD OF .transfer()?
     * .transfer() has a 2300 gas limit which fails if the owner
     * is a smart contract wallet (like Gnosis Safe or any multisig).
     * .call() forwards all available gas and is the modern standard.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }

    // ============================================================
    //  MINT FUNCTION
    // ============================================================

    /**
     * @notice Mint a new NFT into this collection.
     *
     * @param uri      Metadata URI pointing to the NFT's JSON file.
     *                 In production this will be an IPFS link like: ipfs://Qm...
     *                 For Remix testing you can use any string e.g. "ipfs://test-art-1"
     *
     * @param category The category this NFT belongs to.
     *                 Examples: "Art", "Music", "Photography", "Gaming", "Sports"
     *                 This is stored permanently on-chain and emitted in the event.
     *                 Your Supabase database should index this for fast filtering.
     *
     * @return newTokenId The ID of the newly minted NFT
     *
     * MINT RULES:
     * -----------
     * 1. Caller must be owner, collaborator, OR public mint must be enabled
     * 2. If mintPrice > 0, caller must send the exact ETH amount
     * 3. Total minted cannot exceed maxSupply
     * 4. If maxPerWallet > 0, caller cannot exceed their per-wallet limit
     * 5. tokenURI and category cannot be empty strings
     *
     * TESTING IN REMIX:
     * -----------------
     * - uri:      "ipfs://my-test-nft-1"
     * - category: "Art"
     * If mintPrice > 0, enter the ETH amount in the VALUE field in Remix
     * before calling this function.
     */
    function mintNFT(
        string memory uri,
        string memory category
    )
        external
        payable
        returns (uint256)
    {
        // ---- PERMISSION CHECK ----
        // Caller must be: the owner, a collaborator, or public mint must be on
        require(
            msg.sender == owner() ||
            publicMintEnabled       ||
            collaborators[msg.sender],
            "Minting not allowed"
        );

        // ---- SUPPLY CHECK ----
        // Cannot mint more than the maximum supply
        require(_tokenIds < maxSupply, "Max supply reached");

        // ---- PER-WALLET LIMIT CHECK ----
        // Only enforced if maxPerWallet is set (> 0)
        // Owner and collaborators are exempt from per-wallet limits
        if (maxPerWallet > 0 && msg.sender != owner() && !collaborators[msg.sender]) {
            require(
                mintedPerWallet[msg.sender] < maxPerWallet,
                "Wallet mint limit reached"
            );
        }

        // ---- PAYMENT CHECK ----
        // If a mint price is set, the caller must send exactly that amount
        // Owner and collaborators mint for free regardless of mintPrice
        if (msg.sender != owner() && !collaborators[msg.sender]) {
            require(msg.value == mintPrice, "Incorrect ETH amount");
        } else {
            // Owner/collaborators should not send ETH accidentally
            require(msg.value == 0, "Owner/collaborator mints are free");
        }

        // ---- INPUT VALIDATION ----
        require(bytes(uri).length > 0, "URI cannot be empty");
        require(bytes(category).length > 0, "Category cannot be empty");

        // ---- MINT ----
        // Increment first so token IDs start at 1, not 0
        _tokenIds += 1;
        uint256 newTokenId = _tokenIds;

        // Track how many this wallet has minted
        mintedPerWallet[msg.sender] += 1;

        // Mint the NFT to the caller's wallet
        _safeMint(msg.sender, newTokenId);

        // Attach the metadata URI to this token
        _setTokenURI(newTokenId, uri);

        // Store the category permanently on-chain
        // This can be read directly: tokenCategory(tokenId)
        tokenCategory[newTokenId] = category;

        // Emit event — your Node.js indexer listens for this
        // and saves tokenId, minter, uri, and category to Supabase
        emit NFTMinted(msg.sender, newTokenId, uri, category);

        return newTokenId;
    }

    // ============================================================
    //  VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Returns the total number of NFTs minted so far.
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIds;
    }

    /**
     * @notice Returns the category of a specific NFT.
     *         Example: getCategory(1) might return "Art"
     *
     * @param tokenId The ID of the NFT to look up
     */
    function getCategory(uint256 tokenId) external view returns (string memory) {
        require(tokenId > 0 && tokenId <= _tokenIds, "Token does not exist");
        return tokenCategory[tokenId];
    }

    /**
     * @notice Returns how many NFTs are still available to mint.
     */
    function remainingSupply() external view returns (uint256) {
        return maxSupply - _tokenIds;
    }

    /**
     * @notice Returns how many more NFTs a specific wallet can mint.
     *         Returns maxPerWallet if no limit is set (0 means unlimited).
     *
     * @param wallet The wallet address to check
     */
    function remainingMints(address wallet) external view returns (uint256) {
        if (maxPerWallet == 0) return maxSupply - _tokenIds; // no wallet limit
        if (mintedPerWallet[wallet] >= maxPerWallet) return 0;
        return maxPerWallet - mintedPerWallet[wallet];
    }

    // ============================================================
    //  REQUIRED OVERRIDES
    // ============================================================

    /**
     * @dev Both ERC721URIStorage and ERC2981 define supportsInterface().
     *      Solidity requires us to explicitly resolve this conflict.
     *      We call super.supportsInterface() which correctly checks both.
     *
     *      This is what allows marketplaces to detect:
     *      - "Does this contract support ERC721?" → yes
     *      - "Does this contract support royalties (ERC2981)?" → yes
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


















// pragma solidity ^0.8.20;

// // ERC721 with per-token metadata storage (tokenURI)
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// // ERC2981 = NFT royalty standard
// import "@openzeppelin/contracts/token/common/ERC2981.sol";

// // Ownable gives us ownership + onlyOwner modifier
// import "@openzeppelin/contracts/access/Ownable.sol";

// /**
//  * @title NFTCollection
//  * @notice One contract = one NFT collection
//  *
//  * FEATURES:
//  * - Mint permissions (owner / public / collaborators)
//  * - Optional mint fee (ETH)
//  * - ERC2981 royalties
//  *
//  * IMPORTANT FOR STUDENTS:
//  * - The factory creates this contract
//  * - This contract controls ALL rules for its NFTs
//  */
// contract NFTCollection is ERC721URIStorage, ERC2981, Ownable {

//     // Counter for token IDs
//     uint256 private _tokenIds;

//     // ======== MINT CONTROL ========

//     // If true, anyone can mint
//     bool public publicMintEnabled;

//     // Optional mint price (in wei)
//     uint256 public mintPrice;

//     // Addresses allowed to mint even if public mint is disabled
//     mapping(address => bool) public collaborators;

//     // ======== EVENTS ========

//     // Emitted whenever an NFT is minted
//     event NFTMinted(
//         address indexed minter,
//         uint256 indexed tokenId,
//         string tokenURI
//     );

//     // ======== CONSTRUCTOR ========

//     /**
//      * @param name_ Collection name (e.g. "Cosmic Art")
//      * @param symbol_ Collection symbol (e.g. "COSM")
//      */
//     constructor(
//         string memory name_,
//         string memory symbol_
//     )
//         ERC721(name_, symbol_)
//         Ownable(msg.sender)
//     {}

//     // ======== ADMIN FUNCTIONS (ONLY OWNER) ========

//     /**
//      * @notice Enable or disable public minting
//      */
//     function setPublicMint(bool enabled) external onlyOwner {
//         publicMintEnabled = enabled;
//     }

//     /**
//      * @notice Set the mint price (in wei)
//      * Example: 0.01 ETH = 0.01 * 1e18
//      */
//     function setMintPrice(uint256 price) external onlyOwner {
//         mintPrice = price;
//     }

//     /**
//      * @notice Add or remove a collaborator
//      * Collaborators can mint even if public mint is disabled
//      */
//     function setCollaborator(address user, bool allowed)
//         external
//         onlyOwner
//     {
//         collaborators[user] = allowed;
//     }

//     /**
//      * @notice Set royalty information (ERC2981)
//      * @param receiver Who receives royalties
//      * @param feeNumerator Royalty percentage in basis points
//      * Example: 500 = 5%, 1000 = 10%
//      */
//     function setRoyalties(address receiver, uint96 feeNumerator)
//         external
//         onlyOwner
//     {
//         _setDefaultRoyalty(receiver, feeNumerator);
//     }

//     /**
//      * @notice Withdraw ETH collected from minting fees
//      */
//     function withdraw() external onlyOwner {
//         payable(owner()).transfer(address(this).balance);
//     }

//     // ======== MINT FUNCTION ========

//     /**
//      * @notice Mint a new NFT into this collection
//      * @param tokenURI Metadata URI (IPFS / Arweave)
//      *
//      * RULES:
//      * - Caller must be owner OR collaborator OR public mint must be enabled
//      * - If mintPrice > 0, correct ETH amount must be sent
//      */
//     function mintNFT(string memory tokenURI)
//         external
//         payable
//         returns (uint256)
//     {
//         // Check mint permission
//         require(
//             msg.sender == owner() ||
//             publicMintEnabled ||
//             collaborators[msg.sender],
//             "Minting not allowed"
//         );

//         // Check mint fee
//         require(msg.value == mintPrice, "Incorrect ETH amount");

//         // Increment token counter
//         _tokenIds += 1;
//         uint256 newTokenId = _tokenIds;

//         // Mint NFT to caller
//         _safeMint(msg.sender, newTokenId);

//         // Set metadata
//         _setTokenURI(newTokenId, tokenURI);

//         // Emit event for frontend / indexers
//         emit NFTMinted(msg.sender, newTokenId, tokenURI);

//         return newTokenId;
//     }

//     // ======== VIEW FUNCTIONS ========

//     /**
//      * @notice Total NFTs minted in this collection
//      */
//     function totalMinted() external view returns (uint256) {
//         return _tokenIds;
//     }

//     // ======== OVERRIDES ========

//     /**
//      * @dev Required override for ERC2981 compatibility
//      */
//     function supportsInterface(bytes4 interfaceId)
//         public
//         view
//         override(ERC721URIStorage, ERC2981)
//         returns (bool)
//     {
//         return super.supportsInterface(interfaceId);
//     }
// }
