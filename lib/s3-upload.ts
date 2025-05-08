import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3 = new S3Client({
  region: process.env.SUPABASE_STORAGE_REGION,
  endpoint: process.env.SUPABASE_STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
    secretAccessKey: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!, // Supabase S3 endpoint için ikisi de aynı kullanılabilir
  },
  forcePathStyle: true,
})

export async function uploadToSupabaseS3(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.SUPABASE_STORAGE_BUCKET,
    Key: `products/${fileName}`,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: "public-read",
  })
  await s3.send(command)
  // Public URL'yi döndür
  return `${process.env.SUPABASE_STORAGE_PUBLIC_URL_PREFIX}products/${fileName}`
}
