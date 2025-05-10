'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string, details?: any, code?: string, hint?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service or console
        console.error("Admin Dashboard Page Error (caught by error.tsx):", {
            message: error.message,
            digest: error.digest,
            details: error.details,
            code: error.code,
            hint: error.hint,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        });
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">Oops! Bir Hata Oluştu</h2>
            <p className="text-gray-600 mb-1">Admin paneli verileri yüklenirken beklenmedik bir sorunla karşılaşıldı.</p>
            <p className="text-sm text-gray-500 mb-6">Hata mesajı: {error.message || "Bilinmeyen hata."}</p>

            {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 p-4 rounded-md text-left w-full max-w-2xl mb-4 overflow-auto">
                    <h3 className="font-semibold text-red-800 mb-2">Teknik Detaylar:</h3>
                    {error.code && <p className="text-xs"><strong className="text-red-700">Kod:</strong> {error.code}</p>}
                    {error.details && <p className="text-xs"><strong className="text-red-700">Detaylar:</strong> {String(error.details)}</p>}
                    {error.hint && <p className="text-xs"><strong className="text-red-700">İpucu:</strong> {error.hint}</p>}
                    {error.digest && <p className="text-xs"><strong className="text-red-700">Digest:</strong> {error.digest}</p>}
                    {error.stack && <pre className="text-xs mt-2 whitespace-pre-wrap break-all">{error.stack}</pre>}
                </div>
            )}

            <Button
                onClick={() => reset()}
                className="bg-orange-500 hover:bg-orange-600 text-white"
            >
                Sayfayı Yeniden Yüklemeyi Dene
            </Button>
        </div>
    )
} 