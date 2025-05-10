import React from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function CareerPage() {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-6">Kariyer</h1>
            <div className="prose lg:prose-xl max-w-none">
                <p>
                    HDTicaret'te bir kariyere başlayarak Türkiye'nin en dinamik e-ticaret platformlarından birinin parçası olun.
                    Yenilikçi, dinamik ve hızla büyüyen bir ortamda çalışma fırsatı sunuyoruz.
                </p>
                <h2 className="text-2xl font-semibold mt-8 mb-4">Neden HDTicaret?</h2>
                <ul>
                    <li><strong>Gelişim Fırsatları:</strong> Sürekli öğrenme ve kendini geliştirme imkanları.</li>
                    <li><strong>Dinamik Çalışma Ortamı:</strong> Hızlı tempolu ve motive edici bir atmosfer.</li>
                    <li><strong>Etki Yaratma:</strong> Yaptığınız işlerle milyonlarca kullanıcının hayatına dokunma şansı.</li>
                    <li><strong>Harika Bir Ekip:</strong> Alanında uzman, tutkulu ve destekleyici çalışma arkadaşları.</li>
                </ul>
                <h2 className="text-2xl font-semibold mt-8 mb-4">Açık Pozisyonlar</h2>
                <p>
                    Şu anda aktif bir açık pozisyonumuz bulunmamaktadır. Ancak, gelecekteki fırsatlar için genel başvuruda bulunabilirsiniz.
                    CV'nizi ik@hdticaret.com adresine gönderebilirsiniz.
                </p>
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="border p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Yazılım Geliştirme Uzmanı</h3>
            <p className="text-gray-600 mb-1">Lokasyon: İstanbul</p>
            <p className="text-gray-600 mb-3">Departman: Teknoloji</p>
            <Button asChild>
              <Link href="/kariyer/yazilim-gelistirme-uzmani">Detaylar ve Başvuru</Link>
            </Button>
          </div>
          <div className="border p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Pazarlama Uzmanı</h3>
            <p className="text-gray-600 mb-1">Lokasyon: Ankara</p>
            <p className="text-gray-600 mb-3">Departman: Pazarlama</p>
            <Button asChild>
              <Link href="/kariyer/pazarlama-uzmani">Detaylar ve Başvuru</Link>
            </Button>
          </div>
        </div> */}
                <div className="mt-8">
                    <Button size="lg" asChild>
                        <Link href="mailto:ik@hdticaret.com">Genel Başvuru Yap</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
} 