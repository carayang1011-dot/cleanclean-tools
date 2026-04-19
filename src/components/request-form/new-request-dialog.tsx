'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { NewRequestForm } from './step-form'
import type { Channel } from '@/lib/types'

interface Props {
  channels: Channel[]
  requesterId: string
}

export function NewRequestDialog({ channels, requesterId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSuccess() {
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        size="default"
        className="gap-2 bg-brand-800 hover:bg-brand-900 text-white"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />發新需求
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增設計需求</DialogTitle>
          </DialogHeader>
          <NewRequestForm
            channels={channels}
            requesterId={requesterId}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
