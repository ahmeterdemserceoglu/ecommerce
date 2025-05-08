export const ShippingInfo = () => {
  return (
    <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      {/* Ücretsiz Kargo */}
      <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:border-orange-200 hover:shadow">
        <div className="mb-4 rounded-full bg-orange-100 p-3 text-orange-600">
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
            <rect width="16" height="16" x="4" y="4" rx="2" />
            <path d="M9 9h6v6H9z" />
            <path d="m9 1 3 3 3-3" />
            <path d="m9 23 3-3 3 3" />
            <path d="m1 9 3 3-3 3" />
            <path d="m23 9-3 3 3 3" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium">Ücretsiz Kargo</h3>
        <p className="text-sm text-gray-600">150₺ üzeri tüm siparişlerde ücretsiz kargo</p>
      </div>

      {/* Güvenli Ödeme */}
      <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:border-orange-200 hover:shadow">
        <div className="mb-4 rounded-full bg-orange-100 p-3 text-orange-600">
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
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium">Güvenli Ödeme</h3>
        <p className="text-sm text-gray-600">256-bit SSL ile şifrelenmiş güvenli ödeme</p>
      </div>

      {/* 7/24 Destek */}
      <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:border-orange-200 hover:shadow">
        <div className="mb-4 rounded-full bg-orange-100 p-3 text-orange-600">
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
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium">7/24 Destek</h3>
        <p className="text-sm text-gray-600">Müşteri hizmetlerimiz her zaman yanınızda</p>
      </div>

      {/* Kolay İade */}
      <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:border-orange-200 hover:shadow">
        <div className="mb-4 rounded-full bg-orange-100 p-3 text-orange-600">
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
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium">Kolay İade</h3>
        <p className="text-sm text-gray-600">14 gün içinde koşulsuz iade garantisi</p>
      </div>
    </section>
  )
}

export default ShippingInfo
