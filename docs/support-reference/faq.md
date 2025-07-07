# Frequently Asked Questions (FAQ)

## 🔍 General Questions

### What is the Polkadot Migration Assistant?

The Polkadot Migration Assistant is a web-based tool that helps users migrate their accounts from legacy Ledger apps to the new Polkadot Universal Ledger App. It provides a guided, secure interface for transferring assets across the Polkadot ecosystem.

### Why do I need to migrate my accounts?

Legacy Polkadot and parachain Ledger apps are no longer maintained and use incompatible derivation paths. The new Universal app consolidates all Polkadot ecosystem support into a single, updated application. Migration ensures continued access to your assets and compatibility with new features.

### Is the Migration Assistant safe to use?

Yes. The Migration Assistant never has access to your private keys, which remain secure on your Ledger device. All transactions require explicit approval on your Ledger hardware wallet. The tool only provides a user interface for blockchain operations.

### What networks are supported?

**Fully Supported:**
- Polkadot Relay Chain
- Kusama Relay Chain  
- AssetHub (Polkadot & Kusama)
- People Chain (Polkadot & Kusama)

**Progressive Rollout:**
- Acala, Astar, Bifrost, HydraDX, and other major parachains

**Planned:**
- Additional parachains are being added regularly

### How long does migration take?

**Simple accounts:** 5-10 minutes  
**Staking accounts:** 7-28 days (due to unbonding periods)  
**Complex accounts:** Days to weeks (depending on positions)  
**Multisig accounts:** Hours to days (depending on coordination)

---

## 🔌 Connection & Setup

### My Ledger device isn't being detected. What should I do?

