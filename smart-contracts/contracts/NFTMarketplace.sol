// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    =========================
    HIGH-LEVEL OVERVIEW
    =========================

    This marketplace allows NFT owners to sell their NFTs in TWO ways:
    1. Auction (users place bids over time)
    2. Fixed Price (first buyer pays and gets NFT)

    The seller chooses the sale type.
    The buyer experience depends on that choice.

    The marketplace:
    - Temporarily holds NFTs (escrow)
    - Temporarily holds ETH (escrow)
    - Enforces fair rules
    - Emits events for the frontend

    SECURITY FEATURES:
    - ReentrancyGuard prevents reentrancy attacks
    - Checks-Effects-Interactions pattern
    - Access control for admin functions
    - Protection against double-listing
*/

// ERC721 interface
// Allows this marketplace contract to interact with ANY ERC721 NFT
// (transfer NFTs, check ownership, move NFTs into escrow, etc.)
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// ERC2981 royalty standard
// Enables NFT royalties so the original creator can receive a percentage
// of every secondary sale (if the NFT contract supports royalties)
import "@openzeppelin/contracts/token/common/ERC2981.sol";

// ERC165 interface detection
// Allows this contract to safely check whether another contract
// supports a specific standard (e.g. ERC2981 for royalties)
// Prevents calling functions that don't exist
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// Reentrancy protection
// Protects the contract against reentrancy attacks, where a malicious
// contract tries to call back into this contract and drain funds
// Used on functions that transfer ETH or NFTs
// ✅ NEW (OpenZeppelin v5.x)
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Ownership and access control
// Provides a standard way to define an owner for this contract
// Enables the `onlyOwner` modifier for admin actions
// Used to control marketplace settings like fees and fee recipients
import "@openzeppelin/contracts/access/Ownable.sol";


