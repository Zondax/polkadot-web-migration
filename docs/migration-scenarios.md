# Migration Scenarios & Examples

This guide provides detailed examples of common migration scenarios, complete with step-by-step instructions, expected outcomes, and troubleshooting tips.

## 📋 Overview of Migration Scenarios

### Common Migration Types

1. **🔗 Simple Balance Migration** - Basic token transfers between apps
2. **💰 Staking Account Migration** - Accounts with bonded tokens and nominations
3. **👤 Identity Account Migration** - Accounts with on-chain identities
4. **👥 Multisig Account Migration** - Multi-signature account coordination
5. **🏛️ Governance Account Migration** - Accounts with active governance participation
6. **🎨 NFT Collection Migration** - Accounts holding NFTs and collectibles
7. **💎 DeFi Position Migration** - Accounts with DeFi protocol positions
8. **🔀 Complex Mixed Migration** - Accounts with multiple asset types and operations

---

## Scenario 1: Simple Balance Migration

### Overview
The most straightforward migration scenario involving accounts with only native token balances.

### Prerequisites
- Account with DOT/KSM balance
- No staking, identity, or multisig complications
- Sufficient balance for transaction fees

### Example: Polkadot Account Migration

**Account Details:**
```
Address: 1ChFweNRLzrZsT77vYzqhTHhgFhc5fy8sZ6UnMZU1xhyGGNF
Balance: 25.5 DOT
Reserved: 0 DOT
Frozen: 0 DOT
```

**Step-by-Step Process:**

#### 1. Account Discovery
```
✅ Connect Ledger with Polkadot Legacy app
✅ Migration Assistant detects account
✅ Shows balance: 25.5 DOT available for migration
✅ No special operations required
```

#### 2. Migration Planning
```
Migration Plan:
- Operation: Balance Transfer
- From: Legacy derivation path (m/44'/354'/0'/0'/0')
- To: Universal derivation path (m/44'/354'/0'/0'/0')
- Amount: 25.49 DOT (leaving 0.01 DOT for fees)
- Estimated Fee: ~0.01 DOT
```

#### 3. Transaction Execution
```
Transaction Details:
- Method: balances.transfer
- Destination: 1ChFweNRLzrZsT77vYzqhTHhgFhc5fy8sZ6UnMZU1xhyGGNF (Universal app address)
- Amount: 254,900,000,000 (25.49 DOT in Planck units)
- Fee: 153,000,000 (~0.0153 DOT)

Ledger Verification:
□ Verify destination address matches
□ Confirm amount: 25.49 DOT
□ Check fee: ~0.0153 DOT
□ Approve transaction
```

#### 4. Completion and Verification
```
Post-Migration State:
✅ Transaction hash: 0x1234...abcd
✅ Block inclusion: #12,345,678
✅ Universal app shows balance: 25.49 DOT
✅ Legacy app shows balance: ~0.005 DOT (remaining dust)

Verification Steps:
1. Check balance in Polkadot Universal app
2. Verify transaction on polkadot.subscan.io
3. Confirm account accessible in compatible wallets
```

**Expected Duration:** 2-3 minutes  
**Complexity:** ⭐☆☆☆☆ (Very Easy)

---

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
Stash Address: HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F
Controller Address: Fh8yx2RVqniznJvyb8xmFdnKVfrJVrq8zjNJnQGXvFHgcAv
Total Bonded: 150 KSM
Active Stake: 150 KSM
Nominations: 16 validators
Unbonding: None
Rewards: ~2.5 KSM pending
```

**Step-by-Step Process:**

#### 1. Account Analysis
```
Migration Assistant Discovery:
✅ Detects stash account with active nominations
✅ Identifies controller relationship
✅ Shows bonded amount: 150 KSM
✅ Lists 16 nominated validators
⚠️ Flags: Requires unstaking before migration
```

#### 2. Pre-Migration Planning
```
Required Operations:
1. Unbond all staked tokens (150 KSM)
2. Wait for unbonding period (7 days on Kusama)
3. Withdraw unbonded tokens
4. Transfer remaining balance to Universal app

Timeline:
- Day 0: Initiate unbonding
- Day 7+: Withdraw and migrate
- Total time: ~7 days minimum
```

#### 3. Phase 1: Initiate Unbonding

```
Transaction 1: Unbond Tokens
- Method: staking.unbond
- Amount: 150,000,000,000,000 (150 KSM in Planck units)
- Fee: ~0.01 KSM

