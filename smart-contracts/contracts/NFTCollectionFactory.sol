// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


// We import the NFTCollection contract so this factory
// knows how to create (deploy) new NFTCollection contracts.
import "./NFTCollection.sol";

/**
 * @title NFTCollectionFactory
 * @notice This contract is responsible for creating NFT collections.
 *
 * IMPORTANT IDEA FOR STUDENTS:
 * - One NFTCollection contract = ONE NFT collection
 * - This factory helps users create collections from a website
 *   without using Remix or command-line tools.
 */
contract NFTCollectionFactory {

    // Stores the addresses of ALL collections ever created
    address[] public allCollections;

    // Maps a user address to the list of collections they created
    mapping(address => address[]) public userCollections;

    /**
     * @notice Emitted whenever a new collection is created
     * @param creator The user who created the collection
     * @param collectionAddress The address of the new NFTCollection contract
     * @param name The name of the collection
     * @param symbol The symbol of the collection
     *
     * EVENTS:
     * - Frontend apps listen to this event
     * - This helps us know when a new collection exists
     */
    event CollectionCreated(
        address indexed creator,
        address indexed collectionAddress,
        string name,
        string symbol
    );

    /**
     * @notice Creates a new NFT collection
     * @param name_ The collection name (e.g. "Cosmic Art")
     * @param symbol_ The collection symbol (e.g. "COSM")
     * @return The address of the newly deployed collection contract
     *
     * WHAT HAPPENS HERE:
     * 1. A new NFTCollection contract is deployed
     * 2. Ownership is transferred to the user
     * 3. The collection address is saved on-chain
     * 4. An event is emitted for the frontend
     */
    function createCollection(
        string memory name_,
        string memory symbol_
    ) external returns (address) {

        // Deploy a brand-new NFTCollection contract
        NFTCollection collection = new NFTCollection(name_, symbol_);

        // Transfer ownership of the collection to the user
        // This means the user controls minting rules, settings, etc.
        collection.transferOwnership(msg.sender);

        // Get the address of the deployed collection
        address collectionAddress = address(collection);

        // Save the collection globally
        allCollections.push(collectionAddress);

        // Save the collection under the creator's address
        userCollections[msg.sender].push(collectionAddress);

        // Notify the frontend that a new collection was created
        emit CollectionCreated(msg.sender, collectionAddress, name_, symbol_);

        // Return the new collection address
        return collectionAddress;
    }

    /**
     * @notice Returns all collections created by a specific user
     */
    function getUserCollections(address user)
        external
        view
        returns (address[] memory)
    {
        return userCollections[user];
    }

    /**
     * @notice Returns the total number of collections created
     */
    function totalCollections() external view returns (uint256) {
        return allCollections.length;
    }
}
