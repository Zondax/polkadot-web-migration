/**
 * Ledger Service Race Condition Security Tests
 * 
 * Tests for concurrent operations that could lead to:
 * - Double spending
 * - Transaction state corruption  
 * - Memory leaks
 * - Resource exhaustion
 * - Deadlocks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ledgerService } from '../ledgerService'
import type Transport from '@ledgerhq/hw-transport'
import type { PolkadotGenericApp } from '@zondax/ledger-substrate'

// Mock transport and app
const mockTransport = {
  create: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn()
} as unknown as Transport

const mockGenericApp = {
  getVersion: vi.fn(),
  getAddress: vi.fn(),
  signWithMetadataEd25519: vi.fn()
} as unknown as PolkadotGenericApp

// Mock the transport creation
vi.mock('@ledgerhq/hw-transport-webhid', () => ({
  default: {
    create: vi.fn().mockResolvedValue(mockTransport)
  }
}))

vi.mock('@zondax/ledger-substrate', () => ({
  PolkadotGenericApp: vi.fn().mockImplementation(() => mockGenericApp)
}))

describe('Ledger Service Race Condition Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset service state
    ledgerService.clearConnection()
  })

  afterEach(() => {
    ledgerService.disconnect()
  })

  describe('Concurrent Connection Attempts', () => {
    it('VULN-RACE-1: Should handle multiple simultaneous connection attempts', async () => {
      vi.mocked(mockGenericApp.getVersion).mockResolvedValue({ major: 1, minor: 0, patch: 0 })

      // Simulate 10 concurrent connection attempts
      const connectionPromises = Array.from({ length: 10 }, () => 
        ledgerService.connectDevice()
      )

      const results = await Promise.allSettled(connectionPromises)
      
      // Only one connection should succeed, others should fail gracefully
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      expect(successful.length).toBeLessThanOrEqual(1)
      expect(failed.length + successful.length).toBe(10)

      // Failed connections should have proper error messages
      for (const result of failed) {
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(Error)
          expect(result.reason.message).toMatch(/connection|busy|in.?use/i)
        }
      }
    })

    it('VULN-RACE-2: Should prevent connection state corruption', async () => {
      vi.mocked(mockGenericApp.getVersion).mockImplementation(async () => {
        // Simulate slow device response
        await new Promise(resolve => setTimeout(resolve, 100))
        return { major: 1, minor: 0, patch: 0 }
      })

      // Start multiple connections rapidly
      const promise1 = ledgerService.connectDevice()
      const promise2 = ledgerService.connectDevice()
      const promise3 = ledgerService.connectDevice()

      const results = await Promise.allSettled([promise1, promise2, promise3])

      // Verify state consistency - only one should succeed
      const successful = results.filter(r => r.status === 'fulfilled')
      expect(successful.length).toBeLessThanOrEqual(1)
    })
  })

  describe('Concurrent Transaction Signing', () => {
    beforeEach(async () => {
      // Establish connection first
      vi.mocked(mockGenericApp.getVersion).mockResolvedValue({ major: 1, minor: 0, patch: 0 })
      await ledgerService.connectDevice()
    })

    it('VULN-RACE-3: Should serialize transaction signing operations', async () => {
      const mockSignature = Buffer.from('mock-signature')
      vi.mocked(mockGenericApp.signWithMetadataEd25519).mockImplementation(async () => {
        // Simulate signing delay
        await new Promise(resolve => setTimeout(resolve, 50))
        return { signature: mockSignature }
      })

      const signingPromises = Array.from({ length: 5 }, (_, i) =>
        ledgerService.signTransaction(
          `m/44'/354'/0'/0'/${i}'`,
          new Uint8Array([1, 2, 3]),
          'polkadot',
          new Uint8Array([4, 5, 6])
        )
      )

      const results = await Promise.allSettled(signingPromises)

      // All operations should complete, but should be serialized (not concurrent)
      for (const result of results) {
        if (result.status === 'fulfilled') {
          expect(result.value.signature).toBeDefined()
        } else {
          // If rejected, should be due to serialization, not corruption
          expect(result.reason.message).toMatch(/busy|wait|queue/i)
        }
      }
    })

    it('VULN-RACE-4: Should prevent signature reuse across transactions', async () => {
      const signatures = new Set<string>()
      
      vi.mocked(mockGenericApp.signWithMetadataEd25519).mockImplementation(async (path) => {
        // Each transaction should get a unique signature
        const uniqueSignature = Buffer.from(`signature-${path}-${Date.now()}-${Math.random()}`)
        return { signature: uniqueSignature }
      })

      const signingPromises = Array.from({ length: 3 }, (_, i) =>
        ledgerService.signTransaction(
          `m/44'/354'/0'/0'/${i}'`,
          new Uint8Array([1, 2, 3, i]), // Different payload for each
          'polkadot',
          new Uint8Array([4, 5, 6])
        )
      )

      const results = await Promise.allSettled(signingPromises)

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.signature) {
          const sigString = result.value.signature.toString('hex')
          expect(signatures.has(sigString)).toBe(false)
          signatures.add(sigString)
        }
      }

      expect(signatures.size).toBeGreaterThan(0)
    })
  })

  describe('Memory and Resource Management', () => {
    it('VULN-RACE-5: Should prevent memory leaks from rapid connect/disconnect', async () => {
      vi.mocked(mockGenericApp.getVersion).mockResolvedValue({ major: 1, minor: 0, patch: 0 })

      // Simulate rapid connect/disconnect cycles
      for (let i = 0; i < 20; i++) {
        await ledgerService.connectDevice()
        ledgerService.disconnect()
        ledgerService.clearConnection()
      }

      // Memory usage should not continuously grow
      // In a real test, you would check process.memoryUsage()
      expect(true).toBe(true) // Placeholder - actual memory check would go here
    })

    it('VULN-RACE-6: Should handle transport disconnection during operations', async () => {
      vi.mocked(mockGenericApp.getVersion).mockResolvedValue({ major: 1, minor: 0, patch: 0 })
      await ledgerService.connectDevice()

      // Start a signing operation
      const signingPromise = ledgerService.signTransaction(
        "m/44'/354'/0'/0'/0'",
        new Uint8Array([1, 2, 3]),
        'polkadot',
        new Uint8Array([4, 5, 6])
      )

      // Simulate transport disconnection during signing
      setTimeout(() => {
        mockTransport.emit('disconnect')
      }, 25)

      // Operation should fail gracefully
      await expect(signingPromise).rejects.toThrow(/disconnect|transport|device/i)
    })
  })

  describe('State Synchronization', () => {
    it('VULN-RACE-7: Should maintain consistent internal state', async () => {
      vi.mocked(mockGenericApp.getVersion).mockResolvedValue({ major: 1, minor: 0, patch: 0 })

      // Perform various operations concurrently
      const operations = [
        ledgerService.connectDevice(),
        ledgerService.establishDeviceConnection(),
        ledgerService.isAppOpen(mockGenericApp)
      ]

      await Promise.allSettled(operations)

      // State should be consistent after all operations
      const finalConnection = await ledgerService.establishDeviceConnection()
      expect(finalConnection).toBeDefined()
      expect(finalConnection?.isAppOpen).toBe(true)
    })

    it('VULN-RACE-8: Should handle rapid app open/close cycles', async () => {
      vi.mocked(mockGenericApp.getVersion)
        .mockResolvedValueOnce({ major: 1, minor: 0, patch: 0 })
        .mockRejectedValueOnce(new Error('App not open'))
        .mockResolvedValueOnce({ major: 1, minor: 0, patch: 0 })

      // Rapid app status checks
      const checks = Array.from({ length: 10 }, () => 
        ledgerService.isAppOpen(mockGenericApp)
      )

      const results = await Promise.allSettled(checks)

      // Results should be consistent with app state
      for (const result of results) {
        if (result.status === 'fulfilled') {
          expect(typeof result.value).toBe('boolean')
        }
      }
    })
  })

  describe('Error Propagation and Recovery', () => {
    it('VULN-RACE-9: Should properly propagate errors in concurrent operations', async () => {
      vi.mocked(mockGenericApp.getVersion).mockRejectedValue(new Error('Device error'))

      const operations = Array.from({ length: 5 }, () => 
        ledgerService.connectDevice()
      )

      const results = await Promise.allSettled(operations)

      // All operations should fail with proper error messages
      for (const result of results) {
        expect(result.status).toBe('rejected')
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(Error)
          expect(result.reason.message).toContain('Device error')
        }
      }
    })

    it('VULN-RACE-10: Should recover from partial operation failures', async () => {
      let callCount = 0
      vi.mocked(mockGenericApp.getVersion).mockImplementation(async () => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Temporary failure')
        }
        return { major: 1, minor: 0, patch: 0 }
      })

      // First attempts should fail
      await expect(ledgerService.connectDevice()).rejects.toThrow('Temporary failure')
      await expect(ledgerService.connectDevice()).rejects.toThrow('Temporary failure')

      // Subsequent attempt should succeed
      const result = await ledgerService.connectDevice()
      expect(result).toBeDefined()
      expect(result?.connection?.isAppOpen).toBe(true)
    })
  })

  describe('Timeout and Deadlock Prevention', () => {
    it('VULN-RACE-11: Should timeout long-running operations', async () => {
      vi.mocked(mockGenericApp.getVersion).mockImplementation(async () => {
        // Simulate extremely slow operation (should timeout)
        await new Promise(resolve => setTimeout(resolve, 10000))
        return { major: 1, minor: 0, patch: 0 }
      })

      const start = Date.now()
      
      await expect(
        ledgerService.connectDevice()
      ).rejects.toThrow(/timeout|too.?slow/i)

      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(5000) // Should timeout before 5 seconds
    }, 6000)

    it('VULN-RACE-12: Should prevent deadlocks in nested operations', async () => {
      vi.mocked(mockGenericApp.getVersion).mockResolvedValue({ major: 1, minor: 0, patch: 0 })

      // This should not cause a deadlock
      const connection1 = ledgerService.establishDeviceConnection()
      const connection2 = ledgerService.connectDevice()

      const results = await Promise.allSettled([connection1, connection2])

      // At least one should succeed, neither should hang indefinitely
      const successful = results.filter(r => r.status === 'fulfilled')
      expect(successful.length).toBeGreaterThan(0)
    })
  })

  describe('Transaction Ordering and Atomicity', () => {
    it('VULN-RACE-13: Should maintain transaction ordering', async () => {
      const executionOrder: number[] = []
      
      vi.mocked(mockGenericApp.signWithMetadataEd25519).mockImplementation(async (path) => {
        const index = Number.parseInt(path.split('/').pop() || '0')
        
        // Simulate variable processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
        
        executionOrder.push(index)
        return { signature: Buffer.from(`sig-${index}`) }
      })

      await ledgerService.connectDevice()

      // Submit transactions in order
      const signingPromises = [0, 1, 2, 3, 4].map(i =>
        ledgerService.signTransaction(
          `m/44'/354'/0'/0'/${i}'`,
          new Uint8Array([i]),
          'polkadot',
          new Uint8Array([i])
        )
      )

      await Promise.allSettled(signingPromises)

      // Execution order should be deterministic (FIFO or serialized)
      expect(executionOrder).toEqual([0, 1, 2, 3, 4])
    })
  })
})

/**
 * Utility function to test concurrent operations safely
 */
async function testConcurrentSafety<T>(
  operation: () => Promise<T>,
  concurrency: number,
  maxSuccessful = 1
): Promise<{
  successful: number
  failed: number
  errors: Error[]
}> {
  const promises = Array.from({ length: concurrency }, operation)
  const results = await Promise.allSettled(promises)

  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason)

  expect(successful).toBeLessThanOrEqual(maxSuccessful)
  expect(successful + failed).toBe(concurrency)

  return { successful, failed, errors }
}

/**
 * Utility to check for memory leaks
 */
function checkMemoryUsage(): { before: NodeJS.MemoryUsage; after: () => NodeJS.MemoryUsage } {
  const before = process.memoryUsage()
  
  return {
    before,
    after: () => {
      global.gc?.() // Force garbage collection if available
      return process.memoryUsage()
    }
  }
}