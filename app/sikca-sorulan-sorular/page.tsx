import React from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
    {
        question: "Nasıl sipariş verebilirim?",
        answer: "Beğendiğiniz ürünleri sepetinize ekleyip, teslimat ve ödeme bilgilerinizi girdikten sonra siparişinizi tamamlayabilirsiniz.",
    },
    {
        question: "Siparişim ne zaman kargoya verilir?",
        answer: "Siparişleriniz genellikle 1-3 iş günü içerisinde kargoya verilir. Kargoya verildiğinde size bilgilendirme e-postası ve SMS gönderilecektir.",
    },
    {
        question: "Kargo ücreti ne kadar?",
        answer: "250 TL ve üzeri alışverişlerinizde kargo ücretsizdir. Bu tutarın altındaki siparişler için standart kargo ücreti uygulanır.",
    },
    {
        question: "İade ve değişim şartları nelerdir?",
        answer: "Kullanılmamış ve orijinal ambalajı bozulmamış ürünlerinizi, teslim tarihinden itibaren 14 gün içinde iade edebilir veya değiştirebilirsiniz. Detaylı bilgi için İade Koşulları sayfamızı ziyaret edebilirsiniz.",
    },
    {
        question: "Ödeme seçenekleri nelerdir?",
        answer: "Kredi kartı, banka kartı ve havale/EFT gibi çeşitli ödeme yöntemlerini kullanabilirsiniz.",
    },
    {
        question: "Kapıda ödeme seçeneği var mı?",
        answer: "Şu anda kapıda ödeme seçeneğimiz bulunmamaktadır.",
    },
    {
        question: "Ürünüm hasarlı geldi, ne yapmalıyım?",
        answer: "Kargonuzu teslim alırken kargo görevlisinin yanında kontrol etmenizi ve hasar durumunda tutanak tutturmanızı rica ederiz. Ardından müşteri hizmetlerimizle iletişime geçebilirsiniz.",
    },
];

export default function FaqPage() {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 text-center">Sıkça Sorulan Sorular</h1>
            <div className="max-w-3xl mx-auto">
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem value={`item-${index}`} key={index}>
                            <AccordionTrigger className="text-left hover:no-underline">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {faq.answer}
                                </p>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </div>
    );
} 