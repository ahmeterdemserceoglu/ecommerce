import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

// Türkçe karakter desteğiyle slugify
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/Ş/g, "s")
    .replace(/Ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function encodeUrlParam(str: string) {
  if (typeof window === "undefined") {
    return Buffer.from(str, "utf-8").toString("base64url")
  } else {
    // Tarayıcıda
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  }
}

export function decodeUrlParam(str: string) {
  if (typeof window === "undefined") {
    return Buffer.from(str, "base64url").toString("utf-8")
  } else {
    // Tarayıcıda
    str = str.replace(/-/g, "+").replace(/_/g, "/")
    while (str.length % 4) str += "="
    return decodeURIComponent(escape(atob(str)))
  }
}

export function formatDate(dateString: string | Date, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = new Date(dateString);
    // Default options for Turkish locale DD.MM.YYYY format
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };
    return new Intl.DateTimeFormat('tr-TR', { ...defaultOptions, ...options }).format(date);
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return String(dateString); // Fallback to original string on error
  }
}
