# Network-Specific Migration Guides

This comprehensive guide provides detailed information for migrating accounts across all supported networks in the Polkadot ecosystem.

## 🌐 Supported Networks Overview

### Network Status Categories

**🟢 Fully Supported (Launch Day)**
- Complete migration support
- All features available
- Extensive testing completed

**🟡 Progressive Rollout**  
- Basic migration support
- Some features may be limited
- Ongoing development and testing

**🔴 Planned Support**
- Future migration support planned
- Currently not supported
- Development in progress

---

## 🔗 Polkadot Relay Chain

### Network Information
```
Network: Polkadot
Chain ID: polkadot
Status: 🟢 Fully Supported
Token: DOT (10 decimals)
Existential Deposit: 1 DOT
Block Time: ~6 seconds
Unbonding Period: 28 days
```

### Migration Specifics

#### Legacy App Compatibility
```
Supported Legacy Apps:
✅ Polkadot (original Ledger app)
✅ Legacy derivation paths supported
✅ Account discovery across all common paths

Derivation Paths:
- Legacy: m/44'/354'/0'/0'/X'
- Universal: m/44'/354'/0'/0'/X'  
- Compatible: Yes (same path structure)
```

#### Staking Considerations
```
Staking Migration Process:
1. Current nominations: Preserved during migration
2. Unbonding period: 28 days (28 eras × ~24 hours)
3. Minimum stake: 250 DOT (dynamic, check current)
4. Maximum nominators: 22,500 (may change)

Staking Timeline:
- Era 0: Initiate unbonding
- Era 28: Tokens become withdrawable
- Migration: Can proceed after withdrawal

Best Practices:
□ Monitor validator performance during unbonding
□ Consider partial unbonding for large positions
□ Plan migration around reward payment cycles
□ Keep some DOT for transaction fees
```

#### Identity Migration
```
Identity System:
- Location: Polkadot Relay Chain → People Chain
- Automatic migration: Yes (for most identities)
- Manual intervention: Required for complex cases

Migration Process:
1. Identity data automatically migrated to People Chain
2. Judgements preserved during migration
3. Sub-identities migrated with parent
4. Deposits remain on original accounts

Post-Migration Verification:
□ Check identity on People Chain
□ Verify judgements transferred correctly
□ Confirm sub-identity relationships
□ Test identity display in applications
```

#### Common Operations

**Balance Transfer:**
```typescript
// Typical Polkadot balance migration
const transferTx = api.tx.balances.transfer(
  destinationAddress,     // Universal app address
  '1000000000000'        // 100 DOT (in Planck units)
);

Fee Estimate: ~0.01 DOT
Confirmation Time: 1-2 blocks (6-12 seconds)
```

**Staking Operations:**
```typescript
// Unbond staked tokens
const unbondTx = api.tx.staking.unbond('5000000000000'); // 500 DOT

// Withdraw after unbonding period
const withdrawTx = api.tx.staking.withdrawUnbonded(0);

Typical Fees:
- Unbond: ~0.01 DOT
- Withdraw: ~0.01 DOT
```

---

## 🏛️ Kusama Relay Chain

### Network Information
```
Network: Kusama
Chain ID: kusama  
Status: 🟢 Fully Supported
Token: KSM (12 decimals)
Existential Deposit: 0.01 KSM
Block Time: ~6 seconds
Unbonding Period: 7 days
```

### Migration Specifics

#### Legacy App Compatibility
```
Supported Legacy Apps:
✅ Kusama (original Ledger app)
✅ All derivation path variants
✅ Complete account discovery

Derivation Paths:
- Legacy: m/44'/434'/0'/0'/X'
- Universal: m/44'/434'/0'/0'/X'
- Compatible: Yes
```

#### Kusama-Specific Features

**Faster Unbonding:**
```
Staking Parameters:
- Unbonding period: 7 days (28 eras × ~6 hours per era)
- Minimum stake: ~1 KSM (dynamic)
- Era duration: ~6 hours

Migration Advantages:
- Faster staking operations compared to Polkadot
- Lower existential deposit requirements
- More experimental features available
```

