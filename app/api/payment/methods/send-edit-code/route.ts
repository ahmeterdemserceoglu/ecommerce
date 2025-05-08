import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { randomInt } from "crypto"
import nodemailer from "nodemailer"
import fs from "fs"
import path from "path"

// Nodemailer ile Godaddy SMTP üzerinden HTML e-posta gönder
async function sendEmail(to: string, code: string) {
  const templatePath = path.join(process.cwd(), "email-edit-card-template.html")
  let html = fs.readFileSync(templatePath, "utf8")
  html = html.replace("{{KOD}}", code).replace("{{YIL}}", new Date().getFullYear().toString())

  const transporter = nodemailer.createTransport({
    host: "smtpout.secureserver.net", // Godaddy SMTP
    port: 465,
    secure: true,
    auth: {
      user: "admin@hdticaret.com",
      pass: process.env.GODADDY_SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: "admin@hdticaret.com",
    to,
    subject: "Kart Düzenleme Onay Kodunuz",
    html,
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  try {
    const body = await request.json()
    const { cardId } = body
    if (!cardId) {
      return NextResponse.json({ error: "Eksik kart ID" }, { status: 400 })
    }
    // Kullanıcıyı al
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: "Kullanıcı doğrulanamadı" }, { status: 401 })
    }
    // Kart gerçekten kullanıcıya mı ait?
    const { data: card, error: cardError } = await supabase
      .from("card_tokens")
      .select("id, user_id")
      .eq("id", cardId)
      .single()
    if (cardError || !card) {
      return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 })
    }
    if (card.user_id !== user.id) {
      return NextResponse.json({ error: "Bu karta erişim yetkiniz yok" }, { status: 403 })
    }
    // Kod üret
    const code = randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 dakika geçerli
    // Kod kaydı ekle
    await supabase.from("card_edit_verifications").insert({
      user_id: user.id,
      card_id: cardId,
      code,
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString(),
    })
    // HTML e-posta gönder
    await sendEmail(user.email, code)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 