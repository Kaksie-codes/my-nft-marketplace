// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// We import the NFTCollection contract so this factory
// knows how to create (deploy) new NFTCollection contracts.
// The factory is the ONLY way collections should be created
// in this marketplace system.
import "./NFTCollection.sol";

/**
 * @title NFTCollectionFactory
 *
 * @notice This contract is responsible for deploying new NFT collections.
 *         Think of it as a "collection launcher" — users call createCollection()
 *         from your DApp frontend and get their own fully independent
 *         NFTCollection contract back, which they own and control.
 *
 * ARCHITECTURE FOR STUDENTS:
 * --------------------------
 * - This factory deploys NFTCollection contracts on behalf of users
 * - Each user gets their OWN collection contract (not a shared one)
 * - The factory keeps a registry of ALL collections ever created
 * - Collections created here are marked as "verified" so your frontend
 *   can distinguish official collections from random external ones
 * - Your Node.js backend listens to the CollectionCreated event to
 *   save new collections into your Supabase database automatically
 *
 * DEPLOYMENT:
 * -----------
 * This contract is deployed ONCE by you (the marketplace owner).
 * After that, users deploy their own collections through this factory
 * by calling createCollection() — no Remix or coding needed on their end.
 */
contract NFTCollectionFactory {

    // ============================================================
    //  STATE VARIABLES
    // ============================================================

    // Stores the addresses of ALL collections ever created through this factory.
    // Used for paginated browsing and total count.
    address[] public allCollections;

    // Maps a user's wallet address to all collections they have created.
    // userCollections[0xABC] = [collection1, collection2, ...]
    mapping(address => address[]) public userCollections;

    // Quickly check if a collection address was deployed by this factory.
    // isVerifiedCollection[collectionAddress] = true/false
    //
    // WHY THIS MATTERS:
    // Your frontend can show a "verified" badge on collections that were
    // created through your official factory. This helps users trust that
    // the collection follows your marketplace's standard and is not
    // a random external contract someone is trying to list.
    mapping(address => bool) public isVerifiedCollection;


    // ============================================================
    //  EVENTS
    // ============================================================

    /**
     * @notice Emitted every time a new collection is successfully created.
     *
     * YOUR NODE.JS BACKEND SHOULD LISTEN FOR THIS EVENT AND SAVE:
     * - creator           → who owns this collection
     * - collectionAddress → the contract address (primary key in Supabase)
     * - name              → collection display name
     * - symbol            → collection ticker
     * - maxSupply         → total NFTs this collection can ever have
     * - maxPerWallet      → per-wallet mint limit (0 = unlimited)
     *
     * This gives your Supabase database everything it needs to display
     * collection info without making extra blockchain calls.
     */
    event CollectionCreated(
        address indexed creator,
        address indexed collectionAddress,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 maxPerWallet
    );


    // ============================================================
    //  CREATE COLLECTION
    // ============================================================

    /**
     * @notice Deploys a new NFTCollection contract and transfers ownership to the caller.
     *
     * @param name_         Collection name shown on marketplaces (e.g. "Cosmic Art")
     * @param symbol_       Short ticker symbol (e.g. "COSM")
     * @param maxSupply_    Maximum NFTs this collection can ever have (e.g. 10000)
     * @param maxPerWallet_ Max NFTs one wallet can mint. Pass 0 for no limit.
     *
     * @return collectionAddress The address of the newly deployed NFTCollection contract
     *
     * WHAT HAPPENS STEP BY STEP:
     * 1. Input validation — ensures name, symbol, and maxSupply are valid
     * 2. A new NFTCollection contract is deployed with the given settings
     * 3. Ownership of the collection is transferred to the caller (msg.sender)
     * 4. The collection address is saved globally and under the creator's address
     * 5. The collection is marked as verified (created through our official factory)
     * 6. An event is emitted so your backend can index it in Supabase
     * 7. The new collection address is returned to the frontend
     *
     * TESTING IN REMIX:
     * -----------------
     * name_:         "My Art Collection"
     * symbol_:       "MAC"
     * maxSupply_:    1000
     * maxPerWallet_: 5
     */
    function createCollection(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 maxPerWallet_
    ) external returns (address) {

        // ---- INPUT VALIDATION ----

        // Collection name cannot be empty
        // An empty name would look broken on any marketplace or frontend
        require(bytes(name_).length > 0, "Name cannot be empty");

        // Symbol cannot be empty
        // Symbol is used as the ticker on marketplaces (e.g. "COSM")
        require(bytes(symbol_).length > 0, "Symbol cannot be empty");

        // Max supply must be at least 1
        // This is also validated inside NFTCollection but we check here
        // for a clearer error message at the factory level
        require(maxSupply_ > 0, "Max supply must be > 0");

        // ---- DEPLOY THE COLLECTION ----

        // Deploy a brand-new NFTCollection contract.
        // At this point, the factory (address(this)) is the temporary owner.
        // We transfer ownership to the user immediately after.
        NFTCollection collection = new NFTCollection(
            name_,
            symbol_,
            maxSupply_,
            maxPerWallet_
        );

        // ---- TRANSFER OWNERSHIP ----

        // Transfer ownership of the collection to the user who called this function.
        // After this line, msg.sender controls ALL settings of their collection:
        // - mint price, public mint toggle, collaborators, royalties, etc.
        // The factory retains NO control over the collection after this point.
        collection.transferOwnership(msg.sender);

        // ---- REGISTER THE COLLECTION ----

        // Get the deployed contract's address
        address collectionAddress = address(collection);

        // Save to the global list of all collections
        // Used for marketplace browsing and total count
        allCollections.push(collectionAddress);

        // Save under the creator's address
        // Used to show "my collections" on the user's profile page
        userCollections[msg.sender].push(collectionAddress);

        // Mark as verified — this collection was created through our official factory
        // Your frontend can read this to show a verified badge
        isVerifiedCollection[collectionAddress] = true;

        // ---- EMIT EVENT ----

        // Notify your backend indexer that a new collection was created.
        // Your Node.js service should catch this event and save all
        // collection details into Supabase for fast frontend queries.
        emit CollectionCreated(
            msg.sender,
            collectionAddress,
            name_,
            symbol_,
            maxSupply_,
            maxPerWallet_
        );

        // Return the new collection address to the frontend
        return collectionAddress;
    }


    // ============================================================
    //  VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Returns all collections created by a specific user.
     *         Use this to show a user's collections on their profile page.
     *
     * @param user The wallet address to look up
     *
     * NOTE FOR STUDENTS:
     * For large numbers of collections, consider using pagination
     * via getCollections() instead of fetching all at once.
     */
    function getUserCollections(address user)
        external
        view
        returns (address[] memory)
    {
        return userCollections[user];
    }

    /**
     * @notice Returns how many collections a specific user has created.
     *         Useful for displaying a count on the frontend without
     *         fetching the entire array.
     *
     * @param user The wallet address to look up
     */
    function getUserCollectionCount(address user)
        external
        view
        returns (uint256)
    {
        return userCollections[user].length;
    }

    /**
     * @notice Returns the total number of collections ever created.
     */
    function totalCollections() external view returns (uint256) {
        return allCollections.length;
    }

    /**
     * @notice Returns a paginated slice of all collections.
     *         Use this instead of fetching allCollections[] directly,
     *         especially once your marketplace has many collections.
     *
     * @param start  Index to start from (0 = beginning)
     * @param limit  Maximum number of collections to return
     *
     * EXAMPLE:
     * First page:  getCollections(0, 20)  → returns collections 0–19
     * Second page: getCollections(20, 20) → returns collections 20–39
     *
     * WHY PAGINATION MATTERS:
     * If 10,000 collections exist and you call allCollections[] directly,
     * the response is huge and can hit gas limits or time out in the browser.
     * Pagination keeps responses small and fast.
     */
    function getCollections(uint256 start, uint256 limit)
        external
        view
        returns (address[] memory)
    {
        uint256 total = allCollections.length;

        // If start is beyond the array, return an empty array
        if (start >= total) return new address[](0);

        // Calculate how many items we can actually return
        // (may be less than limit if we're near the end of the array)
        uint256 end = start + limit;
        if (end > total) end = total;

        uint256 size = end - start;
        address[] memory result = new address[](size);

        for (uint256 i = 0; i < size; i++) {
            result[i] = allCollections[start + i];
        }

        return result;
    }

    /**
     * @notice Check if a collection address was created through this factory.
     *         Returns true for verified (official) collections only.
     *
     * USE CASE:
     * Your frontend calls this before displaying a collection to decide
     * whether to show a "verified" badge next to the collection name.
     *
     * @param collectionAddress The contract address to check
     */
    function checkVerified(address collectionAddress)
        external
        view
        returns (bool)
    {
        return isVerifiedCollection[collectionAddress];
    }
}


















