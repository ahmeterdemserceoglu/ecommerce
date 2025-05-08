// Mevcut içeriğe ekleyin
export const createRecentProductsTable = async (supabase: any) => {
  try {
    // Check if the function exists
    const { data: functionExists, error: functionError } = await supabase.rpc("check_function_exists", {
      function_name: "create_recent_products_table",
    })

    if (functionError || !functionExists || !functionExists.exists) {
      // Create the function from SQL file
      const createRecentProductsTableSQL = await import("./create-recent-products-table.sql").then((mod) => mod.default)

      const { error } = await supabase.rpc("run_sql", { sql: createRecentProductsTableSQL })

      if (error) {
        console.error("Error creating create_recent_products_table function:", error)
        return false
      }
    }

    // Run the function to create the table
    const { error } = await supabase.rpc("create_recent_products_table")

    if (error) {
      console.error("Error creating recent_products table:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in createRecentProductsTable:", error)
    return false
  }
}