**Governance Participation:**
```
Democracy Features:
- Referendum voting: More frequent than Polkadot
- Conviction voting: Longer lock periods possible
- Council elections: Regular participation opportunities

Migration Considerations:
□ Check active governance locks
□ Plan around referendum cycles
□ Consider delegation options
□ Monitor conviction cooldowns
```

#### Common Fee Structure
```
Typical Transaction Fees:
- Transfer: ~0.01 KSM
- Staking operations: ~0.01 KSM  
- Governance votes: ~0.01 KSM
- Identity operations: ~0.1 KSM
- Multisig operations: ~0.02 KSM per signatory
```

---

## 💎 AssetHub (Polkadot)

### Network Information
```
Network: AssetHub Polkadot
Chain ID: asset-hub-polkadot
Status: 🟢 Fully Supported
Token: DOT (fees), Assets (various)
Existential Deposit: 0.1 DOT
Block Time: ~12 seconds
```

### Migration Specifics

#### Asset Types Supported
```
Native Assets:
✅ DOT (native token for fees)
✅ USDT (Tether USD)
✅ USDC (USD Coin)  
✅ More assets being added regularly

Asset Discovery:
- Automatic detection of all asset balances
- Support for both fungible and non-fungible tokens
- Metadata preservation during migration
```

#### NFT Collections
```
Supported NFT Standards:
✅ Unique Network NFTs (migrated from separate chain)
✅ AssetHub native NFTs
✅ Collection metadata and traits
✅ Ownership verification

Migration Process:
1. Discover all NFT collections and items
2. Verify ownership and metadata
3. Batch transfer for efficiency
4. Confirm successful migration

NFT Migration Features:
□ Bulk transfer capabilities
□ Metadata preservation
□ Trait and rarity data maintained
□ Collection integrity verification
```

#### Asset-Specific Operations

**Multi-Asset Transfer:**
```typescript
// Transfer multiple assets in single transaction
const batchTx = api.tx.utility.batch([
  api.tx.assets.transfer(1984, destination, '1000000'), // USDT
  api.tx.assets.transfer(1337, destination, '500000'),  // USDC
  api.tx.balances.transfer(destination, '1000000000')   // DOT
]);
```

**NFT Transfer:**
```typescript
// Transfer NFT collection items
const nftTransfer = api.tx.nfts.transfer(
  collectionId,    // Collection identifier
  itemId,          // Specific NFT item
  destination      // Recipient address
);
```

---

## 🏛️ AssetHub (Kusama)

### Network Information
```
Network: AssetHub Kusama
Chain ID: asset-hub-kusama
Status: 🟢 Fully Supported
Token: KSM (fees), Assets (various)
Existential Deposit: 0.01 KSM
Block Time: ~12 seconds
```

### Migration Specifics

#### Kusama Asset Ecosystem
```
Popular Assets:
✅ KSM (native)
✅ RMRK tokens and NFTs
✅ Various parachain tokens
✅ Experimental assets

Asset Migration:
- Lower fees compared to Polkadot AssetHub
- More experimental asset types supported
- Active developer community
```

---

## 👥 People Chain (Polkadot)

### Network Information
```
Network: People Chain Polkadot
Chain ID: people-polkadot
Status: 🟢 Fully Supported (Identity only)
Token: DOT (fees)
Purpose: Identity and social features
```

### Migration Specifics

#### Identity Migration Process
```
Automatic Migration:
✅ Main identities automatically migrated
✅ Sub-identities preserved
✅ Judgements transferred
✅ Registrar relationships maintained

Manual Verification Required:
□ Complex identity hierarchies
□ Custom registrar configurations
□ Multiple judgement sources
□ Cross-chain identity links
```

#### Identity Operations
```
Supported Operations:
- View identity information
- Remove identities (if no parent)
- Manage sub-identity relationships
- Request new judgements

Migration Assistant Features:
□ Identity status verification
□ Deposit calculation and recovery
□ Sub-identity management
□ Registrar communication assistance
```

