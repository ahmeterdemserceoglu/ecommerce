export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price: number
          discount_price: number | null
          stock_quantity: number
          category_id: string
          store_id: string
          is_active: boolean
          is_featured: boolean
          has_variants: boolean
          created_at: string
          image_url: string | null
          is_approved: boolean | null
          reject_reason: string | null
          approved_at: string | null
          approved_by: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          price: number
          discount_price?: number | null
          stock_quantity: number
          category_id: string
          store_id: string
          is_active?: boolean
          is_featured?: boolean
          has_variants?: boolean
          created_at?: string
          image_url?: string | null
          is_approved?: boolean | null
          reject_reason?: string | null
          approved_at?: string | null
          approved_by?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          price?: number
          discount_price?: number | null
          stock_quantity?: number
          category_id?: string
          store_id?: string
          is_active?: boolean
          is_featured?: boolean
          has_variants?: boolean
          created_at?: string
          image_url?: string | null
          is_approved?: boolean | null
          reject_reason?: string | null
          approved_at?: string | null
          approved_by?: string | null
          submitted_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          created_at: string | null
          name: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          name?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          name?: string | null
        }
      }

      Views: {
        [_ in never]: never
      }
      Functions: {
        [_ in never]: never
      }
      Enums: {
        [_ in never]: never
      }
      CompositeTypes: {
        [_ in never]: never
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_product_approval_columns: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
