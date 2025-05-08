"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProductApprovalTabsProps {
  value: string
  onValueChange: (value: string) => void
}

export function ProductApprovalTabs({ value, onValueChange }: ProductApprovalTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="new">Yeni Gelenler (1 Gün)</TabsTrigger>
        <TabsTrigger value="pending">Onay Bekleyenler</TabsTrigger>
        <TabsTrigger value="approved">Onaylananlar</TabsTrigger>
        <TabsTrigger value="rejected">Reddedilenler</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
