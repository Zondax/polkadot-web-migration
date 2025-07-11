import * as React from 'react'

import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, error, helperText, ...props }, ref) => {
  return (
    <div>
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-2 border-red-500 focus-visible:ring-red-500'
            : 'border-input',
          className
        )}
        ref={ref}
        {...props}
      />
      {helperText && (
        <div className={cn('mt-1 text-xs', error ? 'text-red-500' : 'text-muted-foreground')}>{helperText}</div>
      )}
    </div>
  )
})
Input.displayName = 'Input'

export { Input }
