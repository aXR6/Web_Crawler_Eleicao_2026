// Executa o buscador.sh (o backend) e entrega a saída para as rotas da API.
// Só é importado pelas rotas em src/app/api, ou seja, roda apenas no servidor.
import { spawn, type ChildProcess } from "node:child_process"
import { once } from "node:events"
import path from "node:path"
import readline from "node:readline"

import type { Evento, Municipio } from "@/lib/tipos"

// O Next roda dentro de frontend/; o script fica na raiz do repositório.
const SCRIPT = process.env.BUSCADOR_SH ?? path.resolve(process.cwd(), "..", "buscador.sh")
const TEMPO_MAXIMO_MS = 5 * 60 * 1000
// Os resultados de 2026 já estão totalizados; 10 minutos evita repetir 14 consultas ao TSE.
const VALIDADE_CACHE_MS = 10 * 60 * 1000

let municipiosEmCache: Municipio[] | null = null
const resultadosEmCache = new Map<string, { linhas: string[]; expiraEm: number }>()

function executar(variaveis: Record<string, string>): ChildProcess {
  return spawn("bash", [SCRIPT], {
    env: { ...process.env, TSE_RESULTS_COLOR: "never", ...variaveis },
    stdio: ["ignore", "pipe", "pipe"],
  })
}

/** Última mensagem "Erro: ..." do stderr do script. */
function extrairErro(stderr: string): string | null {
  const linhas = stderr.split("\n").filter((linha) => linha.startsWith("Erro: "))
  return linhas.length ? linhas[linhas.length - 1].slice("Erro: ".length) : null
}

/** Municípios da UF, via TSE_RESULTS_MUNICIPALITY=lista. */
export async function listarMunicipios(): Promise<Municipio[]> {
  if (municipiosEmCache) return municipiosEmCache

  const processo = executar({ TSE_RESULTS_MUNICIPALITY: "lista" })
  let saida = ""
  let erros = ""
  processo.stdout?.setEncoding("utf8").on("data", (parte: string) => (saida += parte))
  processo.stderr?.setEncoding("utf8").on("data", (parte: string) => (erros += parte))
  const [codigo] = (await once(processo, "close")) as [number | null]

  if (codigo !== 0) {
    throw new Error(extrairErro(erros) ?? "não foi possível listar os municípios")
  }
  municipiosEmCache = saida
    .split("\n")
    .filter(Boolean)
    .map((linha) => {
      const [codigoMunicipio, nome] = linha.split("\t")
      return { codigo: codigoMunicipio, nome }
    })
  return municipiosEmCache
}

/**
 * Consulta um município (1º e 2º turno) e devolve um fluxo NDJSON de eventos:
 * um "cargo" para cada linha do script, "aviso" para cada aviso no stderr e um "fim".
 */
export function consultarMunicipio(
  municipio: string,
  limite: number,
  ignorarCache: boolean,
  sinal: AbortSignal
): ReadableStream<Uint8Array> {
  const chave = `${municipio}:${limite}`
  const codificador = new TextEncoder()
  const emCache = resultadosEmCache.get(chave)

  if (!ignorarCache && emCache && emCache.expiraEm > Date.now()) {
    return new ReadableStream({
      start(controle) {
        for (const linha of emCache.linhas) controle.enqueue(codificador.encode(linha))
        controle.close()
      },
    })
  }

  let processo: ChildProcess | undefined
  let encerrado = false

  return new ReadableStream({
    start(controle) {
      const linhas: string[] = []
      let erro: string | null = null
      const enviar = (evento: Evento) => {
        if (encerrado) return
        const linha = `${JSON.stringify(evento)}\n`
        linhas.push(linha)
        controle.enqueue(codificador.encode(linha))
      }

      processo = executar({
        TSE_RESULTS_FORMAT: "json",
        TSE_RESULTS_MUNICIPALITY: municipio,
        TSE_RESULTS_TURN: "ambos",
        TSE_RESULTS_LIMIT: String(limite),
      })
      const temporizador = setTimeout(() => processo?.kill(), TEMPO_MAXIMO_MS)
      sinal.addEventListener("abort", () => processo?.kill())

      const saida = readline.createInterface({ input: processo.stdout! })
      const erros = readline.createInterface({ input: processo.stderr! })
      saida.on("line", (linha) => {
        if (!linha.trim()) return
        try {
          enviar({ tipo: "cargo", dados: JSON.parse(linha) })
        } catch {
          erro = "o buscador.sh devolveu uma linha que não é JSON"
        }
      })
      erros.on("line", (linha) => {
        if (linha.startsWith("Aviso: ")) enviar({ tipo: "aviso", mensagem: linha.slice("Aviso: ".length) })
        else if (linha.startsWith("Erro: ")) erro = linha.slice("Erro: ".length)
        // Demais linhas (tentativas do curl, por exemplo) ficam só no terminal do servidor.
        else if (linha.trim()) console.warn(`[buscador.sh] ${linha}`)
      })
      processo.on("error", (falha) => {
        erro = `não foi possível executar o buscador.sh: ${falha.message}`
      })

      Promise.all([once(processo, "close"), once(saida, "close"), once(erros, "close")])
        .then(([[codigo]]) => {
          clearTimeout(temporizador)
          const codigoSaida = typeof codigo === "number" ? codigo : 1
          enviar({ tipo: "fim", codigo: codigoSaida, erro })
          if (!encerrado) {
            encerrado = true
            controle.close()
          }
          if (codigoSaida === 0) {
            resultadosEmCache.set(chave, { linhas, expiraEm: Date.now() + VALIDADE_CACHE_MS })
          }
        })
        .catch(() => {
          clearTimeout(temporizador)
          if (!encerrado) {
            encerrado = true
            controle.error(new Error("falha ao ler a saída do buscador.sh"))
          }
        })
    },
    cancel() {
      encerrado = true
      processo?.kill()
    },
  })
}