Ledger Verification:
□ Confirm operation: "Unbond"
□ Verify amount: 150 KSM
□ Check you understand 7-day waiting period
□ Approve unbonding transaction

Result:
✅ Tokens moved to "unbonding" state
✅ Era 2847 marked as withdrawal era
⏳ 7-day countdown begins
```

#### 4. Phase 2: Waiting Period

```
During Unbonding Period:
- Tokens remain locked but earn no rewards
- Cannot be withdrawn until era 2847 + 28 eras
- Account remains visible in Universal app
- Monitor progress in Migration Assistant

Monitoring Tools:
- Check unbonding status: polkadot-js/apps
- Era progress: kusama.subscan.io
- Estimated completion: [specific date/time]
```

#### 5. Phase 3: Withdrawal and Migration

```
Transaction 2: Withdraw Unbonded
- Method: staking.withdrawUnbonded
- Slashing Spans: 0 (typical for most accounts)
- Fee: ~0.01 KSM

Post-Withdrawal State:
- Unbonded tokens now in "free" balance
- Available for transfer or other operations
- Account no longer shows as "staking"

Transaction 3: Balance Migration
- Method: balances.transfer
- Amount: 149.98 KSM (keeping some for fees)
- Destination: Universal app address
- Fee: ~0.01 KSM
```

#### 6. Completion and Re-staking

```
Post-Migration Actions:
1. Verify balance in Universal app: ~149.98 KSM
2. Re-stake using Universal app if desired
3. Update validator nominations if needed
4. Monitor new staking rewards

New Staking Setup (Optional):
- Use same validators or select new ones
- Consider updated validator performance
- Set up auto-compound if available
```

**Expected Duration:** 7+ days (due to unbonding period)  
**Complexity:** ⭐⭐⭐☆☆ (Moderate - requires patience)

---

## Scenario 3: Identity Account Migration

### Overview
Migration of accounts with registered on-chain identities, requiring careful handling of identity data and deposits.

### Prerequisites
- Account with verified identity
- Understanding of deposit recovery
- Decision about identity preservation vs. removal

### Example: People Chain Identity Migration

**Account Details:**
```
Address: 14Gjs1TD93gnwEBfDMHoCgsuf1s2TVKUP6Z1qKmAP6p1o6e
Identity: "Alice Validator"
  - Display: Alice Validator
  - Legal: Alice Johnson
  - Web: https://alice-validator.com
  - Email: alice@alice-validator.com
  - Twitter: @alice_validator
Judgements: 
  - Registrar #0: Known Good
  - Registrar #1: Reasonable
Deposit: 20.258 DOT
Sub-identities: 2 (total deposit: 10.129 DOT)
```

**Migration Options:**

#### Option A: Preserve Identity (Recommended)
Identity automatically migrates with Universal app - no action needed.

#### Option B: Remove Identity and Recover Deposits

**Step-by-Step Process:**

#### 1. Identity Analysis
```
Migration Assistant Discovery:
✅ Detects on-chain identity
✅ Shows identity details and judgements
✅ Calculates total deposits: 30.387 DOT
⚠️ Warns about identity removal consequences
⚠️ Checks for sub-identity dependencies
```

#### 2. Pre-Removal Considerations
```
Important Decisions:
□ Do you want to preserve reputation and judgements?
□ Are sub-identities still needed?
□ Do services depend on your verified identity?
□ Is deposit recovery worth losing verification?

Dependencies Check:
- Validator identity for commission/trust
- DeFi protocol whitelisting
- NFT marketplace verification
- DAO membership recognition
```

#### 3. Sub-Identity Management

```
Sub-Identity 1: 13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB
- Name: "Alice Stash"
- Deposit: 5.0645 DOT

Sub-Identity 2: 15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5
- Name: "Alice Pool"  
- Deposit: 5.0645 DOT

Required Actions:
1. Clear sub-identity 1: clearIdentity transaction
2. Clear sub-identity 2: clearIdentity transaction  
3. Remove main identity: clearIdentity transaction
```

#### 4. Identity Removal Process

```
Transaction 1: Clear Sub-Identity 1
- Method: identity.clearIdentity
- Account: 13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB
- Deposit Recovery: 5.0645 DOT

Transaction 2: Clear Sub-Identity 2  
- Method: identity.clearIdentity
- Account: 15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5
- Deposit Recovery: 5.0645 DOT

