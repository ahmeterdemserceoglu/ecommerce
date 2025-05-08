"use client"

const categories = [
  "Elektronik",
  "Moda",
  "Ev & Yaşam",
  "Kozmetik",
  "Spor",
  "Kitap",
  "Oto",
  "Anne & Bebek",
  "Süpermarket",
]
const brands = ["Apple", "Samsung", "Nike", "Adidas", "Arçelik", "Vestel", "Xiaomi", "Puma", "Philips"]
const sellers = ["Hepsiburada", "Trendyol", "Amazon", "N11", "Vatan", "Teknosa"]

export default function FilterPanel({ filters, setFilters }: { filters: any; setFilters: (f: any) => void }) {
  return (
    <aside className="w-full md:w-64 bg-white rounded-lg shadow p-4 mb-6 md:mb-0">
      <h3 className="font-bold text-lg mb-4">Filtreler</h3>
      {/* Kategori */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Kategori</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.category || ""}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">Tümü</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      {/* Marka */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Marka</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.brand || ""}
          onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
        >
          <option value="">Tümü</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>
      {/* Fiyat */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Fiyat Aralığı</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            className="w-1/2 border rounded px-2 py-1"
            value={filters.minPrice || ""}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
          />
          <input
            type="number"
            placeholder="Maks"
            className="w-1/2 border rounded px-2 py-1"
            value={filters.maxPrice || ""}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          />
        </div>
      </div>
      {/* Puan */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Puan</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.rating || ""}
          onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
        >
          <option value="">Tümü</option>
          <option value="4">4 yıldız ve üzeri</option>
          <option value="3">3 yıldız ve üzeri</option>
          <option value="2">2 yıldız ve üzeri</option>
          <option value="1">1 yıldız ve üzeri</option>
        </select>
      </div>
      {/* Stok */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Stok</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.stock || ""}
          onChange={(e) => setFilters({ ...filters, stock: e.target.value })}
        >
          <option value="">Tümü</option>
          <option value="in">Stokta Olanlar</option>
          <option value="out">Stokta Olmayanlar</option>
        </select>
      </div>
      {/* İndirim */}
      <div className="mb-4">
        <label className="block font-medium mb-1">İndirim</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.discount || ""}
          onChange={(e) => setFilters({ ...filters, discount: e.target.value })}
        >
          <option value="">Tümü</option>
          <option value="yes">İndirimli</option>
          <option value="no">İndirimsiz</option>
        </select>
      </div>
      {/* Yeni Gelenler */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Yeni Gelenler</label>
        <input
          type="checkbox"
          checked={!!filters.new}
          onChange={(e) => setFilters({ ...filters, new: e.target.checked })}
        />
        <span className="ml-2">Sadece yeni ürünler</span>
      </div>
      {/* Satıcı */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Satıcı</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.seller || ""}
          onChange={(e) => setFilters({ ...filters, seller: e.target.value })}
        >
          <option value="">Tümü</option>
          {sellers.map((seller) => (
            <option key={seller} value={seller}>
              {seller}
            </option>
          ))}
        </select>
      </div>
      {/* Sıralama */}
      <div className="mb-2">
        <label className="block font-medium mb-1">Sırala</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={filters.sort || ""}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          <option value="">Varsayılan</option>
          <option value="price_asc">Fiyat: Artan</option>
          <option value="price_desc">Fiyat: Azalan</option>
          <option value="new">En Yeniler</option>
          <option value="popular">En Popüler</option>
          <option value="discount">En Çok İndirimli</option>
        </select>
      </div>
    </aside>
  )
}
