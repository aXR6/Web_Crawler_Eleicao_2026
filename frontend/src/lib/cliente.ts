// Chamadas do navegador para a API do Next (que executa o buscador.sh).
import type { Evento, Municipio } from "@/lib/tipos"

export const mensagemDe = (falha: unknown) => (falha instanceof Error ? falha.message : String(falha))

export async function buscarMunicipios(sinal: AbortSignal): Promise<Municipio[]> {
  const resposta = await fetch("/api/municipios", { signal: sinal })
  const corpo = await resposta.json()
  if (!resposta.ok) throw new Error(corpo.erro ?? `HTTP ${resposta.status}`)
  return corpo.municipios
}

/** Lê o NDJSON de /api/resultados e chama aoEvento a cada linha, conforme chega. */
export async function lerResultados(
  municipio: string,
  limite: number,
  atualizar: boolean,
  sinal: AbortSignal,
  aoEvento: (evento: Evento) => void
): Promise<void> {
  const parametros = new URLSearchParams({ municipio, limite: String(limite) })
  if (atualizar) parametros.set("atualizar", "1")
  const resposta = await fetch(`/api/resultados?${parametros}`, { signal: sinal })
  if (!resposta.ok || !resposta.body) {
    const corpo = await resposta.json().catch(() => ({}))
    throw new Error(corpo.erro ?? `HTTP ${resposta.status}`)
  }

  const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader()
  let pendente = ""
  for (;;) {
    const { value, done } = await leitor.read()
    if (done) break
    pendente += value
    let quebra: number
    while ((quebra = pendente.indexOf("\n")) >= 0) {
      const linha = pendente.slice(0, quebra).trim()
      pendente = pendente.slice(quebra + 1)
      if (linha) aoEvento(JSON.parse(linha) as Evento)
    }
  }
}
