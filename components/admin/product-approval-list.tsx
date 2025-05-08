import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductStatusBadge } from "./product-status-badge"
import { ProductApprovalDialog } from "./product-approval-dialog"
import { formatDate } from "@/lib/utils"
import Image from "next/image"
import { ShoppingBag } from "lucide-react"

interface Product {
  id: string
  name: string
  image_url?: string | null
  store_name?: string
  category_name?: string
  price: number
  stock_quantity: number
  is_approved: boolean | null
  reject_reason?: string | null
  submitted_at: string
}

interface ProductApprovalListProps {
  products: Product[]
  onApprovalChange?: () => void
}

export function ProductApprovalList({ products, onApprovalChange }: ProductApprovalListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ürün</TableHead>
          <TableHead>Mağaza</TableHead>
          <TableHead>Kategori</TableHead>
          <TableHead>Fiyat</TableHead>
          <TableHead>Stok</TableHead>
          <TableHead>Başvuru Tarihi</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead className="text-right">İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length > 0 ? (
          products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 relative rounded overflow-hidden bg-gray-100">
                    {product.image_url ? (
                      <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="font-medium">{product.name}</div>
                </div>
              </TableCell>
              <TableCell>{product.store_name || "-"}</TableCell>
              <TableCell>{product.category_name || "-"}</TableCell>
              <TableCell>{product.price.toLocaleString("tr-TR")} ₺</TableCell>
              <TableCell>{product.stock_quantity}</TableCell>
              <TableCell>{formatDate(product.submitted_at)}</TableCell>
              <TableCell>
                <ProductStatusBadge isApproved={product.is_approved} rejectReason={product.reject_reason} />
              </TableCell>
              <TableCell className="text-right">
                <ProductApprovalDialog productId={product.id} onSuccess={onApprovalChange} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-4">
              Henüz ürün bulunmuyor.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
