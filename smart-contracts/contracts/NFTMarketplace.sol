// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    =========================
    HIGH-LEVEL OVERVIEW
    =========================

    This marketplace allows NFT owners to sell their NFTs in TWO ways:
    1. Auction    — users place bids over a set time period
    2. Fixed Price — first buyer who pays the listed price gets the NFT

    The seller chooses the sale type when creating the listing.

    The marketplace:
    - Temporarily holds NFTs in escrow (safe custody)
    - Temporarily holds ETH in escrow (bids and payments)
    - Enforces fair rules for buyers and sellers
    - Pays royalties to original NFT creators automatically
    - Takes a small marketplace fee on every sale
    - Emits events so your Node.js backend can index everything in Supabase

    SECURITY FEATURES:
    ✅ ReentrancyGuard         — prevents reentrancy attacks
    ✅ Checks-Effects-Interactions pattern — safe state update order
    ✅ Pull refund pattern     — prevents bid griefing attacks
    ✅ safeTransferFrom        — prevents NFTs getting stuck in contracts
    ✅ Royalty cap             — prevents malicious royalty amounts
    ✅ Access control          — onlyOwner for admin functions
    ✅ Double-listing protection — one listing per NFT at a time
    ✅ Self-purchase prevention — sellers cannot buy their own listings
    ✅ Listing existence check  — clear errors for invalid listing IDs
*/

// ERC721 interface — lets this contract interact with ANY ERC721 NFT.
// Used to move NFTs into escrow and transfer them to buyers.
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// ERC2981 royalty standard — lets us check if an NFT supports royalties
// and how much the original creator should receive on each sale.
import "@openzeppelin/contracts/token/common/ERC2981.sol";

// ERC165 interface detection — lets us safely check if a contract
// supports a specific standard before calling its functions.
// Prevents calling royaltyInfo() on contracts that don't support it.
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// ReentrancyGuard — protects against reentrancy attacks where a
// malicious contract tries to call back into this contract mid-execution
// to drain funds or manipulate state.
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Ownable — gives us a standard owner variable and onlyOwner modifier.
// Used to protect admin functions like updating fees.
import "@openzeppelin/contracts/access/Ownable.sol";


