"use client";
import { useState } from "react"
import {
  ShoppingBag,
  Shirt,
  User,
  Baby,
  Home,
  ShoppingCart,
  Heart,
  Monitor,
  Dumbbell,
  BookOpen,
  MoreHorizontal,
} from "lucide-react"

const categories = [
  {
    name: "Kadın",
    icon: <User className="w-5 h-5" />,
    sub: [
      { title: "Giyim", items: ["Elbise", "Tişört", "Gömlek", "Pantolon", "Mont", "Ceket", "Etek", "Sweatshirt"] },
      { title: "Ayakkabı", items: ["Topuklu Ayakkabı", "Sneaker", "Bot", "Çizme"] },
      { title: "Çanta", items: ["Omuz Çantası", "Sırt Çantası", "El Çantası"] },
    ],
  },
  {
    name: "Erkek",
    icon: <Shirt className="w-5 h-5" />,
    sub: [
      { title: "Giyim", items: ["Tişört", "Gömlek", "Pantolon", "Mont", "Ceket", "Sweatshirt"] },
      { title: "Ayakkabı", items: ["Sneaker", "Bot", "Çizme"] },
    ],
  },
  {
    name: "Anne & Çocuk",
    icon: <Baby className="w-5 h-5" />,
    sub: [
      { title: "Bebek Giyim", items: ["Tulum", "Body", "Zıbın"] },
      { title: "Oyuncak", items: ["Peluş", "Eğitici Oyuncak"] },
    ],
  },
  {
    name: "Ev & Yaşam",
    icon: <Home className="w-5 h-5" />,
    sub: [
      { title: "Mobilya", items: ["Koltuk", "Masa", "Sandalye"] },
      { title: "Dekorasyon", items: ["Ayna", "Tablo", "Vazo"] },
    ],
  },
  {
    name: "Süpermarket",
    icon: <ShoppingCart className="w-5 h-5" />,
    sub: [
      { title: "Gıda", items: ["Atıştırmalık", "İçecek", "Kahvaltılık"] },
      { title: "Temizlik", items: ["Deterjan", "Kağıt Ürünler"] },
    ],
  },
  {
    name: "Kozmetik",
    icon: <Heart className="w-5 h-5" />,
    sub: [
      { title: "Makyaj", items: ["Ruj", "Fondöten", "Maskara"] },
      { title: "Cilt Bakım", items: ["Krem", "Serum"] },
    ],
  },
  {
    name: "Ayakkabı & Çanta",
    icon: <ShoppingBag className="w-5 h-5" />,
    sub: [
      { title: "Ayakkabı", items: ["Sneaker", "Bot", "Çizme"] },
      { title: "Çanta", items: ["Omuz Çantası", "Sırt Çantası"] },
    ],
  },
  {
    name: "Elektronik",
    icon: <Monitor className="w-5 h-5" />,
    sub: [
      { title: "Bilgisayar", items: ["Laptop", "Masaüstü", "Tablet"] },
      { title: "Telefon", items: ["Akıllı Telefon", "Aksesuar"] },
    ],
  },
  {
    name: "Spor & Outdoor",
    icon: <Dumbbell className="w-5 h-5" />,
    sub: [
      { title: "Giyim", items: ["Eşofman", "Tişört", "Mont"] },
      { title: "Ekipman", items: ["Koşu Bandı", "Ağırlık"] },
    ],
  },
  {
    name: "Kitap & Kırtasiye & Hobi",
    icon: <BookOpen className="w-5 h-5" />,
    sub: [
      { title: "Kitap", items: ["Roman", "Çocuk Kitabı", "Edebiyat"] },
      { title: "Hobi", items: ["Puzzle", "Boyama"] },
    ],
  },
  {
    name: "Daha Fazla",
    icon: <MoreHorizontal className="w-5 h-5" />,
    sub: [],
  },
]

export default function CategoryMegaMenu() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <nav className="relative z-50 w-full bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center gap-1 px-6 py-2 overflow-x-auto scrollbar-hide">
        {categories.map((cat, i) => (
          <div
            key={cat.name}
            className={`relative group flex flex-col items-center justify-center px-2 py-1 mx-1 cursor-pointer select-none transition-all duration-150 ${openIndex === i ? "bg-orange-50" : "hover:bg-gray-50"} rounded-xl min-w-[70px]`}
            onMouseEnter={() => setOpenIndex(i)}
            onMouseLeave={() => setOpenIndex(null)}
          >
            <div className={`w-10 h-10 flex items-center justify-center rounded-full mb-1 transition-all duration-150 ${openIndex === i ? "bg-orange-500 text-white shadow-lg" : "bg-gray-100 text-gray-700 group-hover:bg-orange-100 group-hover:text-orange-500"}`}>
              {cat.icon}
            </div>
            <span className="font-medium text-xs text-center whitespace-nowrap truncate w-full">{cat.name}</span>
            {/* Mega menu */}
            {cat.sub.length > 0 && openIndex === i && (
              <div className="absolute left-1/2 -translate-x-1/2 top-[60px] mt-2 w-[700px] bg-white shadow-2xl rounded-2xl border border-gray-100 p-6 flex gap-8 animate-fade-in z-50">
                {cat.sub.map((col) => (
                  <div key={col.title} className="min-w-[140px]">
                    <div className="font-semibold text-gray-700 mb-2 text-sm">{col.title}</div>
                    <ul className="space-y-1">
                      {col.items.map((item) => (
                        <li key={item} className="text-gray-600 hover:text-orange-500 cursor-pointer text-sm transition">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.18s cubic-bezier(.4,0,.2,1); }
      `}</style>
    </nav>
  )
} 