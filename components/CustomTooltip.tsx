'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { type LucideIcon, SquareArrowOutUpRight } from 'lucide-react'
import { CopyButton } from './CopyButton'

interface TooltipItem {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  href?: string
  hasCopyButton?: boolean
  className?: string
}

const CustomTooltip = ({
  children,
  tooltipBody,
  className,
  align = 'center',
  disabled,
}: {
  children: React.ReactNode
  tooltipBody?: React.ReactNode
  className?: string
  align?: 'center' | 'start' | 'end'
  disabled?: boolean
}) => {
  const isString = typeof tooltipBody === 'string'
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild disabled={disabled}>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align={align}
          // Ensure tooltip never exceeds 100vw and is responsive
          className={cn(
            'z-100 break-words whitespace-normal max-w-[100vw] w-auto',
            isString ? 'text-center max-w-[250px]' : 'text-left',
            className
          )}
          sideOffset={5}
        >
          {isString ? <p>{tooltipBody}</p> : tooltipBody}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const TooltipBodyItem = ({ item }: { item: TooltipItem }) => {
  const { label, value, icon: IconComponent, href, hasCopyButton, className } = item
  const isStringValue = typeof value === 'string'
  const hasValue = value !== undefined && value !== '' && value !== null

  return (
    <div className="flex items-start gap-2">
      {IconComponent ? (
        <span className="mt-0.5">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
        </span>
      ) : null}
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground capitalize">{label}</span>
        <div className={cn('flex flex-row items-center gap-1', hasCopyButton ? 'mt-0.5' : 'mt-1', className)}>
          {isStringValue ? (
            <>
              {href && hasValue ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm break-all inline-flex items-center gap-1 max-w-full"
                  style={{ maxWidth: '100vw' }}
                >
                  {value}
                  <SquareArrowOutUpRight className="h-4 w-4 text-muted-foreground p-0.5" />
                </a>
              ) : (
                <span className="text-sm break-all max-w-full" style={{ maxWidth: '100vw' }}>
                  {hasValue ? value : '-'}
                </span>
              )}
              {hasCopyButton && hasValue && <CopyButton value={value as string} size="xs" />}
            </>
          ) : (
            <div className="text-sm max-w-full" style={{ maxWidth: '100vw' }}>
              {hasValue ? value : '-'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const TooltipBody = ({ items }: { items: TooltipItem[] }) => {
  if (!items || items.length === 0) return null
  return (
    <div className="flex flex-col gap-2 min-w-[240px] max-w-[100vw]">
      {items.map(item => (
        <TooltipBodyItem key={item.label} item={item} />
      ))}
    </div>
  )
}

export { CustomTooltip, TooltipBody }
export type { TooltipItem }
