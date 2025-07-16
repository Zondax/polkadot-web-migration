'use client'

import { ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { useMigration } from '@/components/hooks/useMigration'
import { Button } from '@/components/ui/button'

import { AddressVerificationDialog } from './dialogs/address-verification-dialog'
import { MigrationProgressDialog } from './dialogs/migration-progress-dialog'
import { SuccessDialog } from './dialogs/success-dialog'
import MigratedAccountsTable from './migrated-accounts-table'

interface MigrateTabContentProps {
  onBack: () => void
  onContinue: () => void
}

export function MigrateTabContent({ onBack }: MigrateTabContentProps) {
  const router = useRouter()
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [showMigrationProgressDialog, setShowMigrationProgressDialog] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<undefined | 'loading' | 'finished'>()
  const {
    appsForMigration,
    migrationResults,
    restartSynchronization,
    allVerified,
    verifySelectedAppsAddresses,
    migratingItem,
    getCollectionsByAppId,
    destinationAddressesByApp,
  } = useMigration()
  const userDismissedDialog = useRef(false)

  useEffect(() => {
    if (migratingItem && !userDismissedDialog.current) {
      setShowMigrationProgressDialog(true)
    } else if (!migratingItem) {
      setShowMigrationProgressDialog(false)
      // Reset the flag when there are no loading items
      userDismissedDialog.current = false
    }
  }, [migratingItem])

  const handleMigrate = async () => {
    setMigrationStatus('loading')
    
    // ========================================================================
    // NESTED MULTISIG TRANSFER IMPLEMENTATION
    // ========================================================================
    // This implementation demonstrates a complex nested multisig scenario:
    // 
    // ACCOUNTS STRUCTURE:
    // - multi_acc1 (2-of-2 multisig): [acc1, acc2]
    // - multi_acc2 (2-of-2 multisig): [multi_acc1, acc3]
    // - Transfer: 0.0001 KSM from multi_acc2 → acc3
    //
    // TRANSACTION FLOW (3 transactions total):
    // 1. TRANSACTION 1: acc3 initiates the transfer using asMulti
    // 2. TRANSACTION 2: acc1 initiates multi_acc1's execution using asMulti
    // 3. TRANSACTION 3: acc2 completes multi_acc1's execution (final signature)
    //
    // Note: Since multi_acc2 requires 2 signatures and one signatory (multi_acc1)
    // is itself a multisig, we need nested multisig transactions.
    // ========================================================================
    
    console.log('DEBUG: Starting nested multisig transfer from multi_acc2 to acc3 of 0.0001 KSM')
    
    try {
      // Import required dependencies for transfer
      const { getApiAndProvider, prepareTransactionPayload, createSignedExtrinsic, submitAndHandleTransaction, estimateMultisigWeight } = await import('@/lib/account')
      const { ledgerService } = await import('@/lib/ledger/ledgerService')
      const { BN } = await import('@polkadot/util')
      const { appsConfigs } = await import('@/config/apps')
      const { blake2AsHex } = await import('@polkadot/util-crypto')
      
      // Connect to Kusama
      const { api } = await getApiAndProvider('wss://kusama-rpc.polkadot.io')
      if (!api) {
        throw new Error('Failed to connect to Kusama network')
      }
      
      // ========================================================================
      // ACCOUNT DEFINITIONS
      // ========================================================================
      // Multi-sig account 1: 2-of-2 multisig with members [acc1, acc2]
      const multi_acc1 = "DsKSWHcVgsutSLAcMWH3u41prkXtMmKWQ5r7DWFXHWxFLyb"
      const acc1 = 'F4aqRHwLaCk2EoEewPWKpJBGdrvkssQAtrBmQ5LdNSweUfV'
      const acc2 = 'FZZMnXGjS3AAWVtuyq34MuZ4vuNRSbk96ErDV4q25S9p7tn'

      // Multi-sig account 2: 2-of-2 multisig with members [multi_acc1, acc3]
      const multi_acc2 = "Ff8s2SUioCzdVuSDt1Xnq3sktUHzKrTm15oPnL1b7usNyFG"
      const acc3 = 'GWR4A5QfUeNXNSrzgTy9hTn1AruPtwDUFWSfABXFyBADZJS'

      // Transfer amount: 0.0001 KSM = 100000000 planck (12 decimals)
      const transferAmount = new BN('100000000')
      
      // ========================================================================
      // TRANSACTION 1: acc3 initiates the transfer from multi_acc2
      // ========================================================================
      // acc3 creates an asMulti transaction to initiate the transfer.
      // This will create a pending multisig that requires multi_acc1's signature.
      
      // Create the inner transfer transaction (from multi_acc2 to acc3)
      const innerTransfer = api.tx.balances.transferKeepAlive(
        acc3, // to acc3
        transferAmount // amount
      )
      
      console.log('DEBUG: Created inner transfer transaction')
      
      // For multi_acc2: threshold is 2, signatories are [multi_acc1, acc3]
      const threshold = 2
      const signatories = [multi_acc1, acc3].sort() // Sort signatories as required by Substrate
      
      // Get the call data and hash for the inner transfer
      const callData = innerTransfer.method.toHex()
      const callHash = blake2AsHex(innerTransfer.method.toU8a())
      
      console.log('==============================')
      console.log('MULTISIG CALL HASH:', callHash)
      console.log('CALL DATA FOR APPROVAL:', callData)
      console.log('==============================')
      console.log('Save this call data for multi_acc1 to approve the transfer!')
      
      // Since acc3 is the first signatory, we need to create the asMulti transaction
      // acc3 will be executing the final transaction with the actual call data
      const otherSignatories = signatories.filter(s => s !== acc3) // [multi_acc1]
      
      console.log('DEBUG: Creating asMulti transaction with acc3 as executor')
      console.log('DEBUG: Other signatories:', otherSignatories)
      
      // Create the call from the call data
      const call = api.createType('Call', callData)
      
      // Estimate weight for the multisig operation
      const tempExtrinsic = api.createType('Call', call) as unknown as import('@polkadot/api/types').SubmittableExtrinsic<'promise'>
      const estimatedWeight = estimateMultisigWeight(tempExtrinsic, threshold, otherSignatories)
      
      // Create the asMulti transaction (first signatory, no timepoint)
      const asMultiTx = api.tx.multisig.asMulti(
        threshold,
        otherSignatories,
        null, // No timepoint for first signatory
        call,
        estimatedWeight
      )
      
      console.log('DEBUG: Created asMulti transaction (first signatory)')
      
      // Get Kusama config
      const kusamaConfig = appsConfigs.get('kusama')
      if (!kusamaConfig) {
        throw new Error('Kusama config not found')
      }
      
      // Prepare transaction payload for acc3 to sign
      const preparedTx = await prepareTransactionPayload(
        api,
        acc3, // acc3 is signing
        kusamaConfig,
        asMultiTx
      )
      
      if (!preparedTx) {
        throw new Error('Failed to prepare transaction')
      }
      
      const { payload, metadataHash, nonce, proof1, payloadBytes } = preparedTx
      
      console.log('DEBUG: Prepared transaction payload')
      
      // Sign with Ledger device - acc3 is at index 2 (0-based)
      const acc3Path = "m/44'/434'/0'/0'/2'" // Kusama derivation path for acc3
      
      console.log('DEBUG: Requesting signature from Ledger device for acc3...')
      console.log('DEBUG: Path:', acc3Path)
      
      const { signature } = await ledgerService.signTransaction(acc3Path, payloadBytes, 'kusama', proof1)
      if (!signature) {
        throw new Error('Failed to sign transaction with Ledger')
      }
      
      console.log('DEBUG: Transaction signed successfully by acc3')
      
      // Create signed transaction (this modifies the asMultiTx object)
      createSignedExtrinsic(
        api,
        asMultiTx,
        acc3,
        signature,
        payload,
        nonce,
        metadataHash
      )
      
      console.log('DEBUG: Created signed asMulti transaction')
      
      // Submit transaction using the same method as migration
      const updateTransactionStatus = (status: any, message?: string) => {
        console.log('DEBUG: Transaction status:', status, message)
      }
      
      const txPromise = submitAndHandleTransaction(asMultiTx, updateTransactionStatus, api)
      
      console.log('DEBUG: Transaction submitted')
      console.log('==============================')
      console.log('IMPORTANT: This multisig transaction requires approval from multi_acc1')
      console.log('The transaction will transfer 0.0001 KSM from multi_acc2 to acc3')
      console.log('Call Hash for approval:', callHash)
      console.log('==============================')
      
      // Wait for transaction to complete
      await txPromise
      
      console.log('DEBUG: Multisig transaction initiated successfully')
      
      // Wait a bit to ensure the transaction is fully processed
      console.log('DEBUG: Waiting 3 seconds for transaction to be processed...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // ========================================================================
      // TRANSACTION 2: acc1 initiates multi_acc1's execution of the transfer
      // ========================================================================
      // Since multi_acc1 is itself a 2-of-2 multisig, we need acc1 to initiate
      // multi_acc1's asMulti transaction that will execute the transfer.
      // This creates a pending multisig within multi_acc1 that requires acc2.
      
      console.log('DEBUG: Now creating multi_acc1 execution with acc1...')
      
      const { disconnectSafely } = await import('@/lib/account')
      
      // Create a fresh API connection for the second part
      console.log('DEBUG: Creating fresh API connection...')
      const { api: api2 } = await getApiAndProvider('wss://kusama-rpc.polkadot.io')
      if (!api2) {
        throw new Error('Failed to create new connection to Kusama network')
      }
      console.log('DEBUG: Fresh connection established')
      
      try {
        // Get the timepoint from the first transaction
        const multisigs = await api2.query.multisig.multisigs(multi_acc2, callHash) as any
      if (!multisigs || multisigs.isNone) {
        throw new Error('Failed to get multisig info after first transaction')
      }
      
      const multisigInfo = multisigs.unwrap()
      const timepoint = {
        height: multisigInfo.when.height.toNumber(),
        index: multisigInfo.when.index.toNumber(),
      }
      
      console.log('DEBUG: Got timepoint from first transaction:', timepoint)
      
        // Create asMulti transaction for multi_acc1 to execute the original transfer
        // Since this is the final signatory, we use asMulti with call data, not approveAsMulti
        const innerCall = api2.createType('Call', callData)
        const finalAsMultiTx = api2.tx.multisig.asMulti(
          threshold,
          [acc3, multi_acc1].sort().filter(s => s !== multi_acc1), // Other signatories excluding multi_acc1
          timepoint, // Timepoint from acc3's transaction
          innerCall, // The actual transfer call
          estimateMultisigWeight(api2.createType('Call', innerCall) as unknown as import('@polkadot/api/types').SubmittableExtrinsic<'promise'>, threshold, [acc3])
        )
      
      console.log('DEBUG: Created asMulti transaction for multi_acc1 to execute the transfer')
      
      // Now multi_acc1 itself is a multisig (acc1 + acc2), so we need to wrap this in another multisig
      // Get the call data and hash for the asMulti transaction
      const approveCallData = finalAsMultiTx.method.toHex()
      const approveCallHash = blake2AsHex(finalAsMultiTx.method.toU8a())
      
      console.log('==============================')
      console.log('MULTI_ACC1 APPROVAL CALL HASH:', approveCallHash)
      console.log('CALL DATA FOR ACC2 TO APPROVE:', approveCallData)
      console.log('==============================')
      console.log('Save this call data for acc2 to complete multi_acc1\'s approval!')
      
        // Create asMulti transaction for acc1 to initiate multi_acc1's approval
        const acc1AsMultiTx = api2.tx.multisig.asMulti(
          2, // threshold for multi_acc1
          [acc2], // other signatory of multi_acc1 (excluding acc1)
          null, // No timepoint as acc1 is first signatory for multi_acc1
          finalAsMultiTx.method, // The final asMulti call that will execute the transfer
          estimateMultisigWeight(finalAsMultiTx, 2, [acc2])
        )
        
        console.log('DEBUG: Created asMulti transaction for acc1 to sign')
        
        // Prepare transaction for acc1
        const acc1PreparedTx = await prepareTransactionPayload(
          api2,
          acc1, // acc1 is signing
          kusamaConfig,
          acc1AsMultiTx
        )
      
      if (!acc1PreparedTx) {
        throw new Error('Failed to prepare acc1 transaction')
      }
      
      // Sign with acc1 (index 0)
      const acc1Path = "m/44'/434'/0'/0'/0'" // Kusama derivation path for acc1
      console.log('DEBUG: Requesting signature from Ledger device for acc1...')
      console.log('DEBUG: Path:', acc1Path)
      
      const { signature: acc1Signature } = await ledgerService.signTransaction(
        acc1Path, 
        acc1PreparedTx.payloadBytes, 
        'kusama', 
        acc1PreparedTx.proof1
      )
      
      if (!acc1Signature) {
        throw new Error('Failed to sign transaction with acc1')
      }
      
      console.log('DEBUG: Transaction signed successfully by acc1')
      
        // Create signed transaction for acc1
        createSignedExtrinsic(
          api2,
          acc1AsMultiTx,
          acc1,
          acc1Signature,
          acc1PreparedTx.payload,
          acc1PreparedTx.nonce,
          acc1PreparedTx.metadataHash
        )
        
        // Submit acc1's transaction
        const acc1TxPromise = submitAndHandleTransaction(acc1AsMultiTx, updateTransactionStatus, api2)
        console.log('DEBUG: acc1 transaction submitted')
        
        await acc1TxPromise
        
        console.log('DEBUG: multi_acc1 execution initiated by acc1')
        console.log('DEBUG: When acc2 signs, the transfer will be executed!')
        console.log('DEBUG: Waiting for acc2 to complete with call data:', approveCallData)
        console.log('==============================')
        
        // ========================================================================
        // TRANSACTION 3: acc2 completes multi_acc1's execution (final signature)
        // ========================================================================
        // acc2 provides the final signature for multi_acc1's asMulti transaction.
        // Once this transaction is confirmed, the transfer from multi_acc2 to acc3
        // will be executed automatically by the blockchain.
        
        console.log('DEBUG: Now completing multi_acc1 execution with acc2...')
        
        // Wait a bit for acc1's transaction to be processed
        console.log('DEBUG: Waiting 3 seconds for acc1 transaction to be processed...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Create a third fresh API connection for acc2's transaction
        console.log('DEBUG: Creating third API connection for acc2...')
        const { api: api3 } = await getApiAndProvider('wss://kusama-rpc.polkadot.io')
        if (!api3) {
          throw new Error('Failed to create third connection to Kusama network')
        }
        console.log('DEBUG: Third connection established')
        
        try {
          // Get the timepoint from acc1's transaction for multi_acc1
          const multiAcc1Multisigs = await api3.query.multisig.multisigs(multi_acc1, approveCallHash) as any
        if (!multiAcc1Multisigs || multiAcc1Multisigs.isNone) {
          throw new Error('Failed to get multi_acc1 multisig info after acc1 transaction')
        }
        
        const multiAcc1Info = multiAcc1Multisigs.unwrap()
        const multiAcc1Timepoint = {
          height: multiAcc1Info.when.height.toNumber(),
          index: multiAcc1Info.when.index.toNumber(),
        }
        
        console.log('DEBUG: Got timepoint from acc1 transaction:', multiAcc1Timepoint)
        
          // Create the call from the approve call data
          const approveCall = api3.createType('Call', approveCallData)
          
          // Create asMulti transaction for acc2 to complete multi_acc1's approval
          // Note: This is executing an approveAsMulti which itself is a multisig operation, so needs higher weight
          const tempApproveExtrinsic = api3.createType('Call', approveCall) as unknown as import('@polkadot/api/types').SubmittableExtrinsic<'promise'>
          const baseWeight = estimateMultisigWeight(tempApproveExtrinsic, 2, [acc1])
          
          // Double the weight for nested multisig operations
          const nestedMultisigWeight = {
            refTime: baseWeight.refTime * 2,
            proofSize: baseWeight.proofSize * 2
          }
          
          console.log('DEBUG: Using doubled weight for nested multisig:', nestedMultisigWeight)
          
          const acc2AsMultiTx = api3.tx.multisig.asMulti(
            2, // threshold for multi_acc1
            [acc1], // other signatory of multi_acc1 (excluding acc2)
            multiAcc1Timepoint, // Timepoint from acc1's transaction
            approveCall, // The approveAsMulti call
            nestedMultisigWeight
          )
          
          console.log('DEBUG: Created final asMulti transaction for acc2 to sign')
          
          // Prepare transaction for acc2
          const acc2PreparedTx = await prepareTransactionPayload(
            api3,
            acc2, // acc2 is signing
            kusamaConfig,
            acc2AsMultiTx
          )
        
        if (!acc2PreparedTx) {
          throw new Error('Failed to prepare acc2 transaction')
        }
        
        // Sign with acc2 (index 1)
        const acc2Path = "m/44'/434'/0'/0'/1'" // Kusama derivation path for acc2
        console.log('DEBUG: Requesting signature from Ledger device for acc2...')
        console.log('DEBUG: Path:', acc2Path)
        
        const { signature: acc2Signature } = await ledgerService.signTransaction(
          acc2Path, 
          acc2PreparedTx.payloadBytes, 
          'kusama', 
          acc2PreparedTx.proof1
        )
        
        if (!acc2Signature) {
          throw new Error('Failed to sign transaction with acc2')
        }
        
        console.log('DEBUG: Transaction signed successfully by acc2')
        
          // Create signed transaction for acc2
          createSignedExtrinsic(
            api3,
            acc2AsMultiTx,
            acc2,
            acc2Signature,
            acc2PreparedTx.payload,
            acc2PreparedTx.nonce,
            acc2PreparedTx.metadataHash
          )
          
          // Submit acc2's transaction
          const acc2TxPromise = submitAndHandleTransaction(acc2AsMultiTx, updateTransactionStatus, api3)
          console.log('DEBUG: acc2 transaction submitted')
          
          await acc2TxPromise
          
          console.log('==============================')
          console.log('SUCCESS: All signatures collected!')
          console.log('- acc3 initiated the transfer from multi_acc2')
          console.log('- acc1 initiated multi_acc1\'s execution of the transfer')
          console.log('- acc2 completed multi_acc1\'s execution')
          console.log('The transfer of 0.0001 KSM from multi_acc2 to acc3 is now EXECUTED!')
          console.log('==============================')
          
        } finally {
          // Clean up the third API connection
          await disconnectSafely(api3)
          console.log('DEBUG: Closed third API connection')
        }
        
      } finally {
        // Clean up the second API connection
        await disconnectSafely(api2)
        console.log('DEBUG: Closed second API connection')
      }
      
      // ========================================================================
      // TRANSACTION FLOW COMPLETE
      // ========================================================================
      // All three transactions have been submitted successfully:
      // 1. acc3 initiated the transfer from multi_acc2
      // 2. acc1 initiated multi_acc1's execution 
      // 3. acc2 completed multi_acc1's execution
      // 
      // The 0.0001 KSM transfer from multi_acc2 to acc3 is now executed!
      // ========================================================================
      
      // Show success dialog
      setShowSuccessDialog(true)
      setMigrationStatus('finished')
      
    } catch (error) {
      console.error('DEBUG: Multisig transfer failed:', error)
      setMigrationStatus(undefined)
      // Show error notification
      const { notifications$ } = await import('@/state/notifications')
      notifications$.push({
        title: 'Multisig Transfer Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'error',
        autoHideDuration: 5000,
      })
    }
  }

  const handleReturnHome = () => {
    setShowSuccessDialog(false)
    setMigrationStatus(undefined)
    router.push('/')
  }

  const handleRestartSynchronization = () => {
    restartSynchronization()
    onBack()
  }

  const handleOpenVerificationDialog = () => {
    setShowVerificationDialog(true)
    verifySelectedAppsAddresses()
  }

  const handleCloseMigrationDialog = () => {
    userDismissedDialog.current = true
    setShowMigrationProgressDialog(false)
  }

  const hasAddressesToVerify = appsForMigration.length > 0

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Migrate Accounts</h2>
        <p className="text-gray-600">Review your accounts and verify addresses before migration.</p>
      </div>

      {appsForMigration.length > 0 ? (
        <>
          {appsForMigration.some(app => app.accounts && app.accounts.length > 0) && (
            <MigratedAccountsTable apps={appsForMigration} destinationAddressesByApp={destinationAddressesByApp} />
          )}
          {appsForMigration.some(app => app.multisigAccounts && app.multisigAccounts.length > 0) && (
            <MigratedAccountsTable apps={appsForMigration} multisigAddresses destinationAddressesByApp={destinationAddressesByApp} />
          )}
        </>
      ) : (
        <div className="border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            There are no accounts available for migration. Please ensure your Ledger device is connected and contains accounts with a
            balance to migrate.
          </p>
        </div>
      )}

      <div className="flex justify-center gap-4 mt-8">
        {migrationStatus === 'finished' ? (
          <>
            <Button variant="outline" onClick={handleRestartSynchronization} data-testid="migrate-restart-synchronization-button">
              Synchronize Again
            </Button>
            <Button variant="purple" size="wide" onClick={handleReturnHome} data-testid="migrate-go-home-button">
              Go Home
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onBack} data-testid="migrate-back-button">
              Back
            </Button>
            <Button
              variant="purple"
              onClick={handleOpenVerificationDialog}
              disabled={!hasAddressesToVerify || allVerified}
              className="flex items-center gap-2"
              data-testid="migrate-verify-addresses-button"
            >
              <ShieldCheck className="h-4 w-4" />
              {allVerified ? 'Addresses Verified' : 'Verify Addresses'}
            </Button>
            <Button
              variant="purple"
              size="wide"
              onClick={handleMigrate}
              disabled={appsForMigration.length === 0 || !allVerified || migrationStatus === 'loading'}
              data-testid="migrate-migrate-button"
            >
              {migrationStatus === 'loading' ? 'Migrating...' : 'Migrate Accounts'}
            </Button>
          </>
        )}
      </div>

      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        onReturn={handleReturnHome}
        successCount={migrationResults.success}
        totalCount={migrationResults.total}
      />

      {/* Address Verification Dialog */}
      <AddressVerificationDialog open={showVerificationDialog} onClose={() => setShowVerificationDialog(false)} />

      {/* Migration Progress Dialog */}
      <MigrationProgressDialog
        open={showMigrationProgressDialog}
        onClose={handleCloseMigrationDialog}
        migratingItem={migratingItem}
        getCollectionsByAppId={getCollectionsByAppId}
      />
    </div>
  )
}
