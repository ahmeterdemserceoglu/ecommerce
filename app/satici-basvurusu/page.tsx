'use client'

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';

export default function SellerApplicationPage() {
    // Basic form state, in a real app you'd use react-hook-form or similar
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission logic, e.g., send data to an API
        alert("Başvurunuz alınmıştır. En kısa sürede sizinle iletişime geçilecektir.");
    };

    return (
        <div className="container mx-auto py-12 px-4">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Satıcı Başvuru Formu</CardTitle>
                    <CardDescription className="text-center">
                        HDTicaret'te satıcı olmak ve ürünlerinizi milyonlara ulaştırmak için ilk adımı atın!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="storeName">Mağaza Adı</Label>
                            <Input id="storeName" placeholder="Mağazanızın adı" required />
                        </div>
                        <div>
                            <Label htmlFor="fullName">Yetkili Adı Soyadı</Label>
                            <Input id="fullName" placeholder="Adınız ve Soyadınız" required />
                        </div>
                        <div>
                            <Label htmlFor="email">E-posta Adresi</Label>
                            <Input id="email" type="email" placeholder="iletisim@orneksirket.com" required />
                        </div>
                        <div>
                            <Label htmlFor="phone">Telefon Numarası</Label>
                            <Input id="phone" type="tel" placeholder="05xxxxxxxxx" required />
                        </div>
                        <div>
                            <Label htmlFor="companyType">Firma Türü</Label>
                            <select id="companyType" className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" required>
                                <option value="">Seçiniz...</option>
                                <option value="sahis">Şahıs Şirketi</option>
                                <option value="limited">Limited Şirket</option>
                                <option value="anonim">Anonim Şirket</option>
                                <option value="diger">Diğer</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="taxId">Vergi Numarası / TC Kimlik Numarası</Label>
                            <Input id="taxId" placeholder="Vergi veya TC Kimlik Numaranız" required />
                        </div>
                        <div>
                            <Label htmlFor="category">Satış Yapılacak Ana Kategori</Label>
                            <Input id="category" placeholder="Örn: Elektronik, Moda, Ev Yaşam" required />
                        </div>
                        <div>
                            <Label htmlFor="about">Mağazanız ve Ürünleriniz Hakkında Kısa Bilgi</Label>
                            <Textarea id="about" placeholder="Kısaca mağazanızdan ve satmayı planladığınız ürünlerden bahsedin." rows={4} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="terms" required />
                            <Label htmlFor="terms" className="text-sm font-normal">
                                <Link href="/satici-sozlesmesi" className="underline hover:text-primary" target="_blank">Satıcı Sözleşmesi</Link>'ni okudum ve kabul ediyorum.
                            </Label>
                        </div>
                        <Button type="submit" className="w-full">Başvuruyu Gönder</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
} 