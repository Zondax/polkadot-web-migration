# User Workflows

This guide outlines the main user flows for the core features of the app: **Staking**, **Identity**, and **Multisig**. Each section describes what you can view, initiate, or manage, so you can understand exactly how to interact with the app.

---

## 🔗 Staking

### 1. View Staking Information

#### 1.1 View Current Staking Balance
- See your total and active staked amounts
- View your controller address
- Check if your account is eligible to unstake

#### 1.2 View Unbonding (Unlocking) Information
- List all unbonding chunks with their respective amounts
- Display remaining time per chunk (based on blockchain eras)
- Highlight chunks ready for withdrawal
- Times are shown in a user-friendly format (days/hours)

### 2. Unstake Tokens

#### 2.1 Start Unstaking
- Confirm the account is eligible to unstake
- Enter the amount to unstake (with form validation)
- See your currently available stake

#### 2.2 Fee Estimation & Validation
- View estimated transaction fees
- Ensure you have enough balance for fees
- Receive feedback if balance is insufficient

#### 2.3 Complete Unstake Transaction
- Sign the transaction using a Ledger device
- Submit the transaction to the blockchain
- Monitor status (pending → in block → finalized)
- UI updates automatically to reflect results
- Errors are handled gracefully

### 3. Withdraw Unbonded Tokens

#### 3.1 Identify Withdrawable Funds
- Show which unbonded chunks are ready
- Validate the unbonding period is completed
- Display total withdrawable amount

#### 3.2 Withdraw Funds
- Estimate transaction fees
- Sign and submit the withdrawal transaction
- Monitor transaction status and handle any errors

#### 3.3 After Withdrawal
- Refresh your account balance
- Clear out withdrawn chunks
- Update the staking info display

### 4. Staking Error Handling
- Show clear messages for failed unstaking actions
- Handle insufficient balance and permission errors

---

## 👤 Identity

### 1. View Identity Information

#### 1.1 Basic Identity Details
- Display: name, legal name, email, website
- Social: Twitter handle, PGP fingerprint

#### 1.2 Parent-Child Relationships
- Show parent identity (if present)
- Display parent account and name
- Indicate if identity is removable (only if no parent exists)

#### 1.3 Sub-Identities
- List sub-accounts under your identity
- Show deposits for each
- Count total sub-accounts

### 2. Remove Identity

> ⚠️ **Important:** You must have no parent account to remove an identity.

#### 2.1 Check Eligibility
- Ensure the identity has no parent
- Validate permissions
- Inform about restrictions for sub-identities

#### 2.2 Estimate Removal Fees
- Calculate expected transaction costs
- Show estimated fee to user
- Handle any calculation issues

#### 2.3 Submit Identity Removal
- Prepare and sign the transaction using Ledger
- Submit via People chain RPC
- Track transaction and show results
- Handle any errors during submission

### 3. Identity Transactions

#### 3.1 Track Transactions
- Show status: signing → submitted → confirmed
- Display transaction hash and block info

#### 3.2 After Identity Removal
- Refresh account data
- Remove identity data from UI

### 4. Identity Error Handling
- Show clear reasons for removal restrictions (e.g., parent identity exists)
- Manage permission issues and network errors
- Handle transaction failures and Ledger issues

---

## 👥 Multisig

### 1. Discover and Display Multisig Accounts

#### 1.1 Identify Multisig Addresses
- Detect addresses tied to your account
- Fetch and display data from Subscan
- Show balances and tokens for multisig accounts

#### 1.2 Multisig Membership
- Display threshold (required approvals)
- Show list of signatories and their sources (internal/external)
- Indicate which are internal (same Ledger device)

#### 1.3 View Pending Multisig Calls
- List all pending actions per multisig address
- Show call hash, initiating user, and deposit info
- Indicate approvals needed and remaining

### 2. Multisig Migration

#### 2.1 First Approval (`approveAsMulti`)
- Triggered by clicking the **Migrate** button
- Sign using Ledger
- Submit and track status
- Display call data from result

#### 2.2 Sync and Handle Additional Approvals
- Refresh to view updated status and approvals

### 3. Multisig Call Approvals

#### 3.1 Approve Existing Calls (more than one missing approval)
- Display pending calls
- Verify call data integrity
- Prepare `approveAsMulti` transaction

#### 3.2 Execute Final Call (`asMulti`)
- Used when only one signature remains

### 4. Multisig Coordination (Across Devices)

#### 4.1 Handle External Signers
- Show which members are external
- Display current approval status
- Guide on coordination with other users/devices
- Notifications for pending actions

### 5. Multisig Asset Management

#### 5.1 Send Assets from Multisig
- Prepare and send native tokens or NFTs
- Support batch transfers

#### 5.2 Manage Balances
- Display current and locked balances
- Update UI after transactions
- Handle visibility and access controls

---

## Common Patterns

### Transaction Flow
1. **Preparation** - Validate inputs and estimate fees
2. **Signing** - Use Ledger device to sign transaction
3. **Submission** - Submit to blockchain network
4. **Monitoring** - Track status until finalization
5. **Updates** - Refresh UI to reflect changes

### Error Handling
- Clear, user-friendly error messages
- Specific guidance for resolution
- Graceful fallbacks for network issues
- Ledger device communication errors