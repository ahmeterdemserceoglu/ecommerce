"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import AdminLayout from "@/components/admin/AdminLayout"

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayouts()
  }, [])

  const fetchPayouts = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/payouts")
    const data = await res.json()
    setPayouts(data.payouts || [])
    setLoading(false)
  }

  const approvePayout = async (id: string) => {
    await fetch(`/api/admin/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    fetchPayouts()
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Ödeme Talepleri</h1>
        {loading ? (
          <div>Yükleniyor...</div>
        ) : (
          <table className="w-full border">
            <thead>
              <tr>
                <th>Satıcı</th>
                <th>Banka</th>
                <th>IBAN</th>
                <th>Tutar</th>
                <th>Açıklama</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td>{p.seller_name}</td>
                  <td>{p.bank_name}</td>
                  <td>{p.iban}</td>
                  <td>{p.amount} TL</td>
                  <td>{p.description}</td>
                  <td>{p.status}</td>
                  <td>
                    {p.status === "PENDING" && (
                      <Button onClick={() => approvePayout(p.id)}>Ödendi Olarak İşaretle</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
} 