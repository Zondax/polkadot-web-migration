'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

interface ActionButtonProps {
  href: string
  label: string
  variant: 'primary' | 'secondary'
  icon?: React.ReactNode
  external?: boolean
}

export function ActionButton({ href, label, variant, icon, external = false }: ActionButtonProps) {
  const isPrimary = variant === 'primary'

  const buttonContent = (
    <Button
      variant="ghost"
      className={`w-full rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md
              border border-white/20 hover:shadow-md
              group-hover:-translate-y-0.5 transition-all duration-300
              ${isPrimary ? 'bg-white/95 hover:bg-white' : 'bg-transparent hover:bg-white/10 text-white'}`}
      style={isPrimary ? { color: '#FF2670' } : undefined}
    >
      {icon && <span className="mr-2 opacity-90 group-hover:opacity-100 transition-opacity">{icon}</span>}
      <span className="opacity-90 group-hover:opacity-100 transition-opacity">{label}</span>
      {isPrimary && (
        <span className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-300">→</span>
      )}
    </Button>
  )

  const wrapperClassName =
    'w-full sm:w-auto group relative p-px rounded-2xl backdrop-blur-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300'
  const wrapperStyle = {
    background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
  }

  if (external) {
    return (
      <div className={wrapperClassName} style={wrapperStyle}>
        <a href={href} target="_blank" rel="noopener noreferrer">
          {buttonContent}
        </a>
      </div>
    )
  }

  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      <Link href={href}>{buttonContent}</Link>
    </div>
  )
}
