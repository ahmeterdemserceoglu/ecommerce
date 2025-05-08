"use client"

import type React from "react"

import { useState } from "react"
import { Upload, X } from "lucide-react"
import Image from "next/image"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database.types"
import { Button } from "./button"
import { Progress } from "./progress"

interface ImageUploadProps {
  onUploadComplete: (url: string) => void
  onUploadError: (error: string) => void
  maxSize?: number // in MB
  acceptedTypes?: string[]
  className?: string
}

export function ImageUpload({
  onUploadComplete,
  onUploadError,
  maxSize = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      onUploadError("Desteklenmeyen dosya formatı. Lütfen JPEG, PNG veya WebP formatında bir resim yükleyin.")
      return
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      onUploadError(`Dosya boyutu çok büyük. Maksimum ${maxSize}MB yükleyebilirsiniz.`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    try {
      setUploading(true)
      setProgress(0)

      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `products/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage.from("images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath)

      onUploadComplete(publicUrl)
      setProgress(100)
    } catch (error) {
      console.error("Upload error:", error)
      onUploadError("Resim yüklenirken bir hata oluştu. Lütfen tekrar deneyin.")
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUploadComplete("")
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative aspect-square w-full max-w-md mx-auto">
        {preview ? (
          <div className="relative w-full h-full">
            <Image src={preview} alt="Preview" fill className="object-cover rounded-lg" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label
            htmlFor="image-upload"
            className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Resim yüklemek için tıklayın</span>
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG veya WebP (max. {maxSize}MB)</p>
            </div>
            <input
              id="image-upload"
              type="file"
              className="hidden"
              accept={acceptedTypes.join(",")}
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-center text-muted-foreground">Yükleniyor... {progress}%</p>
        </div>
      )}
    </div>
  )
}
