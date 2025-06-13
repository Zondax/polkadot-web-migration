'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Check, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from './ui/badge'

interface Option {
  value: string
  label: string
}

interface SelectWithCustomProps {
  options: Option[]
  placeholder?: string
  customPlaceholder?: string
  selectedValue?: string
  onValueChange?: (value: string) => void
  renderOption?: (option: Option, index: number) => React.ReactNode
  className?: string
  disabled?: boolean
}

export function SelectWithCustom({
  options,
  placeholder = 'Select an option...',
  customPlaceholder = 'Enter custom value',
  onValueChange,
  renderOption,
  selectedValue,
  className,
  disabled,
}: SelectWithCustomProps) {
  const [customValue, setCustomValue] = useState<string>('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const customValueKey = '__add_custom__'

  useEffect(() => {
    if (isAddingCustom && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingCustom])

  const handleSelectChange = (value: string) => {
    if (value === customValueKey) {
      setIsAddingCustom(true)
      return
    }

    setIsCustomMode(false)
    setCustomValue('')
    onValueChange?.(value)
  }

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      setCustomValue(customInput.trim())
      setIsCustomMode(true)
      setIsAddingCustom(false)
      setCustomInput('')
      onValueChange?.(customInput.trim())
    }
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomSubmit()
    } else if (e.key === 'Escape') {
      setIsAddingCustom(false)
      setCustomInput('')
    }
  }

  const handleRemoveCustom = () => {
    setCustomValue('')
    setIsCustomMode(false)
    onValueChange?.(options[0]?.value ?? '')
  }

  useEffect(() => {
    if (selectedValue && !options.find(option => option.value === selectedValue)) {
      setCustomValue(selectedValue)
      setIsCustomMode(true)
    }
  }, [selectedValue, options])

  if (isCustomMode && customValue) {
    return (
      <div className={cn('relative', className)}>
        <div className="flex items-center gap-2 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-foreground font-medium">{customValue}</span>
            <Badge variant="light-gray" className="text-[10px] leading-tight flex-shrink-0">
              Custom
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            onClick={handleRemoveCustom}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  if (isAddingCustom) {
    return (
      <div className={cn('relative', className)}>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder={customPlaceholder}
            className="flex-1"
          />
          <Button size="sm" onClick={handleCustomSubmit} disabled={!customInput.trim()} className="px-3">
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAddingCustom(false)
              setCustomInput('')
            }}
            className="px-3"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Press Enter to confirm or Escape to cancel</p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <Select value={selectedValue} onValueChange={handleSelectChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => (
            <SelectItem key={option.value} value={option.value}>
              {renderOption ? (
                renderOption(option, index)
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                  {option.label}
                </div>
              )}
            </SelectItem>
          ))}
          <div className="border-t my-1" />
          <SelectItem value={customValueKey} className="text-primary hover:text-primary-foreground hover:bg-primary">
            <div className="flex items-center gap-2">
              <Plus className="h-3 w-3" />
              Add Custom Value
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
