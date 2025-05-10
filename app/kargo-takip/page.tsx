'use client'

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search } from 'lucide-react';

export default function OrderTrackingPage() {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingResult, setTrackingResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleTrackOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber.trim()) {
            setTrackingResult("Lütfen geçerli bir kargo takip numarası girin.");
            return;
        }
        setIsLoading(true);
        setTrackingResult(null);
        // Simulating API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Replace with actual API call to your backend or a third-party service
        // For demonstration, we'll show a mock result based on the input
        if (trackingNumber === "HD123456789TR") {
            setTrackingResult(`Kargo Durumu (HD123456789TR): Siparişiniz yola çıktı. Tahmini teslimat: 3 gün içinde.`);
        } else if (trackingNumber === "HD987654321TR") {
            setTrackingResult(`Kargo Durumu (HD987654321TR): Siparişiniz dağıtıma çıkarıldı. Bugün teslim edilmesi bekleniyor.`);
        } else {
            setTrackingResult(`Kargo takip numarası (${trackingNumber}) bulunamadı veya geçersiz.`);
        }
        setIsLoading(false);
    };

    return (
        <div className="container mx-auto py-12 px-4">
            <Card className="max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Kargo Takip</CardTitle>
                    <CardDescription className="text-center">
                        Siparişinize ait kargo takip numarasını girerek gönderinizin durumunu sorgulayabilirsiniz.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleTrackOrder} className="space-y-4">
                        <div className="flex space-x-2">
                            <Input
                                type="text"
                                placeholder="Kargo Takip Numaranız (örn: HD123456789TR)"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="flex-grow"
                            />
                            <Button type="submit" disabled={isLoading || !trackingNumber.trim()}>
                                {isLoading ? (
                                    <span className="loader ease-linear rounded-full border-2 border-t-2 border-gray-200 h-4 w-4 mr-2"></span>
                                ) : (
                                    <Search className="h-4 w-4 mr-2" />
                                )}
                                Sorgula
                            </Button>
                        </div>
                    </form>
                    {trackingResult && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <h3 className="text-lg font-semibold mb-2">Sorgu Sonucu:</h3>
                            <p className="text-gray-700 dark:text-gray-300">{trackingResult}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 