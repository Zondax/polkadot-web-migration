---
title: 'Migration Scenarios'
sidebar_position: 4
---

# Migration Scenarios

This guide provides detailed examples of common migration scenarios, complete with step-by-step instructions, expected outcomes, and troubleshooting tips.

### Common Scenarios

1. **Simple Balance Migration** - Basic token transfers between apps
2. **Staking Account Migration** - Accounts with bonded tokens and nominations
3. **Identity Account Migration** - Accounts with on-chain identities
4. **Multisig Account Migration** - Multi-signature account coordination
6. **NFT Collection Migration** - Accounts holding NFTs and collectibles

## Scenario 1: Simple Balance Migration

### Overview
The most straightforward migration scenario involving accounts with only native token.

### Prerequisites
- Account with balance
- No staking, identity, or multisig complications
- Sufficient balance for transaction fees

### Example: Kusama Account Migration

**Account Details:**

```
Address: AAA...AAA
Balance: 25.5 KSM
Reserved: 0 KSM
Frozen: 0 KSM
```

**Step-by-Step Process:**

#### 1. Sync your accounts
```
✅ Connect Ledger with Polkadot Legacy app
✅ Migration Assistant detects account
```

#### 2. Select the account to migrate

| | Source Address | Destination | Total Balance | Transferable | Staked | Reserved | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ✅ | AAA...AAA | BBB..BBB | 25.5 KSM | 25.49 KSM | - | - | Ready to migrate |

#### 3. Migrate

```
1. Verify destination address on your device
2. Check the transaction details
3. Approve the transaction
```

#### 4. Completion and Verification
```
1. Watch transaction status live. 
2. If transaction is successful, close Migration Assistant.
```

## Scenario 2: Staking Account Migration

### Overview
Migration of accounts with active staking positions, requiring unstaking and withdrawal operations.

### Prerequisites
- Account with bonded tokens
- Understanding of unbonding periods
- Patience for waiting periods (up to 28 days)

### Example: Kusama Validator Nomination Migration

**Account Details:**

```
Address: AAA...AAA
Total: 100 KSM
Bonded: 90 KSM
Unbonding: 0 KSM
Available: 10 KSM
```

**Step-by-Step Process:**

#### 1. Sync your accounts
```
✅ Connect Ledger with Polkadot Legacy app
✅ Migration Assistant detects account
```

#### 2. Select the account to migrate

| | Source Address | Destination | Total Balance | Transferable | Staked | Reserved | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ⏳ | AAA...AAA | BBB..BBB | 100 KSM | 10 KSM | 90 KSM | - | `Unstake` |

- Press `Unstake` to open the unstaking dialog.
- Confirm the unstaking transaction in the dialog.
- Wait for the unbonding period (up to 28 days).

#### 3. Withdraw unbonded funds
```
1. After unbonding, withdraw funds to make them transferable.
2. Confirm withdrawal transaction.
```

#### 4. Migrate
```
1. Select account again (now fully transferable).
2. Proceed as in Scenario 1.
```

## Scenario 3: Identity Account Migration

### Overview
Migration of accounts with on-chain identity set.

### Prerequisites
- Account with on-chain identity
- Ready to remove identity before migration

### Example: Kusama Identity Removal and Migration

**Account Details:**

```
Address: AAA...AAA
Identity: Alice | alice@kusama.network
Balance: 50 KSM
```

**Step-by-Step Process:**

#### 1. Sync your accounts
```
✅ Connect Ledger with Polkadot Legacy app
✅ Migration Assistant detects account
```

#### 2. Select the account to migrate

| | Source Address | Destination | Total Balance | Transferable | Staked | Reserved | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ✅ | AAA...AAA | BBB..BBB | 50 KSM | 50 KSM | - | - | `Remove Identity` |

- Press `Remove Identity` to open the confirmation dialog.
- Confirm the removal transaction in the dialog.

#### 3. Migrate
```
1. Select account again (identity removed).
2. Proceed as in Scenario 1.
```

---

## Scenario 4: NFT Collection Migration

### Overview
Migration of accounts holding NFTs and collectibles.

### Prerequisites
- Account with NFTs
- NFTs supported by migration tool

### Example: Kusama NFT Migration

**Account Details:**

```
Address: AAA...AAA
NFTs: Kanaria Egg #123, RMRK Art #456
Balance: 5 KSM
```

**Step-by-Step Process:**

#### 1. Sync your accounts
```
✅ Connect Ledger with Polkadot Legacy app
✅ Migration Assistant detects account
```

#### 2. Select NFTs to migrate

| | Source Address | Destination | NFTs | Actions |
| --- | --- | --- | --- | --- |
| ✅ | AAA...AAA | BBB..BBB | NFT #123 | Ready to migrate |
| ⬜️ | AAA...AAA | BBB..BBB | NFT #456 | Ready to migrate |

- Select the NFTs you want to migrate.
- Proceed with migration as in Scenario 1.

---

## Scenario 5: Multisig Account Migration

### Overview
Migration of multi-signature accounts, requiring coordination between multiple signers.

### Prerequisites
- Multisig account setup
- All signers available for transaction approval

### Example: Kusama Multisig Migration

**Account Details:**

```
Normal Address: AAA...AAA
Multisig Address: MMM...MMM
Signers: AAA...AAA, DDD...DDD, EEE...EEE
Balance: 20 KSM
Threshold: 2 of 3
```

**Step-by-Step Process:**

#### 1. Sync your accounts
```
✅ Connect Ledger with Polkadot Legacy app
✅ Migration Assistant detects both normal and multisig accounts
```

#### 2. View accounts

**Normal Accounts:**
| | Source Address | Destination | Total Balance | Transferable | Staked | Reserved | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ✅ | AAA...AAA | BBB..BBB | 20 KSM | 20 KSM | - | - | Ready to migrate |

**Multisig Accounts:**
| | Source Address | Destination | Signatory Address | Total Balance | Transferable Balance | Staked | Reserved | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ⬜️ | MMM...MMM | BBB..BBB | AAA...AAA | 20 KSM | 20 KSM | - | - | `Multisig Call` |

- If there are pending calls, press **Pending Calls** to open the approval dialog.
- If you are a signer, approve the pending multisig call.
- If not, wait for other signers to approve.

#### 3. Migrate
```
1. Once there are no pending calls, the "Ready to migrate" action appears.
2. Proceed as in Scenario 1.
```

---
