# Troubleshooting Guide

This comprehensive troubleshooting guide covers common issues, error messages, and their solutions when using the Polkadot Migration Assistant.

## Quick Diagnosis

### 🚨 Emergency Checklist
If you're experiencing critical issues:

1. **✅ Is your Ledger connected and unlocked?**
2. **✅ Is the Polkadot Universal App open on your Ledger?**
3. **✅ Are you using a supported browser (Chrome/Firefox/Edge)?**
4. **✅ Is your internet connection stable?**
5. **✅ Have you granted browser permissions for WebUSB?**

---

## Connection Issues

### Ledger Device Not Detected

#### Symptoms
- "No device found" error message
- Connection button remains inactive
- Browser doesn't show device selection dialog

#### Root Causes & Solutions

**🔧 USB Connection Issues**
```
Problem: Physical connection problems
Solutions:
• Try a different USB cable (data-capable, not charge-only)
• Use a different USB port (preferably USB 3.0)
• Connect directly to computer (avoid USB hubs)
• Clean USB ports on both device and computer
```

**🔧 Browser Permissions**
```
Problem: WebUSB permissions denied or not granted
Solutions:
• Refresh page and retry connection
• Clear browser cache and cookies for the site
• Check browser settings for USB device permissions
• Try incognito/private browsing mode
• Disable browser extensions that might interfere
```

**🔧 Ledger Live Interference**
```
Problem: Ledger Live is blocking device access
Solutions:
• Close Ledger Live completely before using Migration Assistant
• End Ledger Live processes in Task Manager (Windows) or Activity Monitor (Mac)
• Restart browser after closing Ledger Live
```

**🔧 Operating System Issues**
```
Windows:
• Install latest Ledger Live to get device drivers
• Run Windows Update for latest USB drivers
• Disable Windows Defender Real-time protection temporarily
• Check Device Manager for USB device errors

macOS:
• Grant privacy permissions for the browser
• System Preferences > Security & Privacy > Privacy > USB
• Reset NVRAM/PRAM if USB issues persist

Linux:
• Install udev rules for Ledger devices
• Add user to dialout group: sudo usermod -a -G dialout $USER
• Check device permissions: ls -la /dev/ttyUSB*
```

### Ledger App Issues

#### "App Not Ready" Error

**Symptoms:** Ledger shows connected but displays "App not ready" message

**Solutions:**
1. **Verify App Installation**
   ```
   • Open Ledger Live > Manager
   • Search for "Polkadot Universal"
   • Ensure app is installed and up-to-date
   • If not found, install from Ledger Live
   ```

2. **App Opening Issues**
   ```
   • Navigate to Polkadot Universal app on Ledger
   • Press both buttons to open app
   • Ensure screen shows "Polkadot Universal ready"
   • If app crashes, restart Ledger device
   ```

3. **Legacy App Conflicts**
   ```
   • Uninstall old Polkadot/Kusama individual apps
   • These can conflict with the Universal app
   • Only keep Polkadot Universal app installed
   ```

#### Wrong App Opened

**Symptoms:** Browser connects but shows incorrect app or chains

**Solutions:**
```
• Close current app on Ledger
• Navigate to Polkadot Universal app specifically
• Verify app name on Ledger screen matches exactly
• Refresh browser page after opening correct app
```

### Browser Compatibility Issues

#### WebUSB Not Supported

**Symptoms:** "WebUSB not supported" error message

**Solutions:**
```
Recommended Browsers:
✅ Chrome (version 61+)
✅ Microsoft Edge (version 79+)
✅ Opera (version 48+)
✅ Firefox (version 94+ with webusb enabled)

Not Supported:
❌ Safari (no WebUSB support)
❌ Internet Explorer
❌ Mobile browsers

Firefox Setup:
1. Type 'about:config' in address bar
2. Search for 'dom.webusb.enabled'
3. Set to 'true'
4. Restart Firefox
```

#### HTTPS Requirements

**Symptoms:** WebUSB blocked on HTTP sites

**Solutions:**
```
• Always use HTTPS version of Migration Assistant
• Local development: use mkcert for local HTTPS
• Never use HTTP for hardware wallet connections
• Check for valid SSL certificate (green lock icon)
```

---

## Account Discovery Issues

### No Accounts Found

#### Symptoms
- Account discovery completes with zero accounts
- "No eligible accounts" message
- Empty account list after scanning

#### Troubleshooting Steps

