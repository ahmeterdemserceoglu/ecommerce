'use client'

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HelpCircle, BookOpen, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function SellerSupportPage() {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Destek talebiniz alınmıştır. En kısa sürede size geri dönüş yapılacaktır.");
    };

    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 text-center">Satıcı Destek Merkezi</h1>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
                <Link href="/satici-sss" legacyBehavior>
                    <a className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                        <BookOpen className="h-10 w-10 text-primary mx-auto mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Satıcı SSS</h2>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Sıkça sorulan sorulara göz atın.</p>
                    </a>
                </Link>
                <Link href="/satici-egitimi" legacyBehavior>
                    <a className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                        <HelpCircle className="h-10 w-10 text-primary mx-auto mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Eğitim Kaynakları</h2>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Satışlarınızı artırmak için eğitimlerimize katılın.</p>
                    </a>
                </Link>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
                    <MessageSquare className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Canlı Destek</h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">Mesai saatleri içinde canlı destek alın (Yakında).</p>
                    <Button disabled>Canlı Desteğe Bağlan</Button>
                </div>
            </div>

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Destek Talebi Oluşturun</CardTitle>
                    <CardDescription className="text-center">
                        Sorularınız veya yaşadığınız sorunlar için aşağıdaki formu doldurarak bize ulaşabilirsiniz.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="fullName">Adınız Soyadınız</Label>
                            <Input id="fullName" placeholder="Satıcı Mağaza Yetkilisi" required />
                        </div>
                        <div>
                            <Label htmlFor="storeName">Mağaza Adı</Label>
                            <Input id="storeName" placeholder="Platformdaki Mağaza Adınız" required />
                        </div>
                        <div>
                            <Label htmlFor="email">E-posta Adresi</Label>
                            <Input id="email" type="email" placeholder="iletisim@magazam.com" required />
                        </div>
                        <div>
                            <Label htmlFor="subject">Konu</Label>
                            <Input id="subject" placeholder="Örn: Ürün yükleme sorunu, Ödeme problemi" required />
                        </div>
                        <div>
                            <Label htmlFor="message">Mesajınız</Label>
                            <Textarea id="message" placeholder="Sorununuzu veya talebinizi detaylı bir şekilde açıklayın." rows={5} required />
                        </div>
                        <Button type="submit" className="w-full">Destek Talebini Gönder</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
} 