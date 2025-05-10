import React from 'react';
import { PlayCircle, BookOpen, Users, HelpCircle } from 'lucide-react';
import Link from 'next/link';

const trainingModules = [
    {
        title: "Platforma Giriş ve Mağaza Yönetimi",
        description: "Satıcı panelini kullanmayı, mağaza ayarlarınızı yapmayı ve temel özellikleri öğrenin.",
        icon: PlayCircle,
        type: "Video Serisi",
        duration: "45 dakika",
        link: "/satici-egitimi/modul/platforma-giris"
    },
    {
        title: "Etkili Ürün Listeleme Teknikleri",
        description: "Ürünlerinizi doğru kategorilere ekleme, dikkat çekici başlık ve açıklamalar yazma, kaliteli görseller yükleme.",
        icon: BookOpen,
        type: "Rehber",
        duration: "Okuma süresi: 30 dakika",
        link: "/satici-egitimi/modul/urun-listeleme"
    },
    {
        title: "Sipariş Yönetimi ve Müşteri İletişimi",
        description: "Siparişleri takip etme, kargolama süreçleri, iade yönetimi ve müşteri sorularına etkili cevap verme.",
        icon: Users,
        type: "Webinar Kaydı",
        duration: "60 dakika",
        link: "/satici-egitimi/modul/siparis-yonetimi"
    },
    {
        title: "Pazarlama ve Satış Artırma Stratejileri",
        description: "Kampanyalar oluşturma, indirimleri kullanma, ürünlerinizi öne çıkarma ve satışlarınızı artırma ipuçları.",
        icon: PlayCircle,
        type: "Video Ders",
        duration: "50 dakika",
        link: "/satici-egitimi/modul/pazarlama-stratejileri"
    }
];

export default function SellerTrainingPage() {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-4 text-center">Satıcı Eğitim Merkezi</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 text-center max-w-2xl mx-auto">
                HDTicaret'te başarılı bir satıcı olmak için ihtiyacınız olan tüm bilgilere ve kaynaklara buradan ulaşabilirsiniz.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
                {trainingModules.map((module, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                        <div className="flex items-center mb-4">
                            <module.icon className="h-8 w-8 text-primary mr-3" />
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{module.title}</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm leading-relaxed">{module.description}</p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            <span>Tür: {module.type}</span> | <span>Süre: {module.duration}</span>
                        </div>
                        <Link href={module.link} legacyBehavior>
                            <a className="inline-flex items-center text-primary hover:text-primary-dark font-medium">
                                Eğitime Başla <span aria-hidden="true" className="ml-1">&rarr;</span>
                            </a>
                        </Link>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center bg-gray-100 dark:bg-gray-800 p-8 rounded-lg">
                <HelpCircle className="h-10 w-10 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-3">Daha Fazla Yardıma mı İhtiyacınız Var?</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Satıcı destek ekibimiz her zaman yardıma hazır. Sıkça sorulan sorulara göz atabilir veya doğrudan bizimle iletişime geçebilirsiniz.
                </p>
                <div className="space-x-4">
                    <Link href="/satici-sss" legacyBehavior>
                        <a className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark">Satıcı SSS</a>
                    </Link>
                    <Link href="/satici-destek" legacyBehavior>
                        <a className="px-6 py-2 border border-primary text-base font-medium rounded-md text-primary bg-transparent hover:bg-primary/10">Destek Talebi Oluştur</a>
                    </Link>
                </div>
            </div>
        </div>
    );
} 