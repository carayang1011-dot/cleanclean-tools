'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { FormProvider, UseFormReturn, FieldValues } from 'react-hook-form'

interface FormDialogProps<T extends FieldValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  form: UseFormReturn<T>
  onSubmit: (data: T) => void | Promise<void>
  isLoading?: boolean
  submitLabel?: string
  children: React.ReactNode
}

export function FormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  form,
  onSubmit,
  isLoading = false,
  submitLabel = '儲存',
  children,
}: FormDialogProps<T>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {children}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
