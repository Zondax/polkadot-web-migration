# Nested Multisig Support - Test Guide

## Overview

The nested multisig feature has been successfully integrated. This feature allows handling scenarios where a multisig member is itself another multisig account.

## Key Changes

### 1. Added Nested Multisig Functions
- `prepareNestedMultisigTx` - Prepares a nested multisig transaction for approveAsMulti
- `prepareNestedAsMultiTx` - Prepares a nested multisig transaction for asMulti (final approval)

### 2. Updated Validation Functions
- `validateApproveAsMultiParams` - Now accepts optional `nestedSigner` parameter
- `validateAsMultiParams` - Now accepts optional `nestedSigner` parameter
- Returns `isNestedMultisig` flag and `nestedMultisigData` when applicable

### 3. Updated State Management
- `ledgerState$.approveMultisigCall` - Now passes `nestedSigner` to underlying functions
- `ledgerClient.signApproveAsMultiTx` - Supports nested multisig logic
- `ledgerClient.signAsMultiTx` - Supports nested multisig logic

### 4. Updated Form Schema
- Added `nestedSigner` field to `MultisigCallFormData` type

## How It Works

### Scenario
- `multi_acc2` is a 2-of-2 multisig with members: [`multi_acc1`, `acc3`]
- `multi_acc1` is itself a 2-of-2 multisig with members: [`acc1`, `acc2`]
- To approve a transaction from `multi_acc2`, when `multi_acc1` needs to sign:
  1. Either `acc1` or `acc2` initiates the approval from `multi_acc1`
  2. The other member of `multi_acc1` completes the approval

### Transaction Flow
1. **Regular approval**: When `acc3` approves, it's a standard multisig approval
2. **Nested approval**: When `multi_acc1` approves:
   - The outer call is the approval for `multi_acc2`
   - This is wrapped in an inner multisig call for `multi_acc1`
   - `acc1` or `acc2` signs the nested transaction

## Testing

To test the nested multisig feature:

1. Set up multisig accounts as described above
2. Create a transaction that requires approval from `multi_acc2`
3. Have `acc3` approve first (regular multisig)
4. Have `acc1` initiate approval from `multi_acc1` (nested multisig)
5. Have `acc2` complete the approval from `multi_acc1`

## Limitations

1. **Path Discovery**: The current implementation has limitations in discovering derivation paths for nested signers
2. **Member Data**: Nested multisig member data needs to be fetched from the chain or stored locally
3. **UI Support**: The UI needs to be updated to handle nested signer selection

## Future Improvements

1. Fetch nested multisig data from the chain dynamically
2. Add UI components for nested signer selection
3. Improve path discovery for nested multisig members
4. Add comprehensive test coverage