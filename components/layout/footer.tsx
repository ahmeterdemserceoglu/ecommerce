import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t">
      <div className="max-w-[1440px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">HDTicaret</h3>
            <p className="text-sm text-muted-foreground">
              Türkiye'nin en kapsamlı e-ticaret pazaryeri platformu. Binlerce satıcı ve milyonlarca ürün.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Kurumsal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/hakkimizda" className="text-muted-foreground hover:text-foreground">
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="/kariyer" className="text-muted-foreground hover:text-foreground">
                  Kariyer
                </Link>
              </li>
              <li>
                <Link href="/iletisim" className="text-muted-foreground hover:text-foreground">
                  İletişim
                </Link>
              </li>
              <li>
                <Link href="/basin" className="text-muted-foreground hover:text-foreground">
                  Basın
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Yardım</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/yardim" className="text-muted-foreground hover:text-foreground">
                  Sıkça Sorulan Sorular
                </Link>
              </li>
              <li>
                <Link href="/kargo-takip" className="text-muted-foreground hover:text-foreground">
                  Kargo Takip
                </Link>
              </li>
              <li>
                <Link href="/iade-kosullari" className="text-muted-foreground hover:text-foreground">
                  İade Koşulları
                </Link>
              </li>
              <li>
                <Link href="/guvenli-alisveris" className="text-muted-foreground hover:text-foreground">
                  Güvenli Alışveriş
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Sat��cı Ol</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/satici-ol" className="text-muted-foreground hover:text-foreground">
                  Satıcı Başvurusu
                </Link>
              </li>
              <li>
                <Link href="/satici-egitim" className="text-muted-foreground hover:text-foreground">
                  Satıcı Eğitimi
                </Link>
              </li>
              <li>
                <Link href="/satici-sozlesme" className="text-muted-foreground hover:text-foreground">
                  Satıcı Sözleşmesi
                </Link>
              </li>
              <li>
                <Link href="/satici-destek" className="text-muted-foreground hover:text-foreground">
                  Satıcı Destek
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} HDTicaret. Tüm hakları saklıdır.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="/gizlilik" className="text-sm text-muted-foreground hover:text-foreground">
              Gizlilik Politikası
            </Link>
            <Link href="/kullanim-kosullari" className="text-sm text-muted-foreground hover:text-foreground">
              Kullanım Koşulları
            </Link>
            <Link href="/cerez-politikasi" className="text-sm text-muted-foreground hover:text-foreground">
              Çerez Politikası
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
