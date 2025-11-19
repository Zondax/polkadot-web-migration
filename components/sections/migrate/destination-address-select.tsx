import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { SelectWithCustom } from '@/components/SelectWithCustom'
import type { AppId } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { hasBalance } from '@/lib/utils'
import { observer } from '@legendapp/state/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Address, AddressBalance } from 'state/types/ledger'

interface DestinationAddressSelectProps {
  appId: AppId
  balance: AddressBalance
  index: number
  polkadotAddresses: Address[] | undefined
  onDestinationChange: (destination: Address, index: number) => void
}

function DestinationAddressSelect({ appId, balance, index, polkadotAddresses, onDestinationChange }: DestinationAddressSelectProps) {
  const [destinationAddress, setDestinationAddress] = useState<Address | undefined>(balance.transaction?.destinationAddress)

  useEffect(() => {
    setDestinationAddress(balance.transaction?.destinationAddress)
  }, [balance])

  const handleValueChange = useCallback(
    (addressString: string) => {
      const option = polkadotAddresses?.find(opt => opt.address === addressString)
      const destination = option || { address: addressString, path: '', pubKey: '' }
      setDestinationAddress(destination)
      onDestinationChange(destination, index)
    },
    [polkadotAddresses, index, onDestinationChange]
  )

  const isDisabled = useMemo(() => {
    return !hasBalance([balance]) || !polkadotAddresses || polkadotAddresses.length === 0
  }, [balance, polkadotAddresses])

  const renderOption = useCallback(
    (option: Address, index: number) => {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Polkadot {index + 1}:</span>
            <ExplorerLink
              value={option.address}
              appId={appId as AppId}
              explorerLinkType={ExplorerItemType.Address}
              disableTooltip
              hasCopyButton={false}
            />
          </div>
          {option.path && <div className="text-xs text-gray-400">Derivation Path: {option.path}</div>}
        </div>
      )
    },
    [appId]
  )

  const renderSelectedValue = useCallback(
    (option: Address) => {
      return (
        <CustomTooltip tooltipBody={`${option.address} - ${option.path}`}>
          <div className="flex items-center gap-2">
            <ExplorerLink
              value={option.address}
              appId={appId as AppId}
              explorerLinkType={ExplorerItemType.Address}
              disableTooltip
              hasCopyButton={false}
            />
          </div>
        </CustomTooltip>
      )
    },
    [appId]
  )

  return (
    <SelectWithCustom
      options={polkadotAddresses ?? []}
      placeholder="Select a Polkadot address..."
      customPlaceholder="Enter custom Polkadot address"
      onValueChange={handleValueChange}
      renderOption={renderOption}
      renderSelectedValue={renderSelectedValue}
      getOptionValue={option => option.address}
      getOptionLabel={option => option.address}
      selectedValue={destinationAddress?.address}
      defaultValue={destinationAddress?.address ?? polkadotAddresses?.[0].address}
      disabled={isDisabled}
    />
  )
}

export default observer(DestinationAddressSelect)
