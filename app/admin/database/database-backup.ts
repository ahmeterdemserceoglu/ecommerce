import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"

export function useDatabaseBackup(dbStats: any, setDbStats: (stats: any) => void) {
  const [backupProgress, setBackupProgress] = useState(0)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupErrors, setBackupErrors] = useState<string[]>([])
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  // Helper function to safely fetch table data with retries
  const safelyFetchTable = async (table: string, retries = 3): Promise<any[]> => {
    try {
      const { data: existsData, error: existsError } = await supabase
        .rpc("check_table_exists", { table_name: table })
        .single()
      const tableExists = existsData?.exists || false
      if (existsError || !tableExists) return []
      const { data, error } = await supabase.from(table).select("*").limit(10000)
      if (error) throw error
      return data || []
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return safelyFetchTable(table, retries - 1)
      }
      throw error
    }
  }

  async function getTableSchema(table: string) {
    const { data, error } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type, is_nullable, column_default")
      .eq("table_schema", "public")
      .eq("table_name", table)
      .order("ordinal_position", { ascending: true })
    if (error || !data) return ""
    const columns = data
      .map((col: any) => {
        let colDef = `"${col.column_name}" ${col.data_type}`
        if (col.is_nullable === "NO") colDef += " NOT NULL"
        if (col.column_default) colDef += ` DEFAULT ${col.column_default}`
        return colDef
      })
      .join(",\n  ")
    return `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${columns}\n);\n`
  }

  function getInsertStatements(table: string, rows: any[]) {
    if (!rows || rows.length === 0) return ""
    const columns = Object.keys(rows[0])
    const values = rows.map(
      (row) =>
        "(" +
        columns.map((col) => (row[col] === null ? "NULL" : `'${String(row[col]).replace(/'/g, "''")}'`)).join(", ") +
        ")",
    )
    return `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES\n${values.join(",\n")};\n`
  }

  const handleBackupDatabase = async () => {
    setIsBackingUp(true)
    setBackupProgress(0)
    setBackupErrors([])
    try {
      let tables: string[] = []
      try {
        const { data: tableData, error: tableError } = await supabase
          .from("information_schema.tables")
          .select("table_name")
          .eq("table_schema", "public")
          .eq("table_type", "BASE TABLE")
        if (tableError || !tableData) {
          tables = Object.keys(dbStats.rows)
        } else {
          tables = tableData.map((t: any) => t.table_name)
        }
      } catch (error) {
        tables = Object.keys(dbStats.rows)
      }
      const totalTables = tables.length
      const errors: string[] = []
      let sqlDump = ""
      for (let i = 0; i < totalTables; i++) {
        const table = tables[i]
        try {
          const schema = await getTableSchema(table)
          sqlDump += schema + "\n"
          const data = await safelyFetchTable(table)
          sqlDump += getInsertStatements(table, data) + "\n"
        } catch (error: any) {
          errors.push(`${table}: ${error.message || "Unknown error"}`)
        }
        setBackupProgress(Math.round(((i + 1) / totalTables) * 100))
      }
      if (errors.length > 0) {
        setBackupErrors(errors)
        toast({
          title: "Uyarı",
          description: `Bazı tablolar yedeklenemedi (${errors.length}/${totalTables}). Detaylar için hata listesine bakın.`,
          variant: "destructive",
        })
      }
      const blob = new Blob([sqlDump], { type: "text/sql" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `database_backup_${new Date().toISOString().slice(0, 10)}.sql`
      link.click()
      URL.revokeObjectURL(url)
      const now = new Date().toLocaleString("tr-TR")
      localStorage.setItem("lastBackupDate", now)
      setDbStats({ ...dbStats, lastBackup: now })
      if (errors.length === 0) {
        toast({
          title: "Başarılı",
          description: "Veritabanı yedeklemesi başarıyla tamamlandı.",
        })
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: `Veritabanı yedeklenirken bir hata oluştu: ${error.message || "Bilinmeyen hata"}`,
        variant: "destructive",
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  return {
    backupProgress,
    isBackingUp,
    backupErrors,
    handleBackupDatabase,
  }
} 