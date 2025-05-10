"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase' // Assuming you have a supabase client instance
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from '@/hooks/use-toast'
import { Loader2, MessageSquare, CornerDownRight } from 'lucide-react'
import Link from 'next/link'
import SellerSidebar from '@/components/seller/seller-sidebar' // Assuming you have this

interface Answer {
    id: string;
    answer_text: string;
    created_at: string;
    user: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
}

interface Question {
    id: string;
    question_text: string;
    created_at: string;
    is_answered: boolean;
    product_id: string;
    user: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
    product: { id: string; name: string; slug: string; image_url?: string | null } | null;
    answers: Answer[];
}

export default function SellerQuestionsPage() {
    const { user, loading: authLoading } = useAuth()
    const { toast } = useToast()
    const [questions, setQuestions] = useState<Question[]>([])
    const [loading, setLoading] = useState(true)
    const [storeIds, setStoreIds] = useState<string[]>([])
    const [answerText, setAnswerText] = useState<Record<string, string>>({}) // {[questionId]: text}
    const [submittingAnswer, setSubmittingAnswer] = useState<Record<string, boolean>>({})

    const fetchStoreIds = useCallback(async () => {
        if (!user) return []
        try {
            const { data, error } = await supabase
                .from('stores')
                .select('id')
                .eq('user_id', user.id)
            if (error) throw error
            const ids = data?.map(s => s.id) || []
            setStoreIds(ids)
            return ids
        } catch (error) {
            console.error("Error fetching store IDs:", error)
            toast({ title: "Hata", description: "Mağaza bilgileriniz alınamadı.", variant: "destructive" })
            return []
        }
    }, [user, toast])

    const fetchQuestions = useCallback(async (currentStoreIds: string[]) => {
        if (currentStoreIds.length === 0) {
            setQuestions([]);
            setLoading(false);
            return;
        }
        setLoading(true)
        try {
            // Fetch products for these stores first
            const { data: productsInStore, error: productsError } = await supabase
                .from('products')
                .select('id')
                .in('store_id', currentStoreIds)

            if (productsError) throw productsError
            if (!productsInStore || productsInStore.length === 0) {
                setQuestions([])
                setLoading(false)
                return
            }

            const productIds = productsInStore.map(p => p.id)

            const { data, error } = await supabase
                .from('product_questions')
                .select(`
          id,
          question_text,
          created_at,
          is_answered,
          product_id,
          user:profiles!user_id (id, full_name, avatar_url),
          product:products!product_id (id, name, slug, image_url),
          answers:product_answers (id, answer_text, created_at, user:profiles!user_id(id, full_name, avatar_url))
        `)
                .in('product_id', productIds)
                // .eq('is_approved', true) // Or handle unapproved questions for sellers to see
                .order('created_at', { ascending: false })
                .order('created_at', { foreignTable: 'product_answers', ascending: true })

            if (error) throw error
            setQuestions(data || [])
        } catch (error: any) {
            console.error("Error fetching questions for seller:", error)
            toast({ title: "Hata", description: "Sorular yüklenirken bir hata oluştu: " + error.message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => {
        if (!authLoading && user) {
            fetchStoreIds().then(ids => {
                if (ids.length > 0) {
                    fetchQuestions(ids)
                }
            })
        }
    }, [user, authLoading, fetchStoreIds, fetchQuestions])

    const handleAnswerChange = (questionId: string, text: string) => {
        setAnswerText(prev => ({ ...prev, [questionId]: text }))
    }

    const handleAnswerSubmit = async (questionId: string) => {
        const text = answerText[questionId]?.trim()
        if (!text || text.length < 5) {
            toast({ title: "Hata", description: "Cevap en az 5 karakter olmalıdır.", variant: "destructive" })
            return
        }
        setSubmittingAnswer(prev => ({ ...prev, [questionId]: true }))
        try {
            const response = await fetch(`/api/questions/${questionId}/answers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answer_text: text }),
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Cevap gönderilemedi.")
            }
            const newAnswer = await response.json()
            setQuestions(prevQs => prevQs.map(q =>
                q.id === questionId
                    ? { ...q, is_answered: true, answers: [...q.answers, newAnswer] }
                    : q
            ))
            setAnswerText(prev => ({ ...prev, [questionId]: "" })) // Clear textarea
            toast({ title: "Başarılı", description: "Cevabınız gönderildi." })
        } catch (error: any) {
            toast({ title: "Hata", description: error.message, variant: "destructive" })
        } finally {
            setSubmittingAnswer(prev => ({ ...prev, [questionId]: false }))
        }
    }

    if (authLoading || (loading && questions.length === 0 && storeIds.length === 0)) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    if (!user) {
        return <div className="p-8 text-center">Giriş yapmanız gerekiyor. <Link href="/auth/login?returnTo=/seller/questions" className="text-indigo-600 hover:underline">Giriş Yap</Link></div>
    }

    const unansweredQuestions = questions.filter(q => !q.is_answered);
    const answeredQuestions = questions.filter(q => q.is_answered);

    return (
        <div className="flex min-h-screen bg-gray-100">
            <SellerSidebar />
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-2xl">Ürün Soruları</CardTitle>
                        <CardDescription>
                            Müşterilerinizin ürünleriniz hakkında sorduğu soruları burada görüntüleyebilir ve cevaplayabilirsiniz.
                        </CardDescription>
                    </CardHeader>
                </Card>

                {loading && questions.length === 0 && <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" /> Yükleniyor...</div>}
                {!loading && questions.length === 0 && storeIds.length > 0 && (
                    <Card className="text-center py-12">
                        <CardContent>
                            <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-semibold">Henüz Soru Yok</h3>
                            <p className="text-gray-500">Mağazanızdaki ürünler için henüz soru sorulmamış.</p>
                        </CardContent>
                    </Card>
                )}
                {!loading && storeIds.length === 0 && !authLoading && user && (
                    <Card className="text-center py-12">
                        <CardContent>
                            <h3 className="text-xl font-semibold">Mağaza Bulunamadı</h3>
                            <p className="text-gray-500">Bu kullanıcıya atanmış bir mağaza bulunamadı. Lütfen bir mağaza oluşturun veya yöneticinizle iletişime geçin.</p>
                            <Button asChild className="mt-4"><Link href="/seller/stores/new">Mağaza Oluştur</Link></Button>
                        </CardContent>
                    </Card>
                )}

                {(unansweredQuestions.length > 0 || answeredQuestions.length > 0) && (
                    <div className="space-y-6">
                        {unansweredQuestions.length > 0 && (
                            <section>
                                <h2 className="text-xl font-semibold mb-4 text-orange-600">Cevaplanmamış Sorular ({unansweredQuestions.length})</h2>
                                {unansweredQuestions.map(q => (
                                    <QuestionItem key={q.id} question={q} answerText={answerText[q.id] || ''} onAnswerChange={handleAnswerChange} onAnswerSubmit={handleAnswerSubmit} submitting={submittingAnswer[q.id]} />
                                ))}
                            </section>
                        )}
                        {answeredQuestions.length > 0 && (
                            <section className="mt-10">
                                <h2 className="text-xl font-semibold mb-4 text-green-600">Cevaplanmış Sorular ({answeredQuestions.length})</h2>
                                {answeredQuestions.map(q => (
                                    <QuestionItem key={q.id} question={q} answerText={answerText[q.id] || ''} onAnswerChange={handleAnswerChange} onAnswerSubmit={handleAnswerSubmit} submitting={submittingAnswer[q.id]} />
                                ))}
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

interface QuestionItemProps {
    question: Question;
    answerText: string;
    onAnswerChange: (questionId: string, text: string) => void;
    onAnswerSubmit: (questionId: string) => void;
    submitting?: boolean;
}

function QuestionItem({ question, answerText, onAnswerChange, onAnswerSubmit, submitting }: QuestionItemProps) {
    const [showAnswerForm, setShowAnswerForm] = useState(false);

    return (
        <Card key={question.id} className="mb-4 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
                <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src={question.user?.avatar_url || undefined} alt={question.user?.full_name || 'Soran'} />
                        <AvatarFallback>{question.user?.full_name?.charAt(0)?.toUpperCase() || 'S'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">{question.user?.full_name || "Bir Kullanıcı"}</span> sordu (Ürün: <Link href={`/urun/${question.product?.slug}`} target="_blank" className="text-indigo-600 hover:underline">{question.product?.name || "Bilinmeyen Ürün"}</Link>)
                        </p>
                        <p className="text-xs text-gray-400 mb-1">
                            {new Date(question.created_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        <p className="text-gray-800 font-medium mb-3 whitespace-pre-wrap">{question.question_text}</p>
                    </div>
                </div>

                {question.answers && question.answers.length > 0 && (
                    <div className="mt-3 space-y-3">
                        {question.answers.map(ans => (
                            <div key={ans.id} className="ml-8 md:ml-12 pl-3 border-l-2 border-green-500 bg-green-50 p-3 rounded-r-md">
                                <div className="flex items-start space-x-3">
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarImage src={ans.user?.avatar_url || undefined} alt={ans.user?.full_name || 'Cevaplayan'} />
                                        <AvatarFallback>{ans.user?.full_name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">{ans.user?.full_name || "Satıcı"}</span> cevapladı:
                                        </p>
                                        <p className="text-xs text-gray-400 mb-1">
                                            {new Date(ans.created_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                        <p className="text-gray-700 whitespace-pre-wrap">{ans.answer_text}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!question.is_answered && (
                    <div className="mt-4 ml-8 md:ml-12">
                        {!showAnswerForm ? (
                            <Button variant="outline" size="sm" onClick={() => setShowAnswerForm(true)} className="text-indigo-600 border-indigo-300 hover:bg-indigo-50">
                                <CornerDownRight className="mr-2 h-4 w-4" /> Cevapla
                            </Button>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); onAnswerSubmit(question.id); }} className="space-y-2">
                                <Textarea
                                    value={answerText}
                                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                                    placeholder="Cevabınızı yazın..."
                                    rows={3}
                                    required
                                    disabled={submitting}
                                    className="bg-white"
                                />
                                <div className="flex justify-end space-x-2">
                                    <Button type="button" variant="ghost" onClick={() => setShowAnswerForm(false)} disabled={submitting}>İptal</Button>
                                    <Button type="submit" disabled={submitting || (answerText?.length || 0) < 5}>
                                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Cevabı Gönder
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
} 