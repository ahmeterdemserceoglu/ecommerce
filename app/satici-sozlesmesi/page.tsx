import React from 'react';

export default function SellerAgreementPage() {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-6">HDTicaret Satıcı Sözleşmesi</h1>
            <div className="prose lg:prose-xl max-w-none dark:prose-invert bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
                <p className="text-sm text-gray-500 dark:text-gray-400">Son Güncelleme Tarihi: 24 Temmuz 2024</p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">1. Taraflar</h2>
                <p>
                    İşbu Satıcı Sözleşmesi ("Sözleşme"), bir tarafta [Şirket Adresi] adresinde mukim [Şirket Ünvanı] ("HDTicaret") ile diğer tarafta HDTicaret platformunda ("Platform") ürün ve/veya hizmet satışı yapmak üzere işbu Sözleşme'yi onaylayan satıcı ("Satıcı") arasında akdedilmiştir.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">2. Sözleşmenin Konusu</h2>
                <p>
                    İşbu Sözleşme'nin konusu, Satıcı'nın Platform üzerinden ürün ve/veya hizmetlerini satışa sunmasına, HDTicaret'in bu satışlara aracılık etmesine ilişkin tarafların hak ve yükümlülüklerinin belirlenmesidir.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">3. Satıcının Hak ve Yükümlülükleri</h2>
                <p><strong>3.1.</strong> Satıcı, Platform'da satışa sunacağı tüm ürün ve hizmetlerin yasalara uygun, orijinal, doğru ve eksiksiz bilgilerle tanıtıldığını kabul ve taahhüt eder.</p>
                <p><strong>3.2.</strong> Satıcı, Fikri ve Sınai Mülkiyet Hukuku, Tüketicinin Korunması Hakkında Kanun, Elektronik Ticaretin Düzenlenmesi Hakkında Kanun başta olmak üzere ilgili tüm mevzuata uygun hareket edecektir.</p>
                <p><strong>3.3.</strong> Satıcı, ürün listeleme, fiyatlandırma, stok yönetimi, sipariş karşılama, kargolama ve müşteri hizmetleri süreçlerinden kendisi sorumludur.</p>
                <p><strong>3.4.</strong> Satıcı, HDTicaret tarafından belirlenen komisyon oranlarını ve ödeme koşullarını kabul eder.</p>
                {/* ... Daha fazla madde eklenebilir ... */}

                <h2 className="text-2xl font-semibold mt-6 mb-3">4. HDTicaret'in Hak ve Yükümlülükleri</h2>
                <p><strong>4.1.</strong> HDTicaret, Platform'un kesintisiz ve güvenli bir şekilde çalışması için gerekli teknik altyapıyı sağlar.</p>
                <p><strong>4.2.</strong> HDTicaret, Satıcı'nın Platform üzerinden gerçekleştirdiği satışlardan doğan alacaklarından, belirlenen komisyon oranını düştükten sonra kalan tutarı Satıcı'ya öder.</p>
                <p><strong>4.3.</strong> HDTicaret, Sözleşme'ye veya yasalara aykırı hareket eden Satıcı'nın hesabını askıya alma veya kapatma hakkını saklı tutar.</p>
                {/* ... Daha fazla madde eklenebilir ... */}

                <h2 className="text-2xl font-semibold mt-6 mb-3">5. Gizlilik</h2>
                <p>
                    Taraflar, işbu Sözleşme kapsamında edindikleri her türlü ticari sırrı ve kişisel veriyi gizli tutmayı ve yasal zorunluluklar dışında üçüncü kişilerle paylaşmamayı kabul ve taahhüt ederler.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">6. Sözleşmenin Süresi ve Feshi</h2>
                <p>
                    İşbu Sözleşme, Satıcı tarafından elektronik ortamda onaylandığı tarihte yürürlüğe girer ve taraflardan biri tarafından feshedilmediği sürece yürürlükte kalır. Taraflar, [Fesih Bildirim Süresi, örn: 30 gün] önceden yazılı bildirimde bulunmak kaydıyla Sözleşme'yi her zaman feshedebilirler.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-3">7. Uygulanacak Hukuk ve Yetkili Mahkeme</h2>
                <p>
                    İşbu Sözleşme'nin yorumlanmasında ve uygulanmasında Türk Hukuku geçerlidir. Sözleşme'den doğabilecek her türlü uyuşmazlığın çözümünde İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir.
                </p>

                <p className="mt-8">
                    İşbu Satıcı Sözleşmesi'ni okuduğumu, anladığımı ve tüm hükümlerini kabul ettiğimi beyan ederim.
                </p>
            </div>
        </div>
    );
} 