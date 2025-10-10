import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

export type ButtonVariant = 'default' | 'destructive' | 'outline-solid' | 'secondary' | 'ghost' | 'link' | 'gray' | 'purple'
export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'wide'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        gray: 'bg-[#AEB7CB] hover:bg-[#6E7391] text-white',
        purple: 'bg-[#7916F3] hover:bg-[#6B46C1] text-white',
      },
      size: {
        default: 'h-10 px-4 py-2',
        xs: 'h-6 min-w-6 rounded-md px-3 [&_svg]:size-3.5',
        sm: 'h-8 min-w-8 rounded-md px-3',
        lg: 'h-11 min-w-11 rounded-md px-8 [&_svg]:size-5',
        icon: 'h-10 w-10 [&_svg]:size-5',
        wide: 'px-6 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  // pointer-events-none is used so the button can be wrapped by a tooltip and still be triggered when disabled
  return <Comp className={cn(buttonVariants({ variant, size, className }), disabled && 'opacity-50 pointer-events-none')} ref={ref} disabled={disabled} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
