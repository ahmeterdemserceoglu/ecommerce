import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export interface Address {
  id: string
  user_id: string
  title: string
  full_name: string
  address: string
  city: string
  district?: string
  postal_code?: string
  country: string
  phone?: string
  is_default: boolean
  address_type: "shipping" | "billing" | "both"
  created_at: string
  updated_at: string
}

export async function getUserAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching addresses:", error)
    throw new Error(error.message)
  }

  return data || []
}

export async function getAddressById(id: string, userId: string): Promise<Address | null> {
  const { data, error } = await supabase.from("user_addresses").select("*").eq("id", id).eq("user_id", userId).single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    console.error("Error fetching address:", error)
    throw new Error(error.message)
  }

  return data
}

export async function createAddress(address: Omit<Address, "id" | "created_at" | "updated_at">): Promise<Address> {
  // Eğer bu ilk adres ise, varsayılan olarak ayarla
  if (address.is_default === undefined) {
    const { count, error: countError } = await supabase
      .from("user_addresses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", address.user_id)
      .eq("address_type", address.address_type)

    if (!countError && count === 0) {
      address.is_default = true
    }
  }

  const { data, error } = await supabase.from("user_addresses").insert(address).select().single()

  if (error) {
    console.error("Error creating address:", error)
    throw new Error(error.message)
  }

  return data
}

export async function updateAddress(
  id: string,
  userId: string,
  address: Partial<Omit<Address, "id" | "user_id" | "created_at" | "updated_at">>,
): Promise<Address> {
  const { data, error } = await supabase
    .from("user_addresses")
    .update(address)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    console.error("Error updating address:", error)
    throw new Error(error.message)
  }

  return data
}

export async function deleteAddress(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from("user_addresses").delete().eq("id", id).eq("user_id", userId)

  if (error) {
    console.error("Error deleting address:", error)
    throw new Error(error.message)
  }
}

export async function getDefaultAddress(
  userId: string,
  type: "shipping" | "billing" | "both" = "shipping",
): Promise<Address | null> {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .in("address_type", [type, "both"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    console.error("Error fetching default address:", error)
    throw new Error(error.message)
  }

  return data
}