**🔍 Derivation Path Issues**
```
Problem: Using wrong derivation paths
Diagnosis:
• Check which Ledger app was used originally
• Verify if accounts were created with legacy apps
• Confirm seed phrase is correct

Solutions:
• Try scanning with different legacy app modes
• Check account indices beyond default range
• Verify you're using the same seed phrase as before
```

**🔍 Network Connectivity**
```
Problem: Cannot query blockchain data
Diagnosis:
• Test internet connection
• Check if RPC endpoints are responding
• Verify firewall/proxy settings

Solutions:
• Refresh page to retry connections
• Try different network (mobile hotspot)
• Check corporate firewall restrictions
• Wait if blockchain networks are experiencing issues
```

**🔍 Account Index Range**
```
Problem: Accounts created with high index numbers
Solutions:
• Extend scanning range in advanced settings
• Manually specify account indices if known
• Use broader derivation path scanning
```

### Incorrect Account Balances

#### Zero Balances Shown

**Symptoms:** Accounts appear but show zero or incorrect balances

**Solutions:**
```
Network Issues:
• Refresh page to retry balance queries
• Check network status on Polkadot.network
• Try again during off-peak hours

Chain-Specific Issues:
• Some parachains may have API delays
• Cross-check balances on block explorers
• Wait for indexing services to update

Cache Issues:
• Clear browser cache and reload
• Disable browser cache in developer tools
• Try private/incognito browsing session
```

#### Missing Assets

**Symptoms:** Some tokens, NFTs, or staked amounts not displayed

**Solutions:**
```
Asset Discovery:
• Ensure assets are on supported chains
• Check if assets require specific token standards
• Verify assets aren't locked in smart contracts

Staking Assets:
• Bonded tokens may be on different controller accounts
• Check both stash and controller addresses
• Look for nomination pool participation

NFT Assets:
• Verify NFT collections are supported
• Check for recent minting/transfer activities
• Confirm metadata is properly indexed
```

---

## Transaction Issues

### Transaction Preparation Failures

#### Insufficient Balance for Fees

**Symptoms:** "Insufficient balance" error before transaction signing

**Solutions:**
```
Fee Calculation:
• Check current network fees on block explorers
• Ensure enough tokens remain after transaction
• Consider existential deposit requirements

Common Fee Requirements:
• Polkadot: ~0.01 DOT per transaction
• Kusama: ~0.001 KSM per transaction
• AssetHub: Varies by operation type

Solutions:
• Reduce transaction amount to cover fees
• Transfer small amount of native tokens first
• Use a different account with sufficient balance
```

#### Transaction Building Errors

**Symptoms:** Errors during transaction preparation phase

**Solutions:**
```
Network Connection:
• Check RPC endpoint availability
• Verify chain synchronization status
• Try different RPC endpoint if available

Account State:
• Refresh account data before transaction
• Check for recent transactions affecting nonce
• Verify account permissions for operation

Parameter Validation:
• Double-check all input values
• Ensure addresses are valid for target chain
• Verify amounts are within acceptable ranges
```

### Ledger Signing Issues

#### User Rejected Transaction

**Symptoms:** "Transaction rejected by user" after Ledger interaction

**Common Causes:**
```
• User pressed right button (reject) instead of left (approve)
• User took too long to respond (timeout)
• Transaction details didn't match expectations
• Wrong transaction displayed on Ledger
```

**Solutions:**
```
Verification Process:
1. Carefully read all transaction details on Ledger screen
2. Verify destination address matches intended recipient
3. Confirm transaction amount is correct
4. Check operation type matches your intention
5. Only approve if all details are exactly as expected

Timeout Issues:
• Complete signing within 60 seconds
• Have transaction details ready before starting
• Practice navigation on Ledger device beforehand
```

#### Ledger Communication Errors

**Symptoms:** Connection lost during signing process

**Solutions:**
```
Device Issues:
• Ensure Ledger remains connected during signing
• Don't disconnect or move USB cable
• Keep Ledger app open throughout process
• Don't navigate away from signing screen

Browser Issues:
• Don't switch browser tabs during signing
• Avoid putting computer to sleep
• Disable power saving for USB ports
• Keep Migration Assistant tab active and focused
```

### Transaction Submission Issues

#### Network Congestion

**Symptoms:** Transactions stuck in "pending" state for extended periods