// pragma solidity ^0.8.20;


// // We import the NFTCollection contract so this factory
// // knows how to create (deploy) new NFTCollection contracts.
// import "./NFTCollection.sol";

// /**
//  * @title NFTCollectionFactory
//  * @notice This contract is responsible for creating NFT collections.
//  *
//  * IMPORTANT IDEA FOR STUDENTS:
//  * - One NFTCollection contract = ONE NFT collection
//  * - This factory helps users create collections from a website
//  *   without using Remix or command-line tools.
//  */
// contract NFTCollectionFactory {

//     // Stores the addresses of ALL collections ever created
//     address[] public allCollections;

//     // Maps a user address to the list of collections they created
//     mapping(address => address[]) public userCollections;

//     /**
//      * @notice Emitted whenever a new collection is created
//      * @param creator The user who created the collection
//      * @param collectionAddress The address of the new NFTCollection contract
//      * @param name The name of the collection
//      * @param symbol The symbol of the collection
//      *
//      * EVENTS:
//      * - Frontend apps listen to this event
//      * - This helps us know when a new collection exists
//      */
//     event CollectionCreated(
//         address indexed creator,
//         address indexed collectionAddress,
//         string name,
//         string symbol
//     );

//     /**
//      * @notice Creates a new NFT collection
//      * @param name_ The collection name (e.g. "Cosmic Art")
//      * @param symbol_ The collection symbol (e.g. "COSM")
//      * @return The address of the newly deployed collection contract
//      *
//      * WHAT HAPPENS HERE:
//      * 1. A new NFTCollection contract is deployed
//      * 2. Ownership is transferred to the user
//      * 3. The collection address is saved on-chain
//      * 4. An event is emitted for the frontend
//      */
//     function createCollection(
//         string memory name_,
//         string memory symbol_
//     ) external returns (address) {

//         // Deploy a brand-new NFTCollection contract
//         NFTCollection collection = new NFTCollection(name_, symbol_);

//         // Transfer ownership of the collection to the user
//         // This means the user controls minting rules, settings, etc.
//         collection.transferOwnership(msg.sender);

//         // Get the address of the deployed collection
//         address collectionAddress = address(collection);

//         // Save the collection globally
//         allCollections.push(collectionAddress);

//         // Save the collection under the creator's address
//         userCollections[msg.sender].push(collectionAddress);

//         // Notify the frontend that a new collection was created
//         emit CollectionCreated(msg.sender, collectionAddress, name_, symbol_);

//         // Return the new collection address
//         return collectionAddress;
//     }

//     /**
//      * @notice Returns all collections created by a specific user
//      */
//     function getUserCollections(address user)
//         external
//         view
//         returns (address[] memory)
//     {
//         return userCollections[user];
//     }

//     /**
//      * @notice Returns the total number of collections created
//      */
//     function totalCollections() external view returns (uint256) {
//         return allCollections.length;
//     }
// }
