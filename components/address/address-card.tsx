"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, MapPin, Phone } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface AddressCardProps {
  address: any
  onDelete?: () => void
}

export function AddressCard({ address, onDelete }: AddressCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/addresses?id=${address.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Adres silinirken bir hata oluştu")
      }

      toast({
        title: "Adres silindi",
        description: "Adresiniz başarıyla silindi.",
      })

      if (onDelete) {
        onDelete()
      } else {
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getAddressTypeLabel = (type: string) => {
    switch (type) {
      case "shipping":
        return "Teslimat Adresi"
      case "billing":
        return "Fatura Adresi"
      case "both":
        return "Teslimat ve Fatura Adresi"
      default:
        return "Adres"
    }
  }

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{address.title}</h3>
            <p className="text-sm text-muted-foreground">{address.full_name}</p>
          </div>
          <div className="flex flex-col gap-1">
            {address.is_default && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Varsayılan
              </Badge>
            )}
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
              {getAddressTypeLabel(address.address_type)}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start">
            <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
            <div>
              <p>{address.address}</p>
              <p>
                {address.district && `${address.district}, `}
                {address.city} {address.postal_code}
              </p>
              <p>{address.country}</p>
            </div>
          </div>

          {address.phone && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              <p>{address.phone}</p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-4 pt-0">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/hesabim/adreslerim/duzenle/${address.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Düzenle
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/20">
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Adresi Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu adresi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Siliniyor..." : "Evet, Sil"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