Transaction 3: Clear Main Identity
- Method: identity.clearIdentity  
- Account: 14Gjs1TD93gnwEBfDMHoCgsuf1s2TVKUP6Z1qKmAP6p1o6e
- Deposit Recovery: 20.258 DOT

Total Deposit Recovery: 30.387 DOT
```

#### 5. Migration Completion

```
Post-Identity-Removal State:
✅ All identity data cleared from chain
✅ Deposits recovered: 30.387 DOT
✅ Account balance increased
❌ Verification status lost
❌ Judgements no longer valid

Final Migration:
- Method: balances.transfer
- Amount: [original balance + 30.387 DOT - fees]
- Destination: Universal app address

Post-Migration:
□ Re-register identity in Universal app if desired
□ Request new judgements from registrars
□ Update service configurations
□ Notify community of address change
```

**Expected Duration:** 30-60 minutes  
**Complexity:** ⭐⭐⭐⭐☆ (Advanced - requires careful planning)

---

## Scenario 4: Multisig Account Migration

### Overview
Migration of multi-signature accounts requiring coordination between multiple signatories.

### Prerequisites
- Access to multiple Ledger devices or coordination with co-signers
- Understanding of multisig thresholds
- Communication channel with all participants

### Example: 2-of-3 Treasury Multisig Migration

**Multisig Details:**
```
Multisig Address: 13YMK2RgeSTHzANQWCrPGPb7CbsWz32HQ9E3Qz6QZ4qHQP2b
Threshold: 2 of 3 signatories
Balance: 1,000 DOT
Signatories:
  - 14Gjs1TD93gnwEBfDMHoCgsuf1s2TVKUP6Z1qKmAP6p1o6e (Alice - Internal)
  - 15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5 (Bob - External)  
  - 13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB (Carol - External)
Pending Calls: None
```

**Step-by-Step Process:**

#### 1. Coordination Planning

```
Pre-Migration Coordination:
□ Contact all signatories (Bob and Carol)
□ Schedule coordination session
□ Share Migration Assistant documentation
□ Agree on migration timeline
□ Establish communication channel

Required Information Shared:
- Multisig address to migrate
- New destination address (Universal app)
- Migration amount and fee estimates
- Signature coordination process
```

#### 2. Migration Initiation (Alice)

```
Alice's Actions (Internal Signatory):
1. Connect Ledger with Migration Assistant
2. Select multisig account for migration
3. Initiate migration transaction

Transaction Details:
- Method: balances.transfer (via multisig)
- From: 13YMK2RgeSTHzANQWCrPGPb7CbsWz32HQ9E3Qz6QZ4qHQP2b
- To: [Universal app multisig address]
- Amount: 999.98 DOT
- Call Hash: 0x8a4b2c3d...

First Approval:
- Method: multisig.approveAsMulti
- Threshold: 2
- Other Signatories: [Bob, Carol]
- Call Hash: 0x8a4b2c3d...
- Max Weight: 1,000,000,000

Result:
✅ Call initiated and stored on-chain
✅ Alice's approval recorded (1/2 required)
⏳ Waiting for second approval
```

#### 3. External Signatory Coordination

```
Communication to Bob and Carol:
"Migration transaction initiated:
- Call Hash: 0x8a4b2c3d...
- Amount: 999.98 DOT  
- Destination: [Universal app address]
- Need 1 more approval to execute
- Please approve at your earliest convenience"

Bob's Options:
A) Approve via Migration Assistant (if available)
B) Approve via Polkadot-JS Apps
C) Approve via other compatible wallet

Approval Transaction (Bob):
- Method: multisig.approveAsMulti
- Call Hash: 0x8a4b2c3d...
- Max Weight: 1,000,000,000
```

#### 4. Final Execution

```
After Bob's Approval:
✅ Threshold reached (2/2 approvals)
✅ Transaction automatically executes
✅ 999.98 DOT transferred to Universal app
✅ Multisig account shows reduced balance

Verification Steps:
1. Check multisig balance: ~0.02 DOT remaining
2. Verify transfer transaction on block explorer
3. Confirm Universal app shows increased balance
4. Update multisig access with Universal app