**Solutions:**
```
Wait Strategies:
• Normal transactions: Wait 1-3 blocks (6-18 seconds)
• High network load: May take 5-10 minutes
• Emergency: Cancel and retry with higher fees

Monitoring:
• Check transaction hash on block explorer
• Monitor network status and congestion
• Look for transaction in mempool

Recovery:
• Don't double-submit transactions
• Wait for timeout before retrying
• Use different RPC endpoint if persistent issues
```

#### Invalid Transaction Errors

**Symptoms:** Transaction rejected by network after submission

**Common Errors:**
```
"Nonce too low":
• Account state changed between preparation and submission
• Another transaction was processed first
• Solution: Refresh account and retry

"Insufficient balance":
• Balance changed after fee estimation
• Existential deposit violation
• Solution: Check current balance and adjust

"Invalid signature":
• Ledger signing issue or corruption
• Solution: Retry entire transaction process

"Call failed":
• Smart contract or pallet-specific error
• Solution: Check operation requirements and constraints
```

---

## Specific Operation Issues

### Staking Operations

#### Cannot Unstake

**Symptoms:** Unstaking button disabled or operation fails

**Troubleshooting:**
```
Account Eligibility:
• Verify account is the stash account (not controller)
• Check if account has active nominations
• Ensure minimum staking period has passed

Balance Requirements:
• Must have sufficient balance for transaction fees
• Cannot unstake below minimum staking amount
• Check for locked balance restrictions

Network Conditions:
• Some networks have unstaking delays
• Check era progression and timing
• Verify validator set status
```

#### Unbonding Period Issues

**Symptoms:** Confusion about when tokens become available

**Explanation:**
```
Network-Specific Unbonding Periods:
• Polkadot: 28 days (28 eras)
• Kusama: 7 days (28 eras, shorter era duration)
• Other chains: Varies by network configuration

Important Notes:
• Unbonding period starts from end of current era
• Multiple unbonding chunks may have different completion times
• Emergency slash conditions can extend unbonding period
```

### Identity Operations

#### Cannot Remove Identity

**Symptoms:** Identity removal fails or is disabled

**Common Issues:**
```
Parent Identity Restriction:
• Sub-identities cannot be removed directly
• Must be removed by parent identity holder
• Check identity hierarchy on-chain

Active Judgements:
• Identities with active judgements may have restrictions
• Some registrar judgements prevent removal
• Contact relevant registrars for judgement removal

Insufficient Deposits:
• Identity removal requires transaction fee
• May need additional deposit for complex identities
• Check balance requirements
```

### Multisig Operations

#### Coordination Issues

**Symptoms:** Multisig transactions fail due to coordination problems

**Solutions:**
```
Signatory Coordination:
• Ensure all signatories are available
• Coordinate timing for approval process
• Share transaction details with all parties
• Use secure communication for coordination

Threshold Requirements:
• Verify correct number of signatures required
• Check if threshold includes initiator signature
• Confirm all signatories have approved

External Signatory Issues:
• Some signatories may not have Migration Assistant access
• May need alternative signing methods
• Coordinate through other Polkadot-compatible wallets
```

---

## Performance Issues

### Slow Loading

#### Symptoms
- Long wait times for account discovery
- Slow balance loading
- Delayed transaction preparation

#### Solutions

**Browser Performance:**
```
Memory and CPU:
• Close unnecessary browser tabs
• Restart browser to clear memory
• Check system resource usage
• Use faster computer if available

Browser Settings:
• Disable unnecessary extensions
• Clear cache and browsing data
• Enable hardware acceleration if available
• Update browser to latest version
```

**Network Optimization:**
```
Connection Issues:
• Use wired internet connection if possible
• Test internet speed and latency
• Try different network (mobile hotspot)
• Check for ISP throttling or restrictions

RPC Performance:
• Different RPC endpoints have varying performance
• Public endpoints may be slower during peak times
• Some geographical regions have better performance
• Consider using paid RPC services for better reliability
```

### Memory Issues

#### Browser Crashes or Freezes

**Symptoms:** Browser becomes unresponsive or crashes during use

**Solutions:**
```
Memory Management:
• Close other applications to free RAM
• Use browser with more available memory
• Clear browser cache before starting
• Restart browser between migration sessions

Large Account Sets:
• Process accounts in smaller batches
• Focus on high-value accounts first
• Use account filtering features
• Take breaks between operations to prevent memory buildup
```

---

## Data and Sync Issues

### Stale Data

#### Symptoms
- Outdated balance information
- Missing recent transactions
- Incorrect staking status

#### Solutions

