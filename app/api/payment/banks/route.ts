import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

// Varsayılan banka verileri
const defaultBanks = [
  {
    id: "1",
    name: "Garanti BBVA",
    logo: "/banks/garanti.png",
    supported_card_types: ["VISA", "MASTERCARD"],
  },
  {
    id: "2",
    name: "İş Bankası",
    logo: "/banks/isbank.png",
    supported_card_types: ["VISA", "MASTERCARD", "TROY"],
  },
  {
    id: "3",
    name: "Yapı Kredi",
    logo: "/banks/yapikredi.png",
    supported_card_types: ["VISA", "MASTERCARD"],
  },
  {
    id: "4",
    name: "Akbank",
    logo: "/banks/akbank.png",
    supported_card_types: ["VISA", "MASTERCARD"],
  },
  {
    id: "5",
    name: "Ziraat Bankası",
    logo: "/banks/ziraat.png",
    supported_card_types: ["VISA", "MASTERCARD", "TROY"],
  },
]

export async function GET() {
  try {
    // Admin istemcisini oluştur
    const adminClient = createAdminClient()

    // Admin istemcisi oluşturulamadıysa varsayılan bankaları döndür
    if (!adminClient) {
      console.warn("Admin istemcisi oluşturulamadı - varsayılan bankalar kullanılıyor")
      return NextResponse.json({ banks: defaultBanks })
    }

    // Bankaları getir
    const { data: banks, error } = await adminClient
      .from("banks")
      .select("id, name, logo, supported_card_types")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) {
      console.error("Bankalar yüklenirken hata:", error)
      // Hata durumunda varsayılan bankaları döndür
      return NextResponse.json({ banks: defaultBanks })
    }

    // Banka verisi yoksa varsayılan bankaları döndür
    if (!banks || banks.length === 0) {
      return NextResponse.json({ banks: defaultBanks })
    }

    return NextResponse.json({ banks })
  } catch (error) {
    console.error("Beklenmeyen hata:", error)
    // Herhangi bir hata durumunda varsayılan bankaları döndür
    return NextResponse.json({ banks: defaultBanks })
  }
}