Post-Migration Multisig Setup:
□ Configure multisig access in Universal app
□ Test signing with new derivation paths  
□ Update operational procedures
□ Document new multisig configuration
```

**Expected Duration:** 1-4 hours (depending on coordination)  
**Complexity:** ⭐⭐⭐⭐⭐ (Expert - requires coordination)

---

## Scenario 5: Complex Mixed Migration

### Overview
Migration of an account with multiple asset types, operations, and complications.

### Prerequisites
- Advanced understanding of all migration components
- Significant time allocation (potentially weeks)
- Patience for complex multi-step process

### Example: Power User Account Migration

**Account Overview:**
```
Primary Address: 12xtAYsRUrmbniiWQqJtECiBQrMn8AypQcXhnQAqaneC5a
Account Type: Multi-functional power user

Assets:
- DOT Balance: 5,000 DOT
- Staked DOT: 10,000 DOT (across 3 validators)
- Unbonding: 2,000 DOT (5 days remaining)
- Reserved: 150 DOT (democracy locks)

Positions:
- Identity: Verified with 3 judgements
- Sub-identities: 5 accounts  
- Governance: 3 active referenda votes
- Proxy: 2 proxy relationships

NFTs & Collectibles:
- Statemine NFTs: 15 items across 3 collections
- Unique Network: 8 collectibles

DeFi Positions:
- Acala: Liquid staking position (1,500 LDOT)
- HydraDX: Liquidity provision (DOT/HDX pool)
- Bifrost: Cross-chain staking derivatives

Multisig Participation:
- Treasury multisig: 1 of 5 signatories
- DAO multisig: 2 of 3 signatories
```

**Migration Strategy:**

#### Phase 1: Assessment and Planning (Day 1)

```
Comprehensive Analysis:
1. Document all asset locations and amounts
2. Identify required operations and dependencies  
3. Calculate total fees and timeline
4. Coordinate with multisig participants
5. Plan DeFi position exits if needed

Migration Timeline:
- Immediate: Simple balance transfers
- Week 1: Staking operations and governance
- Week 2: Identity and proxy management
- Week 3: DeFi position migrations
- Week 4: Final cleanup and verification

Risk Assessment:
□ Staking rewards interruption
□ Governance vote lock periods
□ DeFi position value changes
□ Multisig coordination challenges
□ Network congestion during migration
```

#### Phase 2: Immediate Operations (Days 1-2)

```
Priority 1: Free Balance Migration
- Amount: 5,000 DOT → Universal app
- Complexity: Low
- Duration: Minutes

Priority 2: NFT Transfers
- Statemine collections: Use batch transfer
- Unique Network: Individual transfers
- Duration: 1-2 hours
- Note: Verify metadata preservation

Priority 3: Simple Proxy Transfers
- Non-governance proxies only
- Complex proxies require coordination
- Duration: 30 minutes
```

#### Phase 3: Staking Operations (Days 3-10)

```
Current Staking State:
- Active: 10,000 DOT
- Unbonding: 2,000 DOT (5 days remaining)
- Validators: 16 nominees across 3 staking positions

Operations Required:
1. Wait for current unbonding (5 days)
2. Withdraw unbonded tokens (2,000 DOT)
3. Unbond active stake (10,000 DOT)  
4. Wait for new unbonding period (28 days)
5. Withdraw and migrate remaining stake

Alternative Approach:
- Consider liquid staking options
- Evaluate keeping some positions active
- Gradual migration to minimize reward loss
```

#### Phase 4: Governance and Identity (Days 10-14)

```
Governance Positions:
- Referendum #127: 1,000 DOT locked (ends in 12 days)
- Referendum #128: 500 DOT locked (ends in 8 days)  
- Referendum #129: 750 DOT locked (ends in 20 days)

Strategy:
- Wait for lock expiration before migration
- Consider delegating future votes
- Plan for conviction cooldown periods

Identity Management:
- Preserve main identity (transfers automatically)
- Migrate sub-identities individually
- Coordinate with judgment registrars
- Update service configurations
```

#### Phase 5: DeFi Position Migration (Days 14-21)

```
Acala Liquid Staking:
1. Unstake 1,500 LDOT → DOT
2. Transfer DOT to Universal app
3. Re-stake using Universal app tools

HydraDX Liquidity:
1. Remove liquidity from DOT/HDX pool
2. Migrate retrieved DOT
3. Consider re-adding liquidity

Bifrost Derivatives:
1. Redeem derivative tokens
2. Claim underlying assets
3. Migrate or re-invest as desired

Risk Considerations:
□ Market price changes during migration
□ Pool liquidity availability
□ Cross-chain bridge delays
□ Protocol-specific migration tools
```

#### Phase 6: Final Cleanup (Days 21-28)

```
Remaining Operations:
1. Final staking withdrawals
2. Cleanup dust balances
3. Verify all asset migrations
4. Update all service configurations
5. Documentation and backup

Verification Checklist:
□ All major assets migrated successfully
□ Universal app shows expected balances
□ Legacy accounts show minimal dust only
□ All services updated with new addresses
□ Migration documentation completed

Post-Migration Optimization:
- Consolidate similar positions
- Optimize staking setup
- Review and update security practices
- Plan ongoing management workflows
```

**Expected Duration:** 3-4 weeks  
**Complexity:** ⭐⭐⭐⭐⭐ (Expert level - comprehensive planning required)

---

## 🔧 Migration Tools and Utilities

### Batch Operation Tools

```javascript
// Example: Batch NFT Transfer
const batchNFTTransfer = {
  method: 'utility.batch',
  calls: [
    api.tx.nfts.transfer(collection1, item1, destination),
    api.tx.nfts.transfer(collection1, item2, destination),
    api.tx.nfts.transfer(collection2, item3, destination)
  ]
};

// Estimate total fees
const totalFee = await api.tx.utility.batch(calls).paymentInfo(signer);
```

### Migration Progress Tracking

```typescript
interface MigrationProgress {
  totalOperations: number;
  completedOperations: number;
  failedOperations: string[];
  estimatedCompletion: Date;
  currentPhase: MigrationPhase;
}

// Track progress through complex migration
const progress = useMigrationProgress();
progress.updatePhase('staking-operations');
progress.markOperationComplete('unbond-tokens');
```

### Fee Estimation Calculator

```typescript
// Calculate total migration costs
function estimateTotalFees(operations: MigrationOperation[]): FeeEstimate {
  let totalFee = BigNumber(0);
  
  for (const op of operations) {
    switch (op.type) {
      case 'transfer':
        totalFee = totalFee.plus(TRANSFER_FEE);
        break;
      case 'unstake':
        totalFee = totalFee.plus(STAKING_FEE);
        break;
      case 'multisig':
        totalFee = totalFee.plus(MULTISIG_FEE.times(op.threshold));
        break;
    }
  }
  
  return {
    total: totalFee.toString(),
    breakdown: operations.map(op => ({
      operation: op.type,
      fee: getFeeForOperation(op)
    }))
  };
}
```

---

## 📊 Common Migration Patterns

### Pattern 1: Gradual Migration
**Best for:** Large account holders, active stakers
- Migrate liquid assets first
- Plan staking operations around reward cycles
- Maintain some positions in legacy apps temporarily

### Pattern 2: Complete Migration
**Best for:** Simple accounts, users wanting clean break
- Move all assets in coordinated operation
- Accept potential temporary losses for simplicity
- Complete migration in single session

### Pattern 3: Hybrid Approach  
**Best for:** Complex accounts with mixed requirements
- Migrate based on asset type priority
- Coordinate timing with market conditions
- Optimize for minimal disruption

---

## ⚠️ Important Considerations

### Timing Considerations
- **Network Congestion:** Higher fees during peak times
- **Era Boundaries:** Staking operations timing
- **Governance Periods:** Vote lock expiration timing
- **Market Conditions:** DeFi position value optimization

### Risk Management
- **Start Small:** Test with small amounts first
- **Document Everything:** Keep detailed records
- **Have Backups:** Multiple recovery options
- **Stay Informed:** Monitor network announcements

### Coordination Requirements
- **Multisig Participants:** Clear communication essential
- **Service Providers:** Notify of address changes
- **Community Roles:** Update governance participation
- **DeFi Protocols:** Check migration support

---

## 🎯 Success Metrics

### Migration Success Indicators
- ✅ All intended assets successfully migrated
- ✅ Universal app shows expected balances
- ✅ All operations completed without errors
- ✅ Services updated with new addresses
- ✅ No significant value loss during migration

### Post-Migration Verification
1. **Balance Verification:** Compare pre/post migration totals
2. **Functionality Testing:** Verify all operations work
3. **Service Integration:** Test wallet/dApp compatibility
4. **Security Review:** Confirm no unexpected access
5. **Documentation Update:** Record new configurations

Each migration scenario requires careful planning and execution. Take your time, verify every step, and don't hesitate to seek help when needed. The goal is a successful migration that maintains all your assets and positions while gaining the benefits of the Universal Ledger app.