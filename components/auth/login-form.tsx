"use client"
import { useState } from "react"
import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LoginForm() {
  const { signIn, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password) {
      setError("E-posta ve şifre zorunlu.")
      return
    }
    const { error } = await signIn(email, password)
    if (error) setError(error)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-2">Giriş Yap</h2>
      <Input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input
        type="password"
        placeholder="Şifre"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <div className="text-red-500">{error}</div>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
      </Button>
      <div className="text-right mt-2">
        <a href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
          Şifremi Unuttum
        </a>
      </div>
    </form>
  )
}