/*
    TEACHING NOTE — WHY WE INHERIT THESE CONTRACTS:
    ------------------------------------------------
    Instead of writing ownership and reentrancy logic ourselves,
    we inherit battle-tested OpenZeppelin contracts. This means:
    - Less code to write and audit
    - Industry-standard patterns your students will see everywhere
    - Built-in modifiers like onlyOwner and nonReentrant
*/
contract NFTMarketplace is ReentrancyGuard, Ownable {

    /*
        =========================
        SALE TYPE ENUM
        =========================

        An enum is a named set of options.
        SaleType.AUCTION      = 0
        SaleType.FIXED_PRICE  = 1

        Storing this in the Listing struct lets us write clear
        conditions like: if (l.saleType == SaleType.AUCTION)
        instead of confusing magic numbers like: if (l.saleType == 0)
    */
    enum SaleType {
        AUCTION,
        FIXED_PRICE
    }


    /*
        =========================
        LISTING STRUCT
        =========================

        A struct groups related variables together under one name.
        Each listing on the marketplace is stored as one of these.
        Think of it like a row in a database table.
    */
    struct Listing {
        // The wallet that created this listing (NFT owner)
        address seller;

        // The NFT contract address (e.g. your NFTCollection contract)
        address nft;

        // The specific token ID within that NFT contract
        uint256 tokenId;

        // AUCTION or FIXED_PRICE
        SaleType saleType;

        // ---- Auction fields (only used when saleType == AUCTION) ----
        uint256 highestBid;      // Current highest bid in wei
        address highestBidder;   // Wallet of the current highest bidder
        uint256 endTime;         // Unix timestamp when auction ends
        uint256 startingBid;     // The minimum bid set by the seller

        // ---- Fixed price field (only used when saleType == FIXED_PRICE) ----
        uint256 price;           // Buy-now price in wei

        // Set to true when the listing ends (sale, cancellation, or expired auction)
        bool ended;
    }


    /*
        =========================
        STORAGE
        =========================
    */

    // Auto-incrementing counter for listing IDs.
    // First listing = 1, second = 2, etc.
    // We start at 0 and increment before storing, so IDs begin at 1.
    uint256 public listingCount;

    // All listings stored by their unique ID.
    // listings[1] = first listing, listings[2] = second listing, etc.
    mapping(uint256 => Listing) public listings;

    // Tracks which NFTs are currently listed to prevent double-listing.
    // isListed[nftContract][tokenId] = true/false
    mapping(address => mapping(uint256 => bool)) public isListed;

    // ---- PULL REFUND PATTERN ----
    // Stores pending ETH refunds for outbid bidders.
    //
    // WHY NOT REFUND IMMEDIATELY?
    // If we refund immediately inside placeBid(), a malicious bidder
    // could deploy a contract with a broken receive() function that
    // always reverts. This would cause placeBid() to always revert,
    // permanently locking the auction — nobody could ever outbid them.
    //
    // The pull pattern is safer: we store the refund here, and the
    // bidder calls withdrawRefund() themselves to collect it.
    // This separates refund logic from bid logic completely.
    mapping(address => uint256) public pendingRefunds;


    /*
        =========================
        MARKETPLACE FEE SETTINGS
        =========================
    */

    // Marketplace fee in basis points (bps).
    // 250 bps = 2.5% of every sale goes to the marketplace.
    // This is a percentage, NOT an ETH amount.
    uint256 public marketplaceFeeBps = 250;

    // Hard cap on the marketplace fee to protect users.
    // Owner can never set the fee above 10% (1000 bps).
    uint256 public constant MAX_FEE_BPS = 1000;

    // Wallet that receives the marketplace fee on every sale.
    // Can be updated by the owner (e.g. changed to a treasury or DAO).
    address public feeRecipient;

    // Minimum time an auction must run.
    // Prevents auctions that end almost immediately.
    // 1 hours = 3600 seconds
    uint256 public constant MIN_AUCTION_DURATION = 1 hours;

    // Maximum time an auction can run.
    // Prevents sellers from accidentally locking their NFT
    // in the contract for an unreasonably long time (e.g. 100 years).
    // 30 days = 2,592,000 seconds
    uint256 public constant MAX_AUCTION_DURATION = 30 days;


    /*
        =========================
        EVENTS
        =========================

        Events are how your Node.js backend and frontend know what
        happened on-chain. Your Supabase indexer should listen for
        all of these and save the data for fast querying.
    */

    // Emitted when any new listing is created (auction or fixed price).
    // price = buy-now price for fixed listings, starting bid for auctions.
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nft,
        uint256 tokenId,
        SaleType saleType,
        uint256 price
    );

    // Emitted when a listing is cancelled or an auction ends with no bids.
    event ListingCancelled(uint256 indexed listingId);

    // Emitted when a new bid is placed on an auction.
    event BidPlaced(
        uint256 indexed listingId,
        address indexed bidder,
        uint256 amount
    );

    // Emitted when a refund is stored for an outbid bidder.
    // Your frontend can use this to notify the user they were outbid.
    event RefundStored(
        uint256 indexed listingId,
        address indexed bidder,
        uint256 amount
    );

    // Emitted when a sale completes successfully.
    // (fixed price purchase OR auction winner claims NFT)
    event SaleCompleted(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount
    );

    // Emitted when a bidder successfully withdraws their refund.
    event RefundWithdrawn(address indexed bidder, uint256 amount);

    // Emitted when the marketplace fee is updated by the owner.
    event FeeUpdated(uint256 newFeeBps);

    // Emitted when the fee recipient wallet is changed by the owner.
    event FeeRecipientUpdated(address newRecipient);

    // Emitted when a fixed-price listing's price is updated.
    event PriceUpdated(uint256 indexed listingId, uint256 newPrice);


    /*
        =========================
        CONSTRUCTOR
        =========================
    */

    /**
     * @notice Called once when the marketplace is deployed.
     *         You deploy this contract ONCE as the marketplace owner.
     *
     * @param _feeRecipient Wallet that receives the marketplace fee on every sale.
     *                      Can be your own wallet or a treasury contract.
     *
     * TESTING IN REMIX:
     * Pass any valid wallet address that is not address(0).
     * Example: paste your MetaMask wallet address here.
     */
    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }


    /*
        =========================
        MODIFIERS
        =========================

        Modifiers are reusable condition checks we can attach to functions.
        Instead of repeating the same require() in every function,
        we write it once here and apply it with a keyword.
    */

    /**
     * @dev Ensures a listing ID actually exists before any function runs.
     *      Without this, calling buy(999) on a non-existent listing
     *      would silently return a zeroed struct instead of a clear error.
     */
    modifier listingExists(uint256 listingId) {
        require(
            listingId > 0 && listingId <= listingCount,
            "Listing does not exist"
        );
        _;
    }


    /*
        =========================
        ADMIN FUNCTIONS
        =========================
    */

    /**
     * @notice Update the marketplace fee percentage.
     *         Capped at MAX_FEE_BPS (10%) to protect users.
     *
     * @param newFeeBps New fee in basis points (e.g. 250 = 2.5%)
     */
    function updateMarketplaceFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee exceeds max allowed (10%)");
        marketplaceFeeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    /**
     * @notice Update the wallet that receives marketplace fees.
     *         Useful for switching to a treasury, multisig, or DAO wallet.
     *
     * @param newRecipient New fee recipient wallet address
     */
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

    /**
     * @dev Moves an NFT from the seller's wallet into this contract (escrow).
     *      The NFT stays here until the listing ends (sale, cancel, or no-bid auction).
     *
     *      IMPORTANT: The seller must call approve(marketplaceAddress, tokenId)
     *      on the NFT contract BEFORE calling createAuction or createFixedPriceSale.
     *      Without approval, this transferFrom will revert.
     *
     *      WHY ESCROW?
     *      Holding the NFT here prevents the seller from transferring or
     *      re-listing the same NFT elsewhere while it has active bids or buyers.
     */
    function _escrowNFT(address nft, uint256 tokenId) internal {
        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);
        isListed[nft][tokenId] = true;
    }


    /*
        =========================
        CREATE AUCTION
        =========================
    */

    /**
     * @notice List an NFT for auction. Bidders compete over the set duration.
     *         The highest bidder at the end wins the NFT.
     *
     * @param nft         Address of the NFT contract
     * @param tokenId     ID of the NFT to auction
     * @param startingBid Minimum first bid (in wei). No bids below this accepted.
     * @param duration    How long the auction runs (in seconds)
     *
     * BEFORE CALLING THIS:
     * Call approve(marketplaceAddress, tokenId) on your NFT contract first.
     *
     * TESTING IN REMIX:
     * nft:         paste your NFTCollection contract address
     * tokenId:     1  (or whichever token you own)
     * startingBid: 10000000000000000  (= 0.01 ETH in wei)
     * duration:    3600  (= 1 hour, the minimum)
     */
    function createAuction(
        address nft,
        uint256 tokenId,
        uint256 startingBid,
        uint256 duration
    ) external nonReentrant {

        require(!isListed[nft][tokenId], "NFT already listed");
        require(startingBid > 0, "Starting bid must be > 0");
        require(duration >= MIN_AUCTION_DURATION, "Auction too short");
        require(duration <= MAX_AUCTION_DURATION, "Auction too long (max 30 days)");

        // Move NFT into escrow
        _escrowNFT(nft, tokenId);

        // Generate new listing ID (starts at 1)
        listingCount++;

        // Store the auction listing on-chain
        listings[listingCount] = Listing({
            seller:       msg.sender,
            nft:          nft,
            tokenId:      tokenId,
            saleType:     SaleType.AUCTION,
            highestBid:   startingBid,           // Treated as minimum bid until first bidder
            highestBidder: address(0),            // No bids yet
            endTime:      block.timestamp + duration,
            startingBid:  startingBid,            // Stored separately for reference
            price:        0,                      // Not used for auctions
            ended:        false
        });

        emit ListingCreated(
            listingCount,
            msg.sender,
            nft,
            tokenId,
            SaleType.AUCTION,
            startingBid
        );
    }


    /*
        =========================
        CREATE FIXED PRICE SALE
        =========================
    */

    /**
     * @notice List an NFT at a fixed price. First buyer to pay gets the NFT.
     *
     * @param nft     Address of the NFT contract
     * @param tokenId ID of the NFT to sell
     * @param price   Buy-now price in wei
     *
     * BEFORE CALLING THIS:
     * Call approve(marketplaceAddress, tokenId) on your NFT contract first.
     *
     * TESTING IN REMIX:
     * nft:     paste your NFTCollection contract address
     * tokenId: 1
     * price:   50000000000000000  (= 0.05 ETH in wei)
     */
    function createFixedPriceSale(
        address nft,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant {

        require(price > 0, "Price must be > 0");
        require(!isListed[nft][tokenId], "NFT already listed");

        // Move NFT into escrow
        _escrowNFT(nft, tokenId);

        // Generate new listing ID
        listingCount++;

        // Store the fixed-price listing on-chain
        listings[listingCount] = Listing({
            seller:        msg.sender,
            nft:           nft,
            tokenId:       tokenId,
            saleType:      SaleType.FIXED_PRICE,
            highestBid:    0,           // Not used for fixed-price
            highestBidder: address(0),  // Not used for fixed-price
            endTime:       0,           // No time limit on fixed-price listings
            startingBid:   0,           // Not used for fixed-price
            price:         price,
            ended:         false
        });

        emit ListingCreated(
            listingCount,
            msg.sender,
            nft,
            tokenId,
            SaleType.FIXED_PRICE,
            price
        );
    }


    /*
        =========================
        PLACE BID (AUCTION)
        =========================
    */

    /**
     * @notice Place a bid on an active auction.
     *         Send ETH with this transaction — that IS your bid.
     *
     * @param listingId The ID of the auction listing to bid on
     *
     * BID RULES:
     * - First bid must meet or exceed the starting bid
     * - Every subsequent bid must strictly exceed the current highest bid
     * - You cannot bid on your own listing
     * - Your ETH is held in escrow until you are outbid or the auction ends
     * - If outbid, your ETH is stored in pendingRefunds — call withdrawRefund() to get it back
     *
     * TESTING IN REMIX:
     * - Enter the ETH amount in the VALUE field in Remix before calling
     * - listingId: the ID of an active auction
     */
    function placeBid(uint256 listingId)
        external
        payable
        nonReentrant
        listingExists(listingId)
    {
        Listing storage l = listings[listingId];

        require(l.saleType == SaleType.AUCTION, "Not an auction");
        require(!l.ended, "Auction has ended");
        require(block.timestamp < l.endTime, "Auction time has passed");

        // Seller cannot bid on their own auction
        require(msg.sender != l.seller, "Seller cannot bid on own listing");

        // First bid: must meet or exceed starting bid
        // Subsequent bids: must strictly exceed current highest bid
        bool isFirstBid = l.highestBidder == address(0);
        require(
            isFirstBid ? msg.value >= l.highestBid : msg.value > l.highestBid,
            "Bid too low"
        );

        // Store the outbid bidder's refund using the PULL pattern.
        // They must call withdrawRefund() to get their ETH back.
        // We do NOT send it immediately — see pendingRefunds comment above.
        if (!isFirstBid) {
            address prevBidder = l.highestBidder;
            uint256 prevBid    = l.highestBid;

            pendingRefunds[prevBidder] += prevBid;
            emit RefundStored(listingId, prevBidder, prevBid);
        }

        // Update auction state with the new highest bid
        l.highestBid    = msg.value;
        l.highestBidder = msg.sender;

        emit BidPlaced(listingId, msg.sender, msg.value);
    }


    /*
        =========================
        WITHDRAW REFUND
        =========================
    */

    /**
     * @notice Withdraw your pending refund after being outbid.
     *
     * WHY IS THIS SEPARATE FROM BIDDING?
     * This is the "pull" pattern. Instead of automatically sending
     * refunds inside placeBid() (which can be exploited by malicious
     * contracts), we store the refund here and let bidders pull it
     * themselves. This completely eliminates the griefing attack risk.
     *
     * WHEN TO CALL THIS:
     * After you have been outbid on any auction, call this function
     * to retrieve your ETH. Your frontend should show a notification
     * when pendingRefunds[yourAddress] > 0.
     */
    function withdrawRefund() external nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        require(amount > 0, "No refund available");

        // Zero out BEFORE transferring (Checks-Effects-Interactions)
        // This prevents a reentrancy attack where the caller tries to
        // call withdrawRefund() again before the first transfer completes
        pendingRefunds[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund transfer failed");

        emit RefundWithdrawn(msg.sender, amount);
    }


    /*
        =========================
        BUY FIXED PRICE NFT
        =========================
    */

    /**
     * @notice Instantly purchase an NFT listed at a fixed price.
     *         Send the exact listed price in ETH with this transaction.
     *
     * @param listingId The ID of the fixed-price listing to purchase
     *
     * TESTING IN REMIX:
     * - Enter the exact ETH price in the VALUE field before calling
     * - listingId: the ID of an active fixed-price listing
     */
    function buy(uint256 listingId)
        external
        payable
        nonReentrant
        listingExists(listingId)
    {
        Listing storage l = listings[listingId];

        require(l.saleType == SaleType.FIXED_PRICE, "Not a fixed price listing");
        require(!l.ended, "Listing has ended");
        require(msg.value == l.price, "Incorrect ETH amount sent");

        // Seller cannot buy their own listing
        require(msg.sender != l.seller, "Seller cannot buy own listing");

        // Mark ended and remove from active listings BEFORE transfers
        // (Checks-Effects-Interactions pattern)
        l.ended = true;
        isListed[l.nft][l.tokenId] = false;

        _payout(l, msg.value, msg.sender, listingId);
    }


    /*
        =========================
        UPDATE FIXED PRICE
        =========================
    */

    /**
     * @notice Update the price of an active fixed-price listing.
     *         Only the original seller can do this.
     *         Cannot be used on auctions.
     *
     * @param listingId The ID of the listing to update
     * @param newPrice  The new price in wei
     *
     * USE CASE:
     * A seller listed at 1 ETH but wants to reduce to 0.5 ETH.
     * Instead of cancelling and re-listing (two transactions + gas),
     * they can just call updatePrice() — one transaction.
     */
    function updatePrice(uint256 listingId, uint256 newPrice)
        external
        nonReentrant
        listingExists(listingId)
    {
        Listing storage l = listings[listingId];

        require(msg.sender == l.seller, "Not the seller");
        require(!l.ended, "Listing has ended");
        require(l.saleType == SaleType.FIXED_PRICE, "Only for fixed price listings");
        require(newPrice > 0, "Price must be > 0");

        l.price = newPrice;

        emit PriceUpdated(listingId, newPrice);
    }


    /*
        =========================
        END AUCTION
        =========================
    */

    /**
     * @notice Finalize an auction after its time has expired.
     *         Anyone can call this — not just the seller or buyer.
     *
     * WHY CAN ANYONE CALL THIS?
     * Auctions must always be resolvable. If only the seller could end it,
     * they might refuse to call it out of spite (e.g. if they don't like
     * the final price). Allowing anyone to call it ensures fairness.
     *
     * TWO OUTCOMES:
     * 1. No bids → NFT is returned to the seller
     * 2. At least one bid → NFT goes to the highest bidder, ETH is distributed
     *
     * @param listingId The ID of the auction to finalize
     */
    function endAuction(uint256 listingId)
        external
        nonReentrant
        listingExists(listingId)
    {
        Listing storage l = listings[listingId];

        require(l.saleType == SaleType.AUCTION, "Not an auction");
        require(!l.ended, "Auction already finalized");
        require(block.timestamp >= l.endTime, "Auction is still running");

        // Mark ended BEFORE transfers (Checks-Effects-Interactions)
        l.ended = true;
        isListed[l.nft][l.tokenId] = false;

        if (l.highestBidder == address(0)) {
            // No bids were placed — return NFT to seller using safeTransferFrom
            // safeTransferFrom checks if the recipient can handle ERC721 tokens,
            // preventing the NFT from getting permanently stuck in a contract
            IERC721(l.nft).safeTransferFrom(
                address(this),
                l.seller,
                l.tokenId
            );

            emit ListingCancelled(listingId);

        } else {
            // At least one bid — complete the sale
            _payout(l, l.highestBid, l.highestBidder, listingId);
        }
    }


    /*
        =========================
        CANCEL LISTING
        =========================
    */

    /**
     * @notice Cancel an active listing and return the NFT to the seller.
     *
     * RULES:
     * - Only the seller can cancel their own listing
     * - Fixed-price listings can always be cancelled
     * - Auctions can ONLY be cancelled if no bids have been placed yet
     *   (protects bidders — they should not lose their bid opportunity)
     *
     * @param listingId The ID of the listing to cancel
     */
    function cancelListing(uint256 listingId)
        external
        nonReentrant
        listingExists(listingId)
    {
        Listing storage l = listings[listingId];

        require(msg.sender == l.seller, "Only the seller can cancel");
        require(!l.ended, "Listing already ended");
        require(
            l.saleType == SaleType.FIXED_PRICE || l.highestBidder == address(0),
            "Cannot cancel auction with active bids"
        );

        // Mark ended BEFORE transfers (Checks-Effects-Interactions)
        l.ended = true;
        isListed[l.nft][l.tokenId] = false;

        // Return NFT to seller using safeTransferFrom
        IERC721(l.nft).safeTransferFrom(
            address(this),
            l.seller,
            l.tokenId
        );

        emit ListingCancelled(listingId);
    }


    /*
        =========================
        INTERNAL: PAYOUT LOGIC
        =========================
    */

    /**
     * @dev Handles all payments when a sale completes.
     *      Payment order: royalties → marketplace fee → seller → NFT transfer
     *
     *      Both royalties and marketplace fee are calculated from the
     *      ORIGINAL sale amount for consistency and predictability.
     *      The seller always receives whatever is left after both deductions.
     *
     * @param l         The listing storage reference
     * @param amount    Total ETH paid by the buyer (in wei)
     * @param buyer     Wallet receiving the NFT
     * @param listingId Used for the SaleCompleted event
     */
    function _payout(
        Listing storage l,
        uint256 amount,
        address buyer,
        uint256 listingId
    ) internal {

        uint256 remaining = amount;

        // ---- STEP 1: PAY ROYALTIES (if NFT supports ERC2981) ----
        //
        // We check supportsInterface() first to avoid calling royaltyInfo()
        // on contracts that don't have it (would cause a revert).
        if (IERC165(l.nft).supportsInterface(type(IERC2981).interfaceId)) {

            (address royaltyReceiver, uint256 royaltyAmount) =
                IERC2981(l.nft).royaltyInfo(l.tokenId, amount);

            // Safety cap: royalty cannot exceed the total sale amount.
            // Protects against malicious or buggy NFT contracts that
            // return an absurdly large royalty amount.
            if (
                royaltyAmount > 0      &&
                royaltyAmount <= amount &&
                royaltyReceiver != address(0)
            ) {
                (bool royaltyPaid, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
                require(royaltyPaid, "Royalty payment failed");
                remaining -= royaltyAmount;
            }
        }

        // ---- STEP 2: PAY MARKETPLACE FEE ----
        //
        // Fee is calculated on the ORIGINAL amount (not remaining after royalties).
        // This makes the fee predictable — sellers always know exactly what % they pay.
        //
        // Example: 1 ETH sale, 5% royalty, 2.5% marketplace fee
        // Royalty:         1 ETH × 5%   = 0.05 ETH
        // Marketplace fee: 1 ETH × 2.5% = 0.025 ETH
        // Seller receives: 1 - 0.05 - 0.025 = 0.925 ETH
        uint256 fee = (amount * marketplaceFeeBps) / 10_000;

        // Make sure combined deductions don't exceed the total amount
        // This is an extra safety check — should never happen with our caps
        if (fee > 0 && fee <= remaining) {
            (bool feePaid, ) = payable(feeRecipient).call{value: fee}("");
            require(feePaid, "Marketplace fee payment failed");
            remaining -= fee;
        }

        // ---- STEP 3: PAY THE SELLER ----
        //
        // Seller receives everything left after royalties and marketplace fee
        (bool sellerPaid, ) = payable(l.seller).call{value: remaining}("");
        require(sellerPaid, "Seller payment failed");

        // ---- STEP 4: TRANSFER NFT TO BUYER ----
        //
        // Using safeTransferFrom instead of transferFrom.
        // safeTransferFrom checks if the buyer contract can handle ERC721 tokens.
        // This prevents NFTs from getting permanently stuck in contracts that
        // don't know how to handle them.
        IERC721(l.nft).safeTransferFrom(address(this), buyer, l.tokenId);

        emit SaleCompleted(listingId, buyer, amount);
    }


    /*
        =========================
        VIEW FUNCTIONS
        =========================
    */

    /**
     * @notice Returns full details of a specific listing.
     *         Use this in your frontend to display listing info.
     *
     * @param listingId The listing ID to look up
     */
    function getListing(uint256 listingId)
        external
        view
        listingExists(listingId)
        returns (Listing memory)
    {
        return listings[listingId];
    }

    /**
     * @notice Check if a specific NFT is currently listed for sale.
     *
     * @param nft     The NFT contract address
     * @param tokenId The token ID to check
     */
    function isNFTListed(address nft, uint256 tokenId)
        external
        view
        returns (bool)
    {
        return isListed[nft][tokenId];
    }

    /**
     * @notice Check how much ETH refund a specific address can withdraw.
     *         Your frontend should display this so outbid users know
     *         they have funds available to claim.
     *
     * @param bidder The wallet address to check
     */
    function getPendingRefund(address bidder)
        external
        view
        returns (uint256)
    {
        return pendingRefunds[bidder];
    }

    /**
     * @notice Returns the time remaining in an active auction (in seconds).
     *         Returns 0 if the auction has ended or does not exist.
     *         Useful for displaying a live countdown on your frontend.
     *
     * @param listingId The auction listing ID
     */
    function getTimeRemaining(uint256 listingId)
        external
        view
        listingExists(listingId)
        returns (uint256)
    {
        Listing memory l = listings[listingId];
        if (l.saleType != SaleType.AUCTION) return 0;
        if (l.ended || block.timestamp >= l.endTime) return 0;
        return l.endTime - block.timestamp;
    }
}




 






// pragma solidity ^0.8.20;

// /*
//     =========================
//     HIGH-LEVEL OVERVIEW
//     =========================

//     This marketplace allows NFT owners to sell their NFTs in TWO ways:
//     1. Auction (users place bids over time)
//     2. Fixed Price (first buyer pays and gets NFT)

//     The seller chooses the sale type.
//     The buyer experience depends on that choice.

//     The marketplace:
//     - Temporarily holds NFTs (escrow)
//     - Temporarily holds ETH (escrow)
//     - Enforces fair rules
//     - Emits events for the frontend

//     SECURITY FEATURES:
//     - ReentrancyGuard prevents reentrancy attacks
//     - Checks-Effects-Interactions pattern
//     - Access control for admin functions
//     - Protection against double-listing
// */

// // ERC721 interface
// // Allows this marketplace contract to interact with ANY ERC721 NFT
// // (transfer NFTs, check ownership, move NFTs into escrow, etc.)
// import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// // ERC2981 royalty standard
// // Enables NFT royalties so the original creator can receive a percentage
// // of every secondary sale (if the NFT contract supports royalties)
// import "@openzeppelin/contracts/token/common/ERC2981.sol";

// // ERC165 interface detection
// // Allows this contract to safely check whether another contract
// // supports a specific standard (e.g. ERC2981 for royalties)
// // Prevents calling functions that don't exist
// import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// // Reentrancy protection
// // Protects the contract against reentrancy attacks, where a malicious
// // contract tries to call back into this contract and drain funds
// // Used on functions that transfer ETH or NFTs
// // ✅ NEW (OpenZeppelin v5.x)
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// // Ownership and access control
// // Provides a standard way to define an owner for this contract
// // Enables the `onlyOwner` modifier for admin actions
// // Used to control marketplace settings like fees and fee recipients
// import "@openzeppelin/contracts/access/Ownable.sol";


// /*
//     IMPORTANT TEACHING NOTE:
//     ------------------------
//     We inherit Ownable instead of manually tracking an `owner` variable.
//     This gives us:
//     - A standard, audited ownership pattern
//     - Built-in `onlyOwner` modifier
//     - Ability to transfer ownership later if needed
// */
// contract NFTMarketplace is ReentrancyGuard, Ownable {

//     /*
//         =========================
//         SALE TYPE ENUM
//         =========================
//     */
//     enum SaleType {
//         AUCTION,
//         FIXED_PRICE
//     }

//     /*
//         =========================
//         LISTING STRUCT
//         =========================
//     */
//     // Represents a single NFT listing on the marketplace
// struct Listing {
//     // The NFT owner who created the listing
//     address seller;

//     // The NFT contract address
//     address nft;

//     // The specific NFT being sold
//     uint256 tokenId;

//     // How the NFT is sold: AUCTION or FIXED_PRICE
//     SaleType saleType;

//     // ---- Auction fields (used only for auctions) ----
//     uint256 highestBid;        // Current highest bid (wei)
//     address highestBidder;     // Address of highest bidder
//     uint256 endTime;           // When the auction ends

//     // ---- Fixed price field ----
//     uint256 price;             // Buy-now price (wei)

//     // True if the listing is finished or cancelled
//     bool ended;
// }


//     /*
//         =========================
//         STORAGE
//         =========================
//     */

//     // Counter used to generate unique IDs for each listing
//     uint256 public listingCount;

//     // Stores all listings by their ID
//     // listingId → Listing details
//     mapping(uint256 => Listing) public listings;

//     // Prevents the same NFT from being listed more than once at a time
//     // nft contract address → tokenId → is currently listed?
//     mapping(address => mapping(uint256 => bool)) public isListed;


//     /*
//         =========================
//         MARKETPLACE FEE
//         =========================
//     */

//     // Marketplace fee expressed in basis points (bps)
//     // 250 bps = 2.5% of each sale price
//     // This is a percentage, NOT a money value, so it is not in wei
//     uint256 public marketplaceFeeBps = 250;

//     // Maximum marketplace fee allowed (1000 bps = 10%)
//     // This protects users from excessive or malicious fee settings
//     uint256 public constant MAX_FEE_BPS = 1000;

//     // Address that receives the marketplace fee
//     // This is the destination wallet, not the amount
//     address public feeRecipient;

//     // Minimum duration an auction must run for
//     // Measured in time (seconds), not money
//     // 1 hours = 3600 seconds
//     uint256 public constant MIN_AUCTION_DURATION = 1 hours;


//     /*
//         =========================
//         EVENTS
//         =========================
//     */

//     // Emitted when a new NFT is listed for sale (auction or fixed price)
//     event ListingCreated(
//         uint256 indexed listingId,
//         address indexed seller,
//         address nft,
//         uint256 tokenId,
//         SaleType saleType
//     );

//     // Emitted when a listing is cancelled or ends without a sale
//     event ListingCancelled(uint256 indexed listingId);

//     // Emitted whenever a new bid is placed on an auction
//     event BidPlaced(
//         uint256 indexed listingId,
//         address indexed bidder,
//         uint256 amount
//     );

//     // Emitted when a sale is successfully completed
//     // (fixed price purchase or auction winner)
//     event SaleCompleted(
//         uint256 indexed listingId,
//         address indexed buyer,
//         uint256 amount
//     );

//     // Emitted when the marketplace fee percentage is updated
//     event FeeUpdated(uint256 newFeeBps);

//     // Emitted when the fee recipient address is changed
//     event FeeRecipientUpdated(address newRecipient);


//     /*
//         =========================
//         CONSTRUCTOR
//         =========================
//     */

//     constructor(address _feeRecipient) Ownable(msg.sender) {
//         require(_feeRecipient != address(0), "Invalid fee recipient");
//         feeRecipient = _feeRecipient;
//     }

//     /*
//         =========================
//         ADMIN FUNCTIONS
//         =========================
//     */

//     // Allows the contract owner to update the marketplace fee percentage
//     // The fee is expressed in basis points (bps) and capped by MAX_FEE_BPS
//     function updateMarketplaceFee(uint256 newFeeBps) external onlyOwner {
//         require(newFeeBps <= MAX_FEE_BPS, "Fee exceeds max");
//         marketplaceFeeBps = newFeeBps;
//         emit FeeUpdated(newFeeBps);
//     }

//     // Allows the contract owner to change where marketplace fees are sent
//     // This can be updated to a treasury, multisig, or DAO wallet
//     function updateFeeRecipient(address newRecipient) external onlyOwner {
//         require(newRecipient != address(0), "Invalid recipient");
//         feeRecipient = newRecipient;
//         emit FeeRecipientUpdated(newRecipient);
//     }


//     /*
//         =========================
//         INTERNAL: ESCROW NFT
//         =========================
//     */

//     // Moves the NFT from the seller to the marketplace contract (escrow)
//     // This prevents the seller from transferring or re-listing the NFT
//     // while it is actively listed for sale
//     function _escrowNFT(address nft, uint256 tokenId) internal {
//         // Transfer the NFT from the seller to this marketplace contract
//         // This will fail unless the seller has approved the marketplace first
//         IERC721(nft).transferFrom(
//             msg.sender,
//             address(this),
//             tokenId
//         );

//         // Mark this NFT as currently listed to prevent double-listing
//         isListed[nft][tokenId] = true;
//     }


//     /*
//         =========================
//         CREATE AUCTION
//         =========================
//     */

//    // Creates a new auction listing for an NFT
//     // The NFT is moved into escrow and can now receive bids
//     function createAuction(
//         address nft,          // NFT contract address
//         uint256 tokenId,      // ID of the NFT to auction
//         uint256 startingBid,  // Minimum bid amount (wei)
//         uint256 duration      // How long the auction runs (seconds)
//     ) external nonReentrant {

//         // Ensure this NFT is not already listed for sale
//         require(!isListed[nft][tokenId], "NFT already listed");

//         // Ensure the auction starts with a valid minimum bid
//         require(startingBid > 0, "Starting bid must be > 0");

//         // Enforce a minimum auction duration for fairness
//         require(duration >= MIN_AUCTION_DURATION, "Auction too short");

//         // Move the NFT from the seller to the marketplace (escrow)
//         _escrowNFT(nft, tokenId);

//         // Increment counter to create a new unique listing ID
//         listingCount++;

//         // Store the auction details on-chain
//         listings[listingCount] = Listing({
//             seller: msg.sender,              // NFT owner who created the auction
//             nft: nft,                        // NFT contract address
//             tokenId: tokenId,                // NFT being sold
//             saleType: SaleType.AUCTION,      // Mark as an auction
//             highestBid: startingBid,         // Initial minimum bid
//             highestBidder: address(0),       // No bids yet
//             endTime: block.timestamp + duration, // When the auction ends
//             price: 0,                        // Not used for auctions
//             ended: false                     // Auction is active
//         });

//         // Notify frontend and indexers that a new auction was created
//         emit ListingCreated(
//             listingCount,
//             msg.sender,
//             nft,
//             tokenId,
//             SaleType.AUCTION
//         );
//     }


//     /*
//         =========================
//         CREATE FIXED PRICE SALE
//         =========================
//     */

//     // Creates a fixed-price listing for an NFT
//     // The first buyer who pays the exact price gets the NFT
//     function createFixedPriceSale(
//         address nft,       // NFT contract address
//         uint256 tokenId,   // ID of the NFT to sell
//         uint256 price      // Buy-now price (wei)
//     ) external nonReentrant {

//         // Ensure a valid price is set
//         require(price > 0, "Price must be > 0");

//         // Ensure this NFT is not already listed for sale
//         require(!isListed[nft][tokenId], "NFT already listed");

//         // Move the NFT from the seller to the marketplace (escrow)
//         _escrowNFT(nft, tokenId);

//         // Increment counter to generate a new listing ID
//         listingCount++;

//         // Store the fixed-price listing details on-chain
//         listings[listingCount] = Listing({
//             seller: msg.sender,               // NFT owner who created the listing
//             nft: nft,                         // NFT contract address
//             tokenId: tokenId,                 // NFT being sold
//             saleType: SaleType.FIXED_PRICE,   // Mark as fixed-price sale
//             highestBid: 0,                    // Not used for fixed-price sales
//             highestBidder: address(0),        // Not used for fixed-price sales
//             endTime: 0,                       // No time limit
//             price: price,                     // Buy-now price
//             ended: false                      // Listing is active
//         });

//         // Notify frontend and indexers that a fixed-price listing was created
//         emit ListingCreated(
//             listingCount,
//             msg.sender,
//             nft,
//             tokenId,
//             SaleType.FIXED_PRICE
//         );
//     }

//     /*
//         =========================
//         PLACE BID (AUCTION)
//         =========================
//     */

//     // Places a bid on an active auction listing
//     // ETH sent with the transaction (msg.value) is the bid amount
//     function placeBid(uint256 listingId) external payable nonReentrant {
//         // Load the listing from storage
//         Listing storage l = listings[listingId];

//         // Ensure this listing is an auction
//         require(l.saleType == SaleType.AUCTION, "Not auction");

//         // Ensure the auction is still active
//         require(!l.ended, "Listing ended");
//         require(block.timestamp < l.endTime, "Auction ended");

//         // New bid must be higher than the current highest bid
//         require(msg.value > l.highestBid, "Bid too low");

//         // Store previous highest bid details for refund
//         address prevBidder = l.highestBidder;
//         uint256 prevBid = l.highestBid;

//         // Update auction with the new highest bid
//         l.highestBid = msg.value;
//         l.highestBidder = msg.sender;

//         // Refund the previous highest bidder (if any)
//         if (prevBidder != address(0)) {
//             (bool refundPaid, ) = payable(prevBidder).call{value: prevBid}("");
//             require(refundPaid, "Refund failed");
//         }

//         // Notify frontend and indexers that a new bid was placed
//         emit BidPlaced(listingId, msg.sender, msg.value);
//     }

//     /*
//         =========================
//         BUY FIXED PRICE NFT
//         =========================
//     */

//     // Instantly purchases an NFT listed at a fixed price
//     // The buyer must send the exact price in ETH
//     function buy(uint256 listingId) external payable nonReentrant {
//         // Load the listing from storage
//         Listing storage l = listings[listingId];

//         // Ensure this listing is a fixed-price sale
//         require(l.saleType == SaleType.FIXED_PRICE, "Not fixed price");

//         // Ensure the listing is still active
//         require(!l.ended, "Listing ended");

//         // Buyer must send the exact listed price
//         require(msg.value == l.price, "Incorrect payment");

//         // Mark the listing as completed
//         l.ended = true;

//         // Mark the NFT as no longer listed
//         isListed[l.nft][l.tokenId] = false;

//         // Handle payouts (royalties, marketplace fee, seller)
//         // and transfer the NFT to the buyer
//         _payout(l, msg.value, msg.sender, listingId);
//     }


//     /*
//         =========================
//         END AUCTION
//         =========================
//     */

//     // Finalizes an auction after its time has expired
//     // Anyone can call this function to ensure auctions always resolve
//     function endAuction(uint256 listingId) external nonReentrant {
//         // Load the auction listing from storage
//         Listing storage l = listings[listingId];

//         // Ensure this listing is an auction
//         require(l.saleType == SaleType.AUCTION, "Not auction");

//         // Ensure the auction has not already been finalized
//         require(!l.ended, "Already ended");

//         // Ensure the auction duration has passed
//         require(block.timestamp >= l.endTime, "Auction running");

//         // Mark the auction as ended and free the NFT from listing state
//         l.ended = true;
//         isListed[l.nft][l.tokenId] = false;

//         // Case 1: No bids were placed — return NFT to the seller
//         if (l.highestBidder == address(0)) {
//             IERC721(l.nft).transferFrom(
//                 address(this),
//                 l.seller,
//                 l.tokenId
//             );

//             // Notify frontend that the listing ended without a sale
//             emit ListingCancelled(listingId);

//         // Case 2: At least one bid exists — complete the sale
//         } else {
//             // Handle payouts and transfer NFT to the auction winner
//             _payout(l, l.highestBid, l.highestBidder, listingId);
//         }
//     }


//     /*
//         =========================
//         CANCEL LISTING
//         =========================
//     */

//     // Cancels an active listing and returns the NFT to the seller
//     // Fixed-price listings can always be cancelled
//     // Auctions can only be cancelled if no bids have been placed
//     function cancelListing(uint256 listingId) external nonReentrant {
//         // Load the listing from storage
//         Listing storage l = listings[listingId];

//         // Only the original seller can cancel the listing
//         require(msg.sender == l.seller, "Not seller");

//         // Ensure the listing has not already ended
//         require(!l.ended, "Already ended");

//         // Prevent cancelling an auction that already has bids
//         // This protects bidders from losing their bids unfairly
//         require(
//             l.saleType == SaleType.FIXED_PRICE ||
//             l.highestBidder == address(0),
//             "Active auction"
//         );

//         // Mark the listing as ended and free the NFT from listing state
//         l.ended = true;
//         isListed[l.nft][l.tokenId] = false;

//         // Return the NFT from escrow back to the seller
//         IERC721(l.nft).transferFrom(
//             address(this),
//             l.seller,
//             l.tokenId
//         );

//         // Notify frontend and indexers that the listing was cancelled
//         emit ListingCancelled(listingId);
//     }


//     /*
//         =========================
//         INTERNAL: PAYOUT LOGIC
//         =========================
//     */

//     // Handles all payments and NFT transfer when a sale is completed
//     // Order: royalties → marketplace fee → seller → NFT transfer
//     function _payout(
//         Listing storage l,
//         uint256 amount,     // Total sale amount (wei)
//         address buyer,      // Address receiving the NFT
//         uint256 listingId
//     ) internal {

//         // Track how much ETH remains to be paid out
//         uint256 remaining = amount;

//         // ---- Step 1: Pay royalties (if the NFT supports ERC2981) ----
//         // Check if the NFT contract supports the royalty standard
//         if (
//             IERC165(l.nft).supportsInterface(
//                 type(IERC2981).interfaceId
//             )
//         ) {
//             // Ask the NFT contract who should receive royalties and how much
//             (address royaltyReceiver, uint256 royaltyAmount) =
//                 IERC2981(l.nft).royaltyInfo(l.tokenId, amount);

//             // Pay royalties if applicable
//             if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
//                 (bool royaltyPaid, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
//                 require(royaltyPaid, "Royalty failed");

//                 // Subtract royalties from the remaining amount
//                 remaining -= royaltyAmount;
//             }
//         }

//         // ---- Step 2: Pay marketplace fee ----
//         // Calculate fee using basis points
//         uint256 fee = (remaining * marketplaceFeeBps) / 10_000;
//         if (fee > 0) {
//             (bool feePaid, ) = payable(feeRecipient).call{value: fee}("");
//             require(feePaid, "Fee failed");

//             // Subtract fee from remaining amount
//             remaining -= fee;
//         }

//         // ---- Step 3: Pay the seller ----
//         // Send the remaining ETH to the seller
//         (bool sellerPaid, ) = payable(l.seller).call{value: remaining}("");
//         require(sellerPaid, "Seller failed");

//         // ---- Step 4: Transfer NFT to the buyer ----
//         // Move the NFT from escrow to the buyer
//         IERC721(l.nft).transferFrom(
//             address(this),
//             buyer,
//             l.tokenId
//         );

//         // Emit event indicating the sale is complete
//         emit SaleCompleted(listingId, buyer, amount);
//     }


//     /*
//         =========================
//         VIEW HELPERS
//         =========================
//     */

//     // Returns all details of a specific listing
//     // Used by the frontend to display listing information
//     function getListing(uint256 listingId) external view returns (Listing memory) {
//         return listings[listingId];
//     }

//     // Checks whether a specific NFT is currently listed for sale
//     // Helps prevent double-listing and supports frontend checks
//     function isNFTListed(address nft, uint256 tokenId) external view returns (bool) {
//         return isListed[nft][tokenId];
//     }

// }
