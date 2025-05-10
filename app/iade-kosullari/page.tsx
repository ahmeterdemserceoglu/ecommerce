import React from 'react';

export default function ReturnPolicyPage() {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-6">İade Koşulları</h1>
            <div className="prose lg:prose-xl max-w-none dark:prose-invert">
                <p>
                    HDTicaret olarak müşteri memnuniyetini ön planda tutuyoruz. Satın aldığınız ürünlerden memnun kalmamanız durumunda aşağıdaki koşullar dahilinde iade işlemlerinizi gerçekleştirebilirsiniz.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">Genel İade Şartları</h2>
                <ul>
                    <li>İade etmek istediğiniz ürünleri, teslim aldığınız tarihten itibaren <strong>14 gün</strong> içinde iade edebilirsiniz.</li>
                    <li>Ürünün kullanılmamış, etiketlerinin çıkarılmamış, orijinal ambalajının hasar görmemiş ve tekrar satılabilir durumda olması gerekmektedir.</li>
                    <li>Hijyenik nedenlerden dolayı iç giyim, mayo, kozmetik gibi ürünlerin iadesi kabul edilmemektedir (ambalajı açılmamış ve kullanılmamış olması hariç).</li>
                    <li>Elektronik ürünlerde, ürünün kutusunun açılması durumunda servis raporu olmadan iade kabul edilmeyebilir.</li>
                    <li>Faturası olmayan ürünlerin iadesi kabul edilmemektedir.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">İade Süreci</h2>
                <ol>
                    <li>Hesabım &gt; Siparişlerim bölümünden iade etmek istediğiniz siparişi ve ürünü seçerek iade talebi oluşturun.</li>
                    <li>İade talebiniz onaylandıktan sonra size iletilecek olan iade kargo kodu ile ürünü anlaşmalı kargo firmamıza ücretsiz olarak gönderin.</li>
                    <li>Ürün tarafımıza ulaştıktan sonra iade koşullarına uygunluğu kontrol edilir.</li>
                    <li>İade koşullarına uygun bulunan ürünler için, ödeme yönteminize bağlı olarak 7-10 iş günü içinde para iadesi gerçekleştirilir.</li>
                </ol>

                <h2 className="text-2xl font-semibold mt-8 mb-4">Kusurlu veya Yanlış Ürün İadesi</h2>
                <p>
                    Teslim aldığınız ürün kusurlu veya siparişinizden farklı ise, durumu teslimattan itibaren en geç 3 gün içinde müşteri hizmetlerimize bildirmeniz gerekmektedir.
                    Bu durumda, iade veya değişim işlemleri için size yardımcı olunacaktır ve kargo ücreti tarafımızdan karşılanacaktır.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">İletişim</h2>
                <p>
                    İade süreci ile ilgili her türlü sorunuz için <a href="/iletisim">iletişim sayfamızdan</a> veya destek@hdticaret.com e-posta adresinden bize ulaşabilirsiniz.
                </p>
            </div>
        </div>
    );
} 