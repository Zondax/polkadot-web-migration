import type Transport from '@ledgerhq/hw-transport'
import { StatusCodes } from '@ledgerhq/hw-transport'
import { processErrorResponse } from '@zondax/ledger-js'

/**
 * Opens an app on the Ledger device.
 * @param transport - The transport instance connected to the Ledger device.
 * @param appName - The name of the app to open.
 * @returns A promise that resolves when the app is successfully opened, or rejects if there is an error.
 */
export async function openApp(transport: Transport, appName: string): Promise<void> {
  try {
    if (!transport) {
      throw new Error('Transport not initialized')
    }

    // Build the APDU to open the  app
    const CLA = 0xe0
    const INS = 0xd8 // This instruction is specific for open app
    const P1 = 0x00
    const P2 = 0x00
    const data = Buffer.from(appName, 'ascii')

    // Send the APDU
    const response = await transport.send(CLA, INS, P1, P2, data, [StatusCodes.OK])

    // Check for success (status code 9000, or 0x9000 in hex)
    const status = response.readUInt16BE(response.length - 2)

    if (status !== StatusCodes.OK) {
      throw new Error(`Open app command failed with status: ${status}`)
    }
  } catch (e) {
    const error = processErrorResponse(e)
    throw error // Propagate the error to the caller
  }
}
