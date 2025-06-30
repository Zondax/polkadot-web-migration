import { CustomTooltip } from '@/components/CustomTooltip'
import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { Spinner } from '@/components/icons'
import TokenIcon from '@/components/TokenIcon'
import { type AppId, getChainName, type Token } from '@/config/apps'
import { cn, formatBalance } from '@/lib/utils'
import type { BN } from '@polkadot/util'
import type { ReactNode } from 'react'

export function DialogField({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-sm ${className}`}>{children}</div>
}

export function DialogLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-xs text-muted-foreground mb-1', className)}>{children}</div>
}

export function DialogContent({ loading, children }: { loading: boolean; children: ReactNode }) {
  return loading ? (
    <div className="flex items-start">
      <Spinner className="w-4 h-4" />
    </div>
  ) : (
    children
  )
}

export function DialogNetworkContent({ token, appId }: { token: Token; appId: AppId }) {
  const icon = useTokenLogo(token.logoId)
  const appName = getChainName(appId)
  return (
    <div className="flex items-center gap-2">
      <TokenIcon icon={icon} symbol={token.symbol} size="md" />
      <span className="font-semibold text-base">{appName}</span>
    </div>
  )
}

export function DialogEstimatedFeeContent({
  token,
  estimatedFee,
  loading,
}: { token: Token; estimatedFee: BN | undefined; loading: boolean }) {
  return (
    <DialogContent loading={loading}>
      {estimatedFee ? (
        <CustomTooltip tooltipBody={formatBalance(estimatedFee, token, token?.decimals, true)}>
          <span className="font-mono">{formatBalance(estimatedFee, token)}</span>
        </CustomTooltip>
      ) : (
        'Could not be calculated at this time'
      )}
    </DialogContent>
  )
}

export function DialogError({ error }: { error?: string }) {
  if (!error) return null
  return (
    <div className="text-xs text-red-500 mt-1" role="alert">
      {error}
    </div>
  )
}
