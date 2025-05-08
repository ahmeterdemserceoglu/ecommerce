import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Bildirim sistemini kurmak için SQL komutlarını çalıştır
    const response = await fetch("/api/admin/setup-notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.error || "Bildirim sistemi kurulurken hata oluştu" },
        { status: response.status },
      )
    }

    return NextResponse.json({ message: "Bildirim sistemi başarıyla güncellendi" }, { status: 200 })
  } catch (error: any) {
    console.error("Bildirim sistemi güncellenirken beklenmeyen hata:", error)
    return NextResponse.json({ error: "Bildirim sistemi güncellenirken beklenmeyen bir hata oluştu" }, { status: 500 })
  }
}
