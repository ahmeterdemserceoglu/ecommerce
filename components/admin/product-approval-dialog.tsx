"use client"

import { useState } from "react"
import { useProductApproval } from "@/hooks/use-product-approval"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ProductApprovalDialogProps {
  productId: string
  onSuccess?: () => void
}

export function ProductApprovalDialog({ productId, onSuccess }: ProductApprovalDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const { loading, approveProduct, rejectProduct } = useProductApproval()

  const handleApprove = async () => {
    const success = await approveProduct(productId)
    if (success) {
      setIsOpen(false)
      onSuccess?.()
    }
  }

  const handleReject = async () => {
    if (!rejectReason) {
      return
    }
    const success = await rejectProduct(productId, rejectReason)
    if (success) {
      setIsOpen(false)
      setRejectReason("")
      onSuccess?.()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Onay/Red</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ürün Onay/Red</DialogTitle>
          <DialogDescription>Ürünü onaylamak veya reddetmek için aşağıdaki seçenekleri kullanın.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Red Sebebi</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ürünü reddetmek için sebep girin..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleApprove} disabled={loading}>
            Onayla
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={loading || !rejectReason}>
            Reddet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
