"use client"

import Image from "next/image"
import Link from "next/link"
import { QrCode, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MobileAppPromo() {
  return (
    <section className="mb-12 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 to-orange-400 text-white">
      <div className="container mx-auto flex flex-col items-center px-4 py-8 md:flex-row md:py-0 lg:px-8">
        {/* Content */}
        <div className="mb-8 w-full md:mb-0 md:w-1/2 md:py-12 lg:pr-12">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Mobil Uygulamamızı İndirin</h2>
          <p className="mb-6 text-lg text-orange-50">
            Daha hızlı alışveriş, özel indirimler ve bildirimlerle fırsatları kaçırmayın!
          </p>

          <div className="mb-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-orange-600">
                <Check className="h-4 w-4" />
              </div>
              <p className="text-sm">Özel kampanya ve indirimler</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-orange-600">
                <Check className="h-4 w-4" />
              </div>
              <p className="text-sm">Daha hızlı ödeme seçenekleri</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-orange-600">
                <Check className="h-4 w-4" />
              </div>
              <p className="text-sm">Sipariş takibi ve bildirimler</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* App Store Button */}
            <Link
              href="#"
              className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 transition-transform hover:scale-105"
            >
              <div className="text-2xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.5" />
                  <path d="M16 3v4" />
                  <path d="M8 3v4" />
                  <path d="M3 11h18" />
                  <path d="M19 16v6" />
                  <path d="M22 19l-3-3-3 3" />
                </svg>
              </div>
              <div>
                <div className="text-xs">İndir</div>
                <div className="text-sm font-medium">App Store</div>
              </div>
            </Link>

            {/* Google Play Button */}
            <Link
              href="#"
              className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 transition-transform hover:scale-105"
            >
              <div className="text-2xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                  <path d="m13 13 6 6" />
                </svg>
              </div>
              <div>
                <div className="text-xs">İNDİR</div>
                <div className="text-sm font-medium">Google Play</div>
              </div>
            </Link>

            {/* QR Code Button */}
            <Button
              variant="outline"
              className="border-white bg-transparent text-white hover:bg-white hover:text-orange-600"
            >
              <QrCode className="mr-2 h-4 w-4" />
              QR Kod ile İndir
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="relative h-[300px] w-full md:h-[400px] md:w-1/2">
          <Image src="/placeholder.svg?height=400&width=300" alt="Mobil Uygulama" fill className="object-contain" />
        </div>
      </div>
    </section>
  )
}

export default MobileAppPromo