**Manual Refresh:**
```
• Use browser refresh (F5 or Ctrl+R)
• Click refresh buttons within the application
• Disconnect and reconnect Ledger device
• Clear browser cache and reload
```

**Automatic Sync Issues:**
```
Data Sources:
• Some data comes from indexing services (Subscan)
• Indexing may lag behind chain state
• Cross-check with direct chain queries if possible

Real-time Updates:
• Enable automatic refresh if available
• Monitor for sync status indicators
• Wait for next block if transaction just completed
```

### Missing Transaction History

#### Symptoms:** Recent transactions not visible in Migration Assistant

**Understanding:**
```
Data Limitations:
• Migration Assistant focuses on current balances
• Full transaction history requires block explorer
• Some operations may not be immediately indexed

Workarounds:
• Check transaction hash on block explorer
• Verify completion through chain state queries
• Wait for indexing services to update (5-15 minutes)
```

---

## Emergency Procedures

### Lost Connection During Migration

#### If connection is lost mid-migration:

1. **Don't Panic** - Your funds are safe on the blockchain
2. **Check Transaction Status** - Look up any pending transactions on block explorer
3. **Reconnect Carefully** - Restart the process from connection step
4. **Verify Account State** - Check if any operations completed successfully
5. **Resume or Retry** - Continue from where migration left off

### Partial Migration Completion

#### If some accounts migrated successfully but others failed:

1. **Document Progress** - Note which accounts completed successfully
2. **Identify Issues** - Determine cause of failures for remaining accounts
3. **Address Problems** - Resolve specific issues (fees, permissions, etc.)
4. **Complete Migration** - Process remaining accounts once issues resolved

### Emergency Recovery

#### If you encounter critical issues:

```
Immediate Steps:
1. Disconnect Ledger device safely
2. Close Migration Assistant browser tab
3. Document error messages and circumstances
4. Take screenshots of any error states

Data Safety:
• Your seed phrase and private keys remain secure
• Funds cannot be lost through Migration Assistant
• All operations require explicit confirmation on Ledger
• No sensitive data is stored in browser

Recovery Process:
1. Restart browser and clear cache
2. Reconnect Ledger with fresh session
3. Verify account balances on block explorer
4. Resume migration with proper troubleshooting
```

---

## Getting Additional Help

### Self-Diagnosis Tools

**Browser Developer Console:**
```
1. Press F12 to open developer tools
2. Click "Console" tab
3. Look for error messages in red
4. Screenshot errors for support requests
```

**Network Tab Analysis:**
```
1. Open Developer Tools > Network tab
2. Refresh page or retry operation
3. Look for failed requests (red entries)
4. Check response codes and error messages
```

### Community Support

**Before Requesting Help:**
```
Information to Gather:
• Browser version and operating system
• Ledger device model and firmware version
• Exact error messages (screenshots helpful)
• Steps leading to the issue
• Network you were trying to use
```

**Support Channels:**
- Official documentation and FAQ
- Community forums and Discord
- GitHub issues for technical problems
- Ledger support for hardware issues

### Advanced Troubleshooting

**For Technical Users:**
```
Browser Console Commands:
• navigator.usb.getDevices() - Check connected USB devices
• localStorage.clear() - Clear stored application data
• sessionStorage.clear() - Clear session data

Network Debugging:
• Test RPC endpoints directly with curl
• Check firewall and proxy configurations
• Analyze network traffic with browser tools
```

**Log Collection:**
```
1. Open browser console before starting operation
2. Enable "Preserve log" option
3. Reproduce the issue
4. Save console output to file
5. Include in support requests
```

---

## Prevention Tips

### Best Practices for Smooth Operation

1. **Prepare Environment**
   - Use dedicated browser session
   - Close unnecessary applications
   - Ensure stable internet connection
   - Have Ledger firmware updated

2. **Plan Migration**
   - Review all accounts before starting
   - Understand required operations
   - Check network conditions and fees
   - Have sufficient time available

3. **Monitor Progress**
   - Watch for error messages immediately
   - Verify each step completion
   - Take notes of successful operations
   - Keep transaction hashes for reference

4. **Stay Updated**
   - Check for Migration Assistant updates
   - Monitor network status and announcements
   - Keep Ledger firmware current
   - Follow security best practices

Remember: The Migration Assistant is designed to be safe and user-friendly. Most issues can be resolved with patience and systematic troubleshooting. When in doubt, take your time and verify everything twice.