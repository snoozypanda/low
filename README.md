# HowLow Auction Platform - User Guide

Welcome to HowLow, Ethiopia's premier online auction platform where users bid on exciting products with a unique entry-based system!

## 🎯 Core Concept

HowLow uses a **pay-to-enter** auction model instead of traditional bidding. Users purchase entries (like lottery tickets) for each auction, and the winner is determined by a combination of entry count and bidding strategy.

## 📋 How It Works

### 1. Auction Structure
- Each auction has a **retail value**, **entry fee**, and **maximum entries per user**
- Users can buy multiple entries (up to the max limit per user)
- Each entry gives you one chance to win, but also affects your bidding power

### 2. Entry Process
- **Step 1**: Browse available auctions in the "Auctions List"
- **Step 2**: Select an auction and click "Enter Auction"
- **Step 3**: Pay the entry fee (e.g., ETB 20 for a phone auction)
- **Step 4**: You now have one entry for this auction
- **Step 5**: You can buy additional entries (up to the max limit, currently **3 entries per user**)

### 3. Bidding Mechanics
- **Entry-Based Bidding**: Your number of entries determines your bidding range
- **Bid Range**: Each auction has a minimum and maximum bid amount
- **Bid Step**: Bids increase in fixed increments (e.g., ETB 0.01)
- **Winning Logic**: The highest bidder wins, but only if they have sufficient entries

### 4. Key Rules & Limits
- **Max Entries Per User**: **3 entries per auction** (this is the current limit)
- **Entry Fee**: Varies by auction (ETB 5-20 typically)
- **Bid Minimum**: Starting bid amount for the auction
- **Bid Maximum**: Highest possible bid (usually capped at retail value)
- **Bid Step**: Minimum increment between bids
- **Minimum Entries**: Auctions require a minimum number of total entries to proceed

### 5. Auction Lifecycle

| Stage | Description | Duration |
|-------|-------------|----------|
| **Upcoming** | Auction is scheduled but hasn't started yet | Before start time |
| **Live** | Active auction where users can enter and bid | During auction period |
| **Closed** | Auction has ended, winner determined | After end time |
| **Cancelled** | Auction cancelled due to insufficient entries | If minEntries not met |
| **Void** | Auction manually voided by admin | Admin action |

### 6. Winning & Payout
- **Winner Selection**: Highest valid bidder wins the auction
- **Payment**: Winner pays the winning bid amount + any applicable fees
- **Delivery**: Physical items delivered to Addis Ababa; digital vouchers delivered electronically
- **Warranty**: Most items include 1-2 year warranty

### 7. User Dashboard Features
- **My Entries**: Track all your auction entries
- **Bid History**: View your bidding activity
- **Auction Status**: Real-time status updates (live, upcoming, closed)
- **Countdown Timer**: Visual timer showing time remaining in live auctions

### 8. Admin Features
- **Auction Management**: Create, edit, and manage auctions
- **Entry Monitoring**: Track total entries and user limits
- **Payout Processing**: Handle winner payments and payouts
- **Audit Logs**: Complete history of all auction activities

## 💡 Why HowLow is Different

✅ **Fair Access**: Everyone has equal opportunity regardless of financial status
✅ **Risk Management**: Users only pay for entries, not the full retail price
✅ **Engagement**: Multiple entries increase excitement and participation
✅ **Ethiopian Focus**: Designed specifically for Ethiopian market with local currency (ETB) and delivery
✅ **Transparency**: Clear rules, countdown timers, and real-time updates

## 🚀 Getting Started

1. **Sign up** with your Ethiopian phone number
2. **Browse** upcoming and live auctions
3. **Enter** your first auction (pay the entry fee)
4. **Bid** strategically within your entry limits
5. **Win** and enjoy your prize!

## 📱 Technical Highlights
- Built with modern React/Vite stack
- Real-time auction updates with countdown timers
- Ethiopian language support (Amharic translations)
- Secure payment processing
- Responsive design for mobile and desktop

---

*HowLow Auction Platform v1.0 • Made for Ethiopia, by Ethiopians*

For support: support@howlow.et | +251 900 000 000