# Getting Started

This guide will walk you through setting up and using the Polkadot Migration Assistant for the first time.

## Prerequisites

### Hardware Requirements

- **Ledger Device** - Nano S Plus, Nano X, or Stax
- **USB Connection** - Cable to connect Ledger to your computer
- **Updated Firmware** - Latest firmware installed via Ledger Live

### Software Requirements

- **Modern Web Browser** - Chrome, Firefox, Edge, or Safari (with WebUSB support)
- **Ledger Live** - For installing the Polkadot Universal App
- **Internet Connection** - For blockchain data and transactions

## Step 1: Install Polkadot Universal App

1. **Open Ledger Live** on your computer
2. **Navigate to the Manager** tab
3. **Search for "Polkadot"** in the app catalog
4. **Install "Polkadot Universal"** app
5. **Verify installation** - The app should appear in your Ledger device apps

> 📝 **Note:** The Polkadot Universal App replaces individual chain apps (Kusama, Acala, etc.)

## Step 2: Prepare Your Ledger

1. **Connect your Ledger** to your computer via USB
2. **Unlock your device** with your PIN
3. **Open the Polkadot Universal App** on your Ledger
4. **Ensure the screen shows** "Polkadot Universal ready"

## Step 3: Access the Migration Assistant

1. **Open your web browser**
2. **Navigate to [https://polkadot.zondax.ch](https://polkadot.zondax.ch)** - The official Migration Assistant
3. **Allow browser permissions** for WebUSB when prompted
4. **Verify secure connection** - Look for HTTPS lock icon

## Step 4: Connect Your Ledger

1. **Click "Connect Ledger"** in the Migration Assistant
2. **Select your device** from the browser prompt
3. **Confirm connection** on your Ledger device if prompted
4. **Wait for connection** - You should see a success message

### Troubleshooting Connection Issues

**Ledger not detected:**

- Check USB cable connection
- Try a different USB port
- Restart your browser
- Close Ledger Live (it may conflict)

**Browser permissions denied:**

- Refresh the page and try again
- Check browser settings for USB permissions
- Try an incognito/private window

## Step 5: Account Discovery

Once connected, the Migration Assistant will:

1. **Scan for legacy apps** - Detect old Polkadot/Kusama/parachain apps
2. **Discover accounts** - Find accounts with assets across different chains
3. **Analyze balances** - Show tokens, NFTs, staking positions, and other assets
4. **Assess migration status** - Indicate which accounts need migration

### What You'll See

- **Account List** - All discovered accounts with their balances
- **Migration Status** - Green checkmarks for migrated, yellow warnings for pending
- **Asset Summary** - Total value and breakdown by asset type
- **Action Items** - Specific steps needed for each account

## Step 6: Review Migration Plan

Before starting migration:

1. **Review all accounts** - Ensure all expected accounts are detected
2. **Check asset totals** - Verify balances match your expectations
3. **Note special operations** - Some accounts may require unstaking or identity removal
4. **Understand fees** - Each transaction will require network fees

### Important Considerations

**Staking Accounts:**

- May need to unstake tokens first
- Unbonding period applies (varies by network)
- Plan for the time required

**Identity Accounts:**

- On-chain identities may need removal
- Check for parent/child relationships
- Consider impact on reputation

**Multisig Accounts:**

- Require coordination with other signers
- May need multiple approval rounds
- Plan with your co-signers

## Step 7: Begin Migration

1. **Select accounts to migrate** - Choose which accounts to process
2. **Review transaction details** - Check fees and operations
3. **Confirm on Ledger** - Verify each transaction on your device screen
4. **Monitor progress** - Watch the status updates in real-time
5. **Complete follow-up actions** - Handle any additional operations needed

### Transaction Verification

**Always verify on your Ledger:**

- Transaction type and method
- Amount being transferred
- Destination address
- Network fees
- Any additional parameters

**Never confirm if:**

- Details don't match what you expect
- Amounts seem incorrect
- Destination addresses are unfamiliar
- You're unsure about any aspect

## Step 8: Post-Migration

After successful migration:

1. **Verify account access** - Test with small transactions
2. **Update your records** - Note new derivation paths
3. **Test applications** - Ensure compatibility with wallets/dApps
4. **Backup considerations** - Your seed phrase remains the same

### Next Steps

- **Explore features** - Try staking, governance, or DeFi protocols
- **Update bookmarks** - Remove old app shortcuts
- **Share experience** - Help others with their migration

## Common Issues & Solutions

### Connection Problems

- **Device not found** → Check USB connection and browser permissions
- **App not ready** → Ensure Polkadot Universal App is open on Ledger
- **WebUSB not supported** → Try a different browser (Chrome recommended)

### Migration Errors

- **Insufficient balance** → Ensure enough tokens for fees
- **Transaction timeout** → Network congestion, try again later
- **Ledger timeout** → Complete transaction more quickly

### Account Issues

- **Missing accounts** → Check if using different seed phrase
- **Zero balances** → Verify network connectivity and data refresh
- **Wrong derivation** → Ensure using Polkadot Universal App

## Support & Resources

### Self-Help

- Review error messages carefully
- Check browser console for technical details
- Try refreshing the application
- Restart browser and reconnect Ledger

### Further Assistance

- Check official documentation
- Visit community forums
- Contact Ledger support for hardware issues
- Report bugs through official channels

---

**✅ You're ready to migrate!** Take your time, verify everything on your Ledger device, and don't hesitate to pause if you need to research anything further.
