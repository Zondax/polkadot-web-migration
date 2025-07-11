import { muifyHtml } from '@/lib/utils'

interface TokenIconProps {
  icon?: string
  symbol: string
  size?: 'sm' | 'md' | 'lg'
}

const TokenIcon = ({ icon, symbol, size = 'md' }: TokenIconProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6 [&_svg]:h-6 [&_svg]:w-6',
    md: 'h-8 w-8 [&_svg]:h-8 [&_svg]:w-8',
    lg: 'h-12 w-12 [&_svg]:h-12 [&_svg]:w-12',
  }

  return (
    <div className={`overflow-hidden rounded-full ${sizeClasses[size]}`}>
      {icon ? (
        <div className={'flex h-full w-full items-center justify-center'}>{muifyHtml(icon)}</div>
      ) : (
        <div className="flex h-full items-center justify-center bg-muted">
          <span className="text-xs text-muted-foreground">{symbol}</span>
        </div>
      )}
    </div>
  )
}

export default TokenIcon
