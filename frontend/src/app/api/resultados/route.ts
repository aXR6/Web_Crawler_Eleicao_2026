import type { NextRequest } from "next/server"

import { consultarMunicipio } from "@/lib/buscador"

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams
  const municipio = parametros.get("municipio") ?? ""
  const limite = Number(parametros.get("limite") ?? "20")

  if (!/^\d{5}$/.test(municipio)) {
    return Response.json({ erro: "o município deve ser um código TSE de 5 dígitos" }, { status: 400 })
  }
  if (!Number.isInteger(limite) || limite < 1 || limite > 50) {
    return Response.json({ erro: "o limite deve ser um inteiro entre 1 e 50" }, { status: 400 })
  }

  const fluxo = consultarMunicipio(municipio, limite, parametros.has("atualizar"), request.signal)
  return new Response(fluxo, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      // no-transform impede a compressão de segurar as linhas até o fim.
      "Cache-Control": "no-store, no-transform",
    },
  })
}
