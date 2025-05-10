import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 text-center">İletişim</h1>
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Bize Ulaşın</h2>
                    <form action="#" method="POST" className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Adınız Soyadınız</label>
                            <input type="text" name="name" id="name" autoComplete="name" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-posta Adresiniz</label>
                            <input type="email" name="email" id="email" autoComplete="email" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Konu</label>
                            <input type="text" name="subject" id="subject" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700">Mesajınız</label>
                            <textarea id="message" name="message" rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"></textarea>
                        </div>
                        <div>
                            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                                Gönder
                            </button>
                        </div>
                    </form>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">İletişim Bilgileri</h2>
                    <div className="space-y-4">
                        <div className="flex items-start">
                            <MapPin className="h-6 w-6 text-primary mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="font-medium">Adres</h3>
                                <p className="text-gray-600">HDTicaret A.Ş.</p>
                                <p className="text-gray-600">Teknoloji Vadisi, No:123</p>
                                <p className="text-gray-600">İstanbul, Türkiye</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <Phone className="h-6 w-6 text-primary mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="font-medium">Telefon</h3>
                                <p className="text-gray-600">+90 212 123 45 67</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <Mail className="h-6 w-6 text-primary mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="font-medium">E-posta</h3>
                                <p className="text-gray-600">destek@hdticaret.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 