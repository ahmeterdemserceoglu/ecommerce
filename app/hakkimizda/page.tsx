import React from 'react';

export default function AboutUsPage() {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-6">Hakkımızda</h1>
            <div className="prose lg:prose-xl max-w-none">
                <p>
                    HDTicaret, Türkiye'nin en kapsamlı e-ticaret pazaryeri platformudur.
                    Binlerce satıcı ve milyonlarca ürünü bir araya getirerek kullanıcılara benzersiz bir alışveriş deneyimi sunmayı hedefler.
                </p>
                <h2 className="text-2xl font-semibold mt-8 mb-4">Misyonumuz</h2>
                <p>
                    Müşterilerimize geniş ürün yelpazesi, uygun fiyatlar ve güvenli alışveriş imkanı sunarak online alışverişi keyifli hale getirmek.
                    Satıcılarımıza ise ürünlerini milyonlarca potansiyel müşteriye ulaştırabilecekleri, kullanımı kolay ve adil bir platform sağlamak.
                </p>
                <h2 className="text-2xl font-semibold mt-8 mb-4">Vizyonumuz</h2>
                <p>
                    Türkiye'de e-ticaretin lideri olmak ve hem müşteriler hem de satıcılar için en çok tercih edilen pazaryeri platformu haline gelmek.
                    Teknolojik yenilikleri takip ederek ve kullanıcı geri bildirimlerini dikkate alarak sürekli gelişmek ve hizmet kalitemizi artırmak.
                </p>
                <h2 className="text-2xl font-semibold mt-8 mb-4">Değerlerimiz</h2>
                <ul>
                    <li>Müşteri Odaklılık</li>
                    <li>Güvenilirlik</li>
                    <li>Şeffaflık</li>
                    <li>Yenilikçilik</li>
                    <li>Takım Çalışması</li>
                </ul>
            </div>
        </div>
    );
} 