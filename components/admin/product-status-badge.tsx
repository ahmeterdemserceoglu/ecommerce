import { CheckCircle, XCircle, Clock } from "lucide-react"

interface ProductStatusBadgeProps {
  isApproved: boolean | null
  rejectReason?: string | null
}

export function ProductStatusBadge({ isApproved, rejectReason }: ProductStatusBadgeProps) {
  if (isApproved === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        Onay Bekliyor
      </span>
    )
  }

  if (isApproved) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Onaylandı
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <XCircle className="w-3 h-3 mr-1" />
      Reddedildi
      {rejectReason && <span className="ml-1 text-xs text-red-600">({rejectReason})</span>}
    </span>
  )
}
