'use client'

import { observer } from '@legendapp/state/react'
import { User as UserIcon } from 'lucide-react'

import { useConnection } from '@/components/hooks/useConnection'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function User() {
  const { connectDevice, disconnectDevice, isLedgerConnected } = useConnection()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full border-white/30 bg-white/10 hover:bg-white/20 text-white">
          <UserIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={isLedgerConnected ? disconnectDevice : connectDevice}>
          {isLedgerConnected ? 'Disconnect wallet' : 'Connect your wallet'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Settings</DropdownMenuItem>
        <DropdownMenuItem disabled>Support</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default observer(User)
