"use client"
import { useState } from "react"
import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function RegisterForm() {
  const { signUp, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password || !fullName) {
      setError("Tüm alanlar zorunlu.")
      return
    }
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.")
      return
    }
    const result = await signUp(email, password, fullName)
    if (!result.success) setError(result.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-2">Kayıt Ol</h2>
      <Input
        type="text"
        placeholder="Ad Soyad"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input
        type="password"
        placeholder="Şifre (en az 8 karakter)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <div className="text-red-500">{error}</div>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Kayıt Olunuyor..." : "Kayıt Ol"}
      </Button>
    </form>
  )
}
