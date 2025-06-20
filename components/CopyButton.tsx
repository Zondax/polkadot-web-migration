import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button, type ButtonSize } from '@/components/ui/button'
import { copyContent } from '@/lib/utils'

interface CopyButtonProps {
  value: string
  size?: ButtonSize
}

export function CopyButton({ value, size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      copyContent(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    },
    [value]
  )

  return (
    <Button type="button" variant="ghost" size={size} className={'p-0'} onClick={handleCopy}>
      {copied ? <Check /> : <Copy />}
    </Button>
  )
}
