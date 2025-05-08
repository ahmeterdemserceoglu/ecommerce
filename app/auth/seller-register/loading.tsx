import { Loader2 } from "lucide-react"

export default function SellerRegisterLoading() {
  return (
    <div className="container max-w-md py-12">
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  )
}