/*
    IMPORTANT TEACHING NOTE:
    ------------------------
    We inherit Ownable instead of manually tracking an `owner` variable.
    This gives us:
    - A standard, audited ownership pattern
    - Built-in `onlyOwner` modifier
    - Ability to transfer ownership later if needed
*/
contract NFTMarketplace is ReentrancyGuard, Ownable {

    /*
        =========================
        SALE TYPE ENUM
        =========================
    */
    enum SaleType {
        AUCTION,
        FIXED_PRICE
    }

    /*
        =========================
        LISTING STRUCT
        =========================
    */
    // Represents a single NFT listing on the marketplace
struct Listing {
    // The NFT owner who created the listing
    address seller;

    // The NFT contract address
    address nft;

    // The specific NFT being sold
    uint256 tokenId;

    // How the NFT is sold: AUCTION or FIXED_PRICE
    SaleType saleType;

    // ---- Auction fields (used only for auctions) ----
    uint256 highestBid;        // Current highest bid (wei)
    address highestBidder;     // Address of highest bidder
    uint256 endTime;           // When the auction ends

    // ---- Fixed price field ----
    uint256 price;             // Buy-now price (wei)

    // True if the listing is finished or cancelled
    bool ended;
}


    /*
        =========================
        STORAGE
        =========================
    */

    // Counter used to generate unique IDs for each listing
    uint256 public listingCount;

    // Stores all listings by their ID
    // listingId → Listing details
    mapping(uint256 => Listing) public listings;

    // Prevents the same NFT from being listed more than once at a time
    // nft contract address → tokenId → is currently listed?
    mapping(address => mapping(uint256 => bool)) public isListed;


    /*
        =========================
        MARKETPLACE FEE
        =========================
    */

    // Marketplace fee expressed in basis points (bps)
    // 250 bps = 2.5% of each sale price
    // This is a percentage, NOT a money value, so it is not in wei
    uint256 public marketplaceFeeBps = 250;

    // Maximum marketplace fee allowed (1000 bps = 10%)
    // This protects users from excessive or malicious fee settings
    uint256 public constant MAX_FEE_BPS = 1000;

    // Address that receives the marketplace fee
    // This is the destination wallet, not the amount
    address public feeRecipient;

    // Minimum duration an auction must run for
    // Measured in time (seconds), not money
    // 1 hours = 3600 seconds
    uint256 public constant MIN_AUCTION_DURATION = 1 hours;


    /*
        =========================
        EVENTS
        =========================
    */

    // Emitted when a new NFT is listed for sale (auction or fixed price)
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address nft,
        uint256 tokenId,
        SaleType saleType
    );

    // Emitted when a listing is cancelled or ends without a sale
    event ListingCancelled(uint256 indexed listingId);

    // Emitted whenever a new bid is placed on an auction
    event BidPlaced(
        uint256 indexed listingId,
        address indexed bidder,
        uint256 amount
    );

    // Emitted when a sale is successfully completed
    // (fixed price purchase or auction winner)
    event SaleCompleted(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount
    );

    // Emitted when the marketplace fee percentage is updated
    event FeeUpdated(uint256 newFeeBps);

    // Emitted when the fee recipient address is changed
    event FeeRecipientUpdated(address newRecipient);


    /*
        =========================
        CONSTRUCTOR
        =========================
    */

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /*
        =========================
        ADMIN FUNCTIONS
        =========================
    */

    // Allows the contract owner to update the marketplace fee percentage
    // The fee is expressed in basis points (bps) and capped by MAX_FEE_BPS
    function updateMarketplaceFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee exceeds max");
        marketplaceFeeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    // Allows the contract owner to change where marketplace fees are sent
    // This can be updated to a treasury, multisig, or DAO wallet
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }


    /*
        =========================
        INTERNAL: ESCROW NFT
        =========================
    */

    // Moves the NFT from the seller to the marketplace contract (escrow)
    // This prevents the seller from transferring or re-listing the NFT
    // while it is actively listed for sale
    function _escrowNFT(address nft, uint256 tokenId) internal {
        // Transfer the NFT from the seller to this marketplace contract
        // This will fail unless the seller has approved the marketplace first
        IERC721(nft).transferFrom(
            msg.sender,
            address(this),
            tokenId
        );

        // Mark this NFT as currently listed to prevent double-listing
        isListed[nft][tokenId] = true;
    }


    /*
        =========================
        CREATE AUCTION
        =========================
    */

   // Creates a new auction listing for an NFT
    // The NFT is moved into escrow and can now receive bids
    function createAuction(
        address nft,          // NFT contract address
        uint256 tokenId,      // ID of the NFT to auction
        uint256 startingBid,  // Minimum bid amount (wei)
        uint256 duration      // How long the auction runs (seconds)
    ) external nonReentrant {

        // Ensure this NFT is not already listed for sale
        require(!isListed[nft][tokenId], "NFT already listed");

        // Ensure the auction starts with a valid minimum bid
        require(startingBid > 0, "Starting bid must be > 0");

        // Enforce a minimum auction duration for fairness
        require(duration >= MIN_AUCTION_DURATION, "Auction too short");

        // Move the NFT from the seller to the marketplace (escrow)
        _escrowNFT(nft, tokenId);

        // Increment counter to create a new unique listing ID
        listingCount++;

        // Store the auction details on-chain
        listings[listingCount] = Listing({
            seller: msg.sender,              // NFT owner who created the auction
            nft: nft,                        // NFT contract address
            tokenId: tokenId,                // NFT being sold
            saleType: SaleType.AUCTION,      // Mark as an auction
            highestBid: startingBid,         // Initial minimum bid
            highestBidder: address(0),       // No bids yet
            endTime: block.timestamp + duration, // When the auction ends
            price: 0,                        // Not used for auctions
            ended: false                     // Auction is active
        });

        // Notify frontend and indexers that a new auction was created
        emit ListingCreated(
            listingCount,
            msg.sender,
            nft,
            tokenId,
            SaleType.AUCTION
        );
    }


    /*
        =========================
        CREATE FIXED PRICE SALE
        =========================
    */

    // Creates a fixed-price listing for an NFT
    // The first buyer who pays the exact price gets the NFT
    function createFixedPriceSale(
        address nft,       // NFT contract address
        uint256 tokenId,   // ID of the NFT to sell
        uint256 price      // Buy-now price (wei)
    ) external nonReentrant {

        // Ensure a valid price is set
        require(price > 0, "Price must be > 0");

        // Ensure this NFT is not already listed for sale
        require(!isListed[nft][tokenId], "NFT already listed");

        // Move the NFT from the seller to the marketplace (escrow)
        _escrowNFT(nft, tokenId);

        // Increment counter to generate a new listing ID
        listingCount++;

        // Store the fixed-price listing details on-chain
        listings[listingCount] = Listing({
            seller: msg.sender,               // NFT owner who created the listing
            nft: nft,                         // NFT contract address
            tokenId: tokenId,                 // NFT being sold
            saleType: SaleType.FIXED_PRICE,   // Mark as fixed-price sale
            highestBid: 0,                    // Not used for fixed-price sales
            highestBidder: address(0),        // Not used for fixed-price sales
            endTime: 0,                       // No time limit
            price: price,                     // Buy-now price
            ended: false                      // Listing is active
        });

        // Notify frontend and indexers that a fixed-price listing was created
        emit ListingCreated(
            listingCount,
            msg.sender,
            nft,
            tokenId,
            SaleType.FIXED_PRICE
        );
    }

    /*
        =========================
        PLACE BID (AUCTION)
        =========================
    */

    // Places a bid on an active auction listing
    // ETH sent with the transaction (msg.value) is the bid amount
    function placeBid(uint256 listingId) external payable nonReentrant {
        // Load the listing from storage
        Listing storage l = listings[listingId];

        // Ensure this listing is an auction
        require(l.saleType == SaleType.AUCTION, "Not auction");

        // Ensure the auction is still active
        require(!l.ended, "Listing ended");
        require(block.timestamp < l.endTime, "Auction ended");

        // New bid must be higher than the current highest bid
        require(msg.value > l.highestBid, "Bid too low");

        // Store previous highest bid details for refund
        address prevBidder = l.highestBidder;
        uint256 prevBid = l.highestBid;

        // Update auction with the new highest bid
        l.highestBid = msg.value;
        l.highestBidder = msg.sender;

        // Refund the previous highest bidder (if any)
        if (prevBidder != address(0)) {
            (bool refundPaid, ) = payable(prevBidder).call{value: prevBid}("");
            require(refundPaid, "Refund failed");
        }

        // Notify frontend and indexers that a new bid was placed
        emit BidPlaced(listingId, msg.sender, msg.value);
    }

    /*
        =========================
        BUY FIXED PRICE NFT
        =========================
    */

    // Instantly purchases an NFT listed at a fixed price
    // The buyer must send the exact price in ETH
    function buy(uint256 listingId) external payable nonReentrant {
        // Load the listing from storage
        Listing storage l = listings[listingId];

        // Ensure this listing is a fixed-price sale
        require(l.saleType == SaleType.FIXED_PRICE, "Not fixed price");

        // Ensure the listing is still active
        require(!l.ended, "Listing ended");

        // Buyer must send the exact listed price
        require(msg.value == l.price, "Incorrect payment");

        // Mark the listing as completed
        l.ended = true;

        // Mark the NFT as no longer listed
        isListed[l.nft][l.tokenId] = false;

        // Handle payouts (royalties, marketplace fee, seller)
        // and transfer the NFT to the buyer
        _payout(l, msg.value, msg.sender, listingId);
    }


    /*
        =========================
        END AUCTION
        =========================
    */

    // Finalizes an auction after its time has expired
    // Anyone can call this function to ensure auctions always resolve
    function endAuction(uint256 listingId) external nonReentrant {
        // Load the auction listing from storage
        Listing storage l = listings[listingId];

        // Ensure this listing is an auction
        require(l.saleType == SaleType.AUCTION, "Not auction");

        // Ensure the auction has not already been finalized
        require(!l.ended, "Already ended");

        // Ensure the auction duration has passed
        require(block.timestamp >= l.endTime, "Auction running");

        // Mark the auction as ended and free the NFT from listing state
        l.ended = true;
        isListed[l.nft][l.tokenId] = false;

        // Case 1: No bids were placed — return NFT to the seller
        if (l.highestBidder == address(0)) {
            IERC721(l.nft).transferFrom(
                address(this),
                l.seller,
                l.tokenId
            );

            // Notify frontend that the listing ended without a sale
            emit ListingCancelled(listingId);

        // Case 2: At least one bid exists — complete the sale
        } else {
            // Handle payouts and transfer NFT to the auction winner
            _payout(l, l.highestBid, l.highestBidder, listingId);
        }
    }


    /*
        =========================
        CANCEL LISTING
        =========================
    */

    // Cancels an active listing and returns the NFT to the seller
    // Fixed-price listings can always be cancelled
    // Auctions can only be cancelled if no bids have been placed
    function cancelListing(uint256 listingId) external nonReentrant {
        // Load the listing from storage
        Listing storage l = listings[listingId];

        // Only the original seller can cancel the listing
        require(msg.sender == l.seller, "Not seller");

        // Ensure the listing has not already ended
        require(!l.ended, "Already ended");

        // Prevent cancelling an auction that already has bids
        // This protects bidders from losing their bids unfairly
        require(
            l.saleType == SaleType.FIXED_PRICE ||
            l.highestBidder == address(0),
            "Active auction"
        );

        // Mark the listing as ended and free the NFT from listing state
        l.ended = true;
        isListed[l.nft][l.tokenId] = false;

        // Return the NFT from escrow back to the seller
        IERC721(l.nft).transferFrom(
            address(this),
            l.seller,
            l.tokenId
        );

        // Notify frontend and indexers that the listing was cancelled
        emit ListingCancelled(listingId);
    }


    /*
        =========================
        INTERNAL: PAYOUT LOGIC
        =========================
    */

    // Handles all payments and NFT transfer when a sale is completed
    // Order: royalties → marketplace fee → seller → NFT transfer
    function _payout(
        Listing storage l,
        uint256 amount,     // Total sale amount (wei)
        address buyer,      // Address receiving the NFT
        uint256 listingId
    ) internal {

        // Track how much ETH remains to be paid out
        uint256 remaining = amount;

        // ---- Step 1: Pay royalties (if the NFT supports ERC2981) ----
        // Check if the NFT contract supports the royalty standard
        if (
            IERC165(l.nft).supportsInterface(
                type(IERC2981).interfaceId
            )
        ) {
            // Ask the NFT contract who should receive royalties and how much
            (address royaltyReceiver, uint256 royaltyAmount) =
                IERC2981(l.nft).royaltyInfo(l.tokenId, amount);

            // Pay royalties if applicable
            if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
                (bool royaltyPaid, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
                require(royaltyPaid, "Royalty failed");

                // Subtract royalties from the remaining amount
                remaining -= royaltyAmount;
            }
        }

        // ---- Step 2: Pay marketplace fee ----
        // Calculate fee using basis points
        uint256 fee = (remaining * marketplaceFeeBps) / 10_000;
        if (fee > 0) {
            (bool feePaid, ) = payable(feeRecipient).call{value: fee}("");
            require(feePaid, "Fee failed");

            // Subtract fee from remaining amount
            remaining -= fee;
        }

        // ---- Step 3: Pay the seller ----
        // Send the remaining ETH to the seller
        (bool sellerPaid, ) = payable(l.seller).call{value: remaining}("");
        require(sellerPaid, "Seller failed");

        // ---- Step 4: Transfer NFT to the buyer ----
        // Move the NFT from escrow to the buyer
        IERC721(l.nft).transferFrom(
            address(this),
            buyer,
            l.tokenId
        );

        // Emit event indicating the sale is complete
        emit SaleCompleted(listingId, buyer, amount);
    }


    /*
        =========================
        VIEW HELPERS
        =========================
    */

    // Returns all details of a specific listing
    // Used by the frontend to display listing information
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    // Checks whether a specific NFT is currently listed for sale
    // Helps prevent double-listing and supports frontend checks
    function isNFTListed(address nft, uint256 tokenId) external view returns (bool) {
        return isListed[nft][tokenId];
    }

}
