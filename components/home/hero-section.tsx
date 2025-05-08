"use client"
import { Users, TrendingUp, ShieldCheck } from "lucide-react"

export function HeroSection() {
  return (
    <section className="w-full flex flex-col items-center justify-center py-16 md:py-24 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
      <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white text-center mb-4 leading-tight">
        Türkiye'nin En Yeni <span className="text-orange-500">E-Ticaret Pazaryeri</span>
      </h1>
      <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 text-center mb-8">
        Desteklerinizle Birlikte Büyüyelim!
      </p>
      <form className="w-full max-w-lg mx-auto flex mb-8">
        <input
          type="text"
          placeholder="Ne aramıştınız?"
          className="flex-1 rounded-l-full px-6 py-3 text-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
        />
        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 text-lg rounded-r-full transition"
        >
          Ara
        </button>
      </form>
      <div className="flex flex-col md:flex-row gap-4 mt-2 w-full justify-center items-center">
        <div className="flex items-center gap-2">
          <Users className="text-orange-500" size={22} />
          <span className="text-gray-700 dark:text-gray-200 text-sm">Topluluk Desteği</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="text-orange-500" size={22} />
          <span className="text-gray-700 dark:text-gray-200 text-sm">Büyüyen Platform</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-orange-500" size={22} />
          <span className="text-gray-700 dark:text-gray-200 text-sm">Güvenli Alışveriş</span>
        </div>
      </div>
    </section>
  )
}
