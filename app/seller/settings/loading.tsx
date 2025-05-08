import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function SellerSettingsLoading() {
  return (
    <div className="container mx-auto py-10">
      <Skeleton className="h-10 w-64 mb-6" />

      <div className="mb-6">
        <Skeleton className="h-10 w-full max-w-md mb-2" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