**Check these common issues:**
1. **USB Connection:** Use a data cable (not charge-only) and try different ports
2. **Browser Permissions:** Grant WebUSB permissions when prompted
3. **Ledger Live:** Close Ledger Live completely - it can interfere with browser connections
4. **Device State:** Ensure Ledger is unlocked and Polkadot Universal app is open
5. **Browser Compatibility:** Use Chrome, Firefox, or Edge (Safari doesn't support WebUSB)

### Which browsers are supported?

**✅ Supported:**
- Chrome (version 61+)
- Microsoft Edge (version 79+)
- Firefox (version 94+ with webusb enabled)
- Opera (version 48+)

**❌ Not Supported:**
- Safari (no WebUSB support)
- Internet Explorer
- Mobile browsers

### How do I enable WebUSB in Firefox?

1. Type `about:config` in the address bar
2. Search for `dom.webusb.enabled`
3. Set the value to `true`
4. Restart Firefox

### Do I need to install any software?

No additional software installation is required. The Migration Assistant runs entirely in your web browser. You only need:
- Updated Ledger Live (for installing the Universal app)
- Modern web browser with WebUSB support
- Polkadot Universal app installed on your Ledger

---

## 💰 Account Discovery & Balances

### The Migration Assistant shows zero balances, but I know I have funds. Why?

**Possible causes:**
1. **Wrong derivation path:** You may have used a different Ledger app originally
2. **Network connectivity:** RPC endpoints may be slow or unresponsive
3. **Account discovery range:** Your accounts may use higher index numbers
4. **Different seed phrase:** Ensure you're using the same Ledger device/seed

**Solutions:**
- Try refreshing the page and reconnecting
- Wait a few minutes for balance queries to complete
- Check your accounts on a block explorer directly
- Verify you're using the correct Ledger device

### Some of my accounts are missing. What should I do?

**Account discovery process:**
1. The tool scans the first 10-20 account indices by default
2. Accounts created with higher indices may not appear initially
3. Different legacy apps may have used different derivation paths

**Solutions:**
- Use the "Extended Scan" option if available
- Check if accounts were created with a different Ledger app
- Manually verify account addresses on block explorers
- Contact support if accounts are definitely missing

### Why do my NFTs or tokens not appear?

**Asset discovery limitations:**
1. **Indexing delays:** Some assets may take time to appear in indexing services
2. **Unsupported assets:** Not all token standards are supported yet
3. **Network-specific assets:** Some parachain assets require special handling
4. **Metadata issues:** NFT metadata may not be properly indexed

**Solutions:**
- Wait 5-10 minutes and refresh the page
- Check assets directly on block explorers
- Verify assets are on supported networks
- Contact support for specific asset types

---

## 🏛️ Staking Migration

### How long will it take to migrate my staked tokens?

**Unbonding periods by network:**
- **Polkadot:** 28 days
- **Kusama:** 7 days
- **Other networks:** Varies by network

**Timeline:**
1. Day 0: Initiate unbonding
2. Wait for unbonding period
3. Day X+1: Withdraw unbonded tokens
4. Complete migration

### Can I migrate while keeping my tokens staked?

**Currently:** No direct staking migration is supported. You must:
1. Unbond your tokens
2. Wait for the unbonding period
3. Withdraw and migrate
4. Re-stake using the Universal app

**Alternative:** Consider liquid staking solutions that may allow easier migration.

### Will I lose staking rewards during migration?

**During unbonding:** Yes, unbonded tokens don't earn rewards  
**Timeline impact:** Plan migration timing around reward cycles  
**Minimization strategies:**
- Partial unbonding to maintain some staking rewards
- Coordinate timing with era boundaries
- Consider opportunity cost vs. migration benefits

### What happens to my validator nominations?

**During migration:**
- Nominations are automatically removed when you unbond
- Validator relationships are not preserved
- You'll need to re-nominate after migration

**Best practices:**
- Note your current validator choices
- Research validator performance during waiting period
- Consider updating nominations when re-staking

### Can I migrate my controller/stash relationship?

The Universal app uses simplified account management:
- Controller/stash relationships are not directly migrated
- You'll use a single account for staking operations
- Re-configure staking setup after migration

---

## 👤 Identity Migration

### Will my identity transfer automatically?

**Most cases:** Yes, identities automatically migrate to People Chain  
**Complex cases:** May require manual verification  
**What transfers:**
- Display name and personal information
- Judgements from registrars
- Sub-identity relationships
- Deposit amounts

### What happens to my identity judgements?

**Preservation:** Judgements are typically preserved during migration  
**Verification needed:** Some registrars may need to re-verify  
**Contact registrars:** If judgements don't appear, contact the relevant registrars

### Should I remove my identity to recover deposits?

**Consider carefully:**
- **Pros:** Recover locked deposits (can be significant)
- **Cons:** Lose verification status and reputation
- **Requirements:** Can only remove identity if no parent exists

**Recommendation:** Only remove if deposit recovery is critical, as re-verification takes time and effort.

### How do sub-identities work after migration?

**Sub-identity migration:**
- Sub-identities migrate with their parent
- Relationships are preserved
- Individual management still possible
- Deposits remain with original accounts

---

## 👥 Multisig Migration

### How do I coordinate multisig migration with other signers?

**Coordination process:**
1. **Contact all signatories** before starting
2. **Share migration plan** and timeline
3. **Use secure communication** channels
4. **Schedule approval sessions** with all participants
5. **Execute in coordinated manner**

**Best practices:**
- Use official communication channels
- Document the migration plan
- Have backup communication methods
- Plan for different time zones

### What if some signatories don't have access to the Migration Assistant?

**Alternative signing methods:**
- Polkadot-JS Apps interface
- Other compatible Polkadot wallets
- Command-line tools (for technical users)
- Custom multisig interfaces

**Key requirement:** All signatories need to approve the same transaction hash.

### Can I migrate a multisig account if someone is unavailable?

**Threshold requirements:** You need enough signatures to meet the multisig threshold  
**Cannot proceed if:** You don't have enough available signatories  
**Solutions:**
- Wait for all required signatories
- Consider changing multisig threshold (requires separate operation)
- Use emergency procedures if available

### What happens to pending multisig calls during migration?

**Existing calls:** Complete or cancel existing calls before migration  
**Migration timing:** Don't start migration with pending operations  
**Best practice:** Clean slate approach - resolve all pending business first

---

## 🔧 Technical Issues

### I'm getting "transaction failed" errors. What should I do?

**Common causes and solutions:**

**Insufficient balance for fees:**
- Check you have enough tokens for transaction fees
- Consider existential deposit requirements
- Reduce transaction amount to cover fees

**Network congestion:**
- Wait for lower network activity
- Try during off-peak hours
- Monitor network status before retrying

**Invalid transaction state:**
- Refresh account data and retry
- Check for conflicting pending transactions
- Verify account state hasn't changed

### The migration is stuck on "pending" status. What's happening?

**Normal behavior:** Transactions can take 1-3 blocks to confirm  
**Network delays:** High congestion can cause longer delays  
**Monitoring:** Check transaction hash on block explorer  

**If stuck for >10 minutes:**
1. Check network status and congestion
2. Verify transaction was actually submitted
3. Look for error messages in browser console
4. Contact support with transaction details

### Can I cancel a migration in progress?

**Before signing:** Yes, you can cancel at any point before Ledger confirmation  
**After signing:** Blockchain transactions cannot be cancelled once submitted  
**Partial completion:** Some operations may complete while others fail  

**Best practice:** Only proceed when you're ready and certain about the migration.

### What if I accidentally migrate to the wrong address?

**Prevention is key:** Always verify destination addresses on your Ledger  
**If it happens:**
1. **Don't panic** - funds are not lost
2. **Check if you control the destination address**
3. **If it's still your address, you can access funds**
4. **If it's a wrong address, funds may be unrecoverable**

**This is why verification on Ledger is critical.**

---

## 💸 Fees & Costs

### How much does migration cost?

**Typical fees by network:**
- **Polkadot:** ~0.01-0.02 DOT per transaction
- **Kusama:** ~0.01 KSM per transaction
- **AssetHub:** ~0.01 DOT/KSM per transaction
- **Parachains:** Varies by network

**Complex migrations:** May require multiple transactions, increasing total fees.

### Why are the fees higher than expected?

**Factors affecting fees:**
1. **Network congestion:** Higher demand = higher fees
2. **Transaction complexity:** Complex operations cost more
3. **Batch operations:** Multiple operations in one transaction
4. **Cross-chain operations:** May involve bridge fees

### Can I reduce migration fees?

**Strategies:**
- **Timing:** Migrate during low-congestion periods
- **Batching:** Combine multiple operations when possible
- **Prioritization:** Migrate high-value accounts first
- **Network choice:** Some networks have lower fees

### What happens if I don't have enough tokens for fees?

**Prevention:**
- Always check fee estimates before starting
- Keep extra tokens for unexpected fees
- Consider existential deposit requirements

**If you're short:**
- Transfer additional tokens to cover fees
- Reduce migration amount to cover costs
- Use a different account with sufficient balance

---

## 🚨 Emergency Situations

### I lost connection during migration. Are my funds safe?

**Your funds are safe.** The Migration Assistant cannot access your private keys, and all operations require Ledger confirmation.

**Next steps:**
1. **Check transaction status** on block explorer
2. **Reconnect and check account balances**
3. **Resume migration from where it left off**
4. **Document any partial completions**

### My Ledger device stopped working during migration. What should I do?

**Immediate steps:**
1. **Don't panic** - your seed phrase controls your funds, not the device
2. **Check transaction status** on block explorers
3. **Get replacement Ledger or use recovery method**
4. **Restore accounts using your seed phrase**

**Your funds are accessible with any compatible wallet using your seed phrase.**

### I think I made a mistake during migration. Who can I contact?

**Self-help first:**
1. Check this FAQ and troubleshooting guide
2. Verify transaction details on block explorers
3. Review account balances across all networks

**Support channels:**
- GitHub issues for technical problems
- Community forums for general questions
- Official documentation and guides

**Important:** Never share your seed phrase or private keys with anyone.

---

## 🔮 Future & Updates

### Will new features be added to the Migration Assistant?

Yes, the Migration Assistant is actively developed with new features regularly added:
- Additional parachain support
- Enhanced DeFi position migration
- Improved user experience features
- Better error handling and recovery

### What happens after I migrate? Do I need to do anything else?

**Post-migration:**
1. **Update bookmarks** - Remove old app shortcuts
2. **Test functionality** - Verify all operations work
3. **Update services** - Change addresses in applications you use
4. **Backup management** - Update your backup documentation

### How do I stay informed about Migration Assistant updates?

**Information sources:**
- Official announcements and documentation
- GitHub repository for technical updates
- Community forums and channels
- Newsletter or notification systems (if available)

### Will the old Ledger apps stop working?

**Current status:** Legacy apps still function but are no longer maintained  
**Future:** May become incompatible with network upgrades  
**Recommendation:** Migrate sooner rather than later for long-term compatibility

---

## 📞 Getting Additional Help

### Where can I find more detailed information?

**Documentation hierarchy:**
1. **This FAQ** - Common questions and quick answers
2. **User Workflows** - Detailed step-by-step guides
3. **Troubleshooting Guide** - Comprehensive problem-solving
4. **Technical Architecture** - Deep technical details

### What information should I provide when asking for help?

**Essential details:**
- Browser version and operating system
- Ledger device model and firmware version
- Exact error messages (screenshots helpful)
- Network being used (Polkadot, Kusama, etc.)
- Steps leading to the issue

**Never share:**
- Seed phrases or private keys
- PIN codes or passwords
- Private transaction details

### How can I contribute to improving the Migration Assistant?

**Ways to help:**
- Report bugs and issues through official channels
- Provide feedback on user experience
- Contribute to documentation and guides
- Help other users in community forums
- Participate in testing new features

**Community contributions make the tool better for everyone.**

---

*This FAQ is regularly updated based on user questions and feedback. If you don't find your question here, check the other documentation sections or reach out through official support channels.*