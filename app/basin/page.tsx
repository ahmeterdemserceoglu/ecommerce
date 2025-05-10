import React from 'react';
import Link from 'next/link';

export default function PressPage() {
    const pressReleases = [
        {
            id: 1,
            title: "HDTicaret Yeni Mobil Uygulamasını Duyurdu",
            date: "15 Mayıs 2024",
            summary: "HDTicaret, kullanıcı deneyimini iyileştirmek ve mobil alışverişi kolaylaştırmak amacıyla yeni mobil uygulamasını yayınladı...",
            link: "/basin/hdticaret-yeni-mobil-uygulamasi"
        },
        {
            id: 2,
            title: "HDTicaret'ten KOBİ'lere Özel Destek Paketi",
            date: "22 Nisan 2024",
            summary: "Platformumuzda yer alan KOBİ'leri desteklemek amacıyla yeni bir finansman ve eğitim paketi açıklandı...",
            link: "/basin/kobilere-ozel-destek-paketi"
        },
        {
            id: 3,
            title: "HDTicaret Yılın E-Ticaret Platformu Seçildi",
            date: "10 Mart 2024",
            summary: "Bağımsız bir kuruluş tarafından yapılan değerlendirmede HDTicaret, kullanıcı memnuniyeti ve yenilikçilik alanlarında öne çıkarak yılın e-ticaret platformu ödülünü kazandı...",
            link: "/basin/yilin-e-ticaret-platformu"
        }
    ];

    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 text-center">Basın Odası</h1>
            <div className="max-w-3xl mx-auto space-y-6">
                {pressReleases.map((release) => (
                    <div key={release.id} className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-2 text-primary">
                            <Link href={release.link} legacyBehavior>
                                <a className="hover:underline">{release.title}</a>
                            </Link>
                        </h2>
                        <p className="text-sm text-gray-500 mb-3">{release.date}</p>
                        <p className="text-gray-700 leading-relaxed">
                            {release.summary}
                        </p>
                        <div className="mt-4">
                            <Link href={release.link} legacyBehavior>
                                <a className="text-primary hover:text-primary-dark font-medium">Devamını Oku &rarr;</a>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-12 text-center">
                <h2 className="text-2xl font-semibold mb-4">Medya İletişim</h2>
                <p className="text-gray-700">Basın ve medya ile ilgili tüm sorularınız için:</p>
                <p className="text-lg font-medium text-primary mt-2">basin@hdticaret.com</p>
            </div>
        </div>
    );
} 