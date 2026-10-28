import { connection } from "next/server"

import { listarMunicipios } from "@/lib/buscador"

export async function GET() {
  // Executa a cada requisição: sem isso o Next tentaria rodar o script durante o build.
  await connection()
  try {
    return Response.json({ municipios: await listarMunicipios() })
  } catch (falha) {
    const erro = falha instanceof Error ? falha.message : String(falha)
    return Response.json({ erro }, { status: 502 })
  }
}