---

## 👥 People Chain (Kusama)

### Network Information
```
Network: People Chain Kusama  
Chain ID: people-kusama
Status: 🟢 Fully Supported (Identity only)
Token: KSM (fees)
Purpose: Identity and social features
```

### Migration Specifics

Similar to Polkadot People Chain but with Kusama-specific features:
- Lower fees for identity operations
- More experimental identity features
- Faster iteration on new functionality

---

## 🌊 Parachain Networks

### 🟡 Progressive Rollout Status

#### Acala Network
```
Network: Acala
Status: 🟡 Progressive Rollout
Token: ACA
Specialty: DeFi hub

Migration Support:
✅ Basic balance transfers
✅ Liquid staking positions (LDOT)
⚠️ Complex DeFi positions (manual intervention)
❌ Cross-chain bridge positions (coming soon)

Special Considerations:
- Liquid DOT (LDOT) requires special handling
- DeFi positions may need manual exit
- Cross-chain assets need coordination
```

#### Astar Network
```
Network: Astar  
Status: 🟡 Progressive Rollout
Token: ASTR
Specialty: Smart contracts and dApps

Migration Support:
✅ Native ASTR transfers
✅ EVM account discovery
⚠️ Smart contract positions (case-by-case)
❌ dApp-specific assets (depends on dApp)

EVM Integration:
- Ethereum-style addresses supported
- Metamask compatibility considerations
- Smart contract interaction limitations
```

#### Bifrost Network
```
Network: Bifrost
Status: 🟡 Progressive Rollout  
Token: BNC
Specialty: Liquid staking derivatives

Migration Support:
✅ BNC token transfers
✅ Basic liquid staking positions
⚠️ Complex derivative positions
❌ Cross-chain liquid staking (manual)

Liquid Staking Assets:
- vDOT, vKSM positions require evaluation
- Derivative token redemption may be needed
- Staking rewards consideration during migration
```

#### HydraDX
```
Network: HydraDX
Status: 🟡 Progressive Rollout
Token: HDX  
Specialty: Cross-chain liquidity

Migration Support:
✅ HDX token transfers
✅ Basic liquidity positions
⚠️ Complex trading positions
❌ Omnipool positions (coming soon)

Liquidity Considerations:
- Active LP positions need careful timing
- Price impact during position exits
- Omnipool mechanics complexity
```

### 🔴 Planned Support

#### Moonbeam
```
Network: Moonbeam
Status: 🔴 Planned Support
Token: GLMR
Specialty: Ethereum compatibility

Planned Features:
- EVM account migration
- Smart contract position handling
- Cross-chain bridge integration
- Metamask wallet coordination
```

#### Parallel Finance
```
Network: Parallel
Status: 🔴 Planned Support
Token: PARA
Specialty: DeFi and lending

Planned Features:
- Lending position migration
- Collateral management
- Derivative token handling
- Cross-chain asset coordination
```

---

## 🛠️ Network-Specific Tools

### Fee Calculators

**Polkadot Fee Calculator:**
```typescript
function calculatePolkadotFees(operations: string[]): string {
  const baseFee = '150000000'; // ~0.015 DOT base fee
  const operationFees = {
    'transfer': '150000000',
    'staking.unbond': '150000000', 
    'staking.withdrawUnbonded': '150000000',
    'identity.clearIdentity': '1500000000' // ~0.15 DOT
  };
  
  return operations.reduce((total, op) => 
    BigNumber(total).plus(operationFees[op] || baseFee).toString()
  , '0');
}
```

**Cross-Chain Fee Estimator:**
```typescript
function estimateCrossChainFees(
  sourceChain: string,
  destChain: string,
  asset: string,
  amount: string
): FeeEstimate {
  // Network-specific fee calculation
  const baseFees = {
    'polkadot': '150000000',
    'kusama': '100000000', 
    'asset-hub-polkadot': '100000000',
    'asset-hub-kusama': '50000000'
  };
  
  return {
    source: baseFees[sourceChain],
    destination: baseFees[destChain],
    bridge: calculateBridgeFee(sourceChain, destChain),
    total: /* sum of all fees */
  };
}
```

### Network Status Monitors

**Real-time Network Status:**
```typescript
interface NetworkStatus {
  chain: string;
  isHealthy: boolean;
  blockHeight: number;
  avgBlockTime: number;
  congestionLevel: 'low' | 'medium' | 'high';
  migrationRecommended: boolean;
}

async function getNetworkStatus(chainId: string): Promise<NetworkStatus> {
  // Query network health and congestion
  const api = await getChainAPI(chainId);
  const header = await api.rpc.chain.getHeader();
  
  return {
    chain: chainId,
    isHealthy: await checkNetworkHealth(api),
    blockHeight: header.number.toNumber(),
    avgBlockTime: await calculateAvgBlockTime(api),
    congestionLevel: await assessCongestion(api),
    migrationRecommended: await shouldMigrateNow(api)
  };
}
```

---

## 📋 Network Migration Checklists

### Pre-Migration Network Assessment

**For All Networks:**
```
□ Check network status and health
□ Verify RPC endpoint availability  
□ Confirm sufficient native tokens for fees
□ Review recent network updates or issues
□ Plan migration timing around network events
```

**For Relay Chains (Polkadot/Kusama):**
```
□ Check staking era timing
□ Monitor validator performance
□ Review governance calendar
□ Assess network congestion
□ Plan around upgrade schedules
```

**For System Parachains (AssetHub, People):**
```
□ Verify cross-chain bridge status
□ Check asset availability and metadata
□ Confirm identity migration status
□ Review parachain block production
□ Test cross-chain message passing
```

**For Ecosystem Parachains:**
```
□ Verify migration support status
□ Check DeFi protocol compatibility
□ Review smart contract dependencies
□ Assess cross-chain asset exposure
□ Plan for manual interventions if needed
```

### Post-Migration Verification

**Universal Verification Steps:**
```
□ Confirm balance accuracy across all assets
□ Test basic operations (transfer, sign)
□ Verify account accessibility in apps
□ Check transaction history availability
□ Confirm network-specific features work
```

**Network-Specific Verification:**
```
Relay Chains:
□ Staking functionality verification
□ Governance participation capability
□ Identity display and judgements

System Parachains:
□ Asset transfer capabilities
□ NFT ownership and metadata
□ Cross-chain operation functionality

Ecosystem Parachains:
□ DeFi protocol integration
□ Smart contract interaction
□ Parachain-specific feature access
```

---

## 🚨 Network-Specific Warnings

### Critical Considerations

**Polkadot Network:**
- High minimum staking requirements (250+ DOT)
- 28-day unbonding period significantly impacts migration timing
- Identity migration to People Chain requires verification

**Kusama Network:**
- More experimental features may have edge cases
- Faster governance cycles require timing consideration
- Lower existential deposits but higher transaction volume

**AssetHub Networks:**
- Asset metadata dependencies on external services
- NFT collection integrity verification required
- Cross-chain asset bridge timing considerations

**Parachain Networks:**
- Limited migration support for complex DeFi positions
- Smart contract interaction compatibility varies
- Cross-chain bridge dependencies and timing

### Emergency Procedures

**If Migration Fails Mid-Process:**
```
1. Document exact failure point and error messages
2. Check network status for ongoing issues
3. Verify Ledger device connectivity and app status
4. Review transaction status on block explorer
5. Contact support with detailed information
6. Do not attempt to retry until issue identified
```

**Network-Specific Recovery:**
```
Relay Chain Issues:
- Check validator set changes
- Monitor era progression
- Verify staking controller relationships

Parachain Issues:  
- Check parachain block production
- Verify cross-chain message status
- Review bridge operational status
```

This comprehensive network guide ensures successful migration across the entire Polkadot ecosystem. Always verify current network status and migration support before beginning any migration process.