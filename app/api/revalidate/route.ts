import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// export const dynamic = 'force-dynamic' // Gerekirse

export async function POST(request: NextRequest) {
    // Güvenlik notu: Gerçek bir uygulamada bu endpoint'i korumak önemlidir.
    // Örneğin, gizli bir token kontrolü veya admin yetkilendirmesi eklenebilir.
    // const secret = request.nextUrl.searchParams.get('secret')
    // if (secret !== process.env.REVALIDATION_SECRET_TOKEN) {
    //   return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    // }

    try {
        // Anasayfanın cache'ini temizle
        revalidatePath('/')
        // İhtiyaç duyulan diğer yolları da burada revalidate edebilirsiniz
        // revalidatePath('/kategori/[slug]', 'layout') // Eğer kategori sayfaları da varsa
        // revalidateTag('products') // Eğer tag bazlı cache kullanıyorsanız

        console.log("Cache revalidated for path: /")
        return NextResponse.json({ revalidated: true, now: Date.now() })
    } catch (err: any) {
        console.error("Error revalidating cache:", err)
        return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 })
    }
}

// GET isteği de eklenebilir, ancak genellikle revalidation POST ile yapılır.
export async function GET(request: NextRequest) {
    // POST ile aynı mantık, test için kullanılabilir.
    try {
        revalidatePath('/')
        console.log("Cache revalidated for path: / via GET")
        return NextResponse.json({ revalidated: true, now: Date.now(), method: "GET" })
    } catch (err: any) {
        console.error("Error revalidating cache via GET:", err)
        return NextResponse.json({ message: 'Error revalidating via GET', error: err.message }, { status: 500 })
    }
} 