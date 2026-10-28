const inteiro = new Intl.NumberFormat("pt-BR")
const decimal = (casas: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })

export const fmtInt = (valor: number) => inteiro.format(Math.round(valor))

export const fmtDec = (valor: number, casas = 1) => decimal(casas).format(valor)

export const fmtPct = (valor: number, casas = 1) => `${fmtDec(valor, casas)}%`

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e"])

/** "SÃO JOSÉ DE RIBAMAR" -> "São José de Ribamar" (nomes de município). */
export function nomeProprio(texto: string): string {
  return texto
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, indice) =>
      indice > 0 && PARTICULAS.has(palavra) ? palavra : palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1)
    )
    .join(" ")
}

/** Remove acentos e caixa para buscas: "São Luís" e "sao luis" casam. */
export const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR")

/** "05/10/2026 02:02:13" -> número comparável (aaaammddhhmmss). */
export function ordemDaData(texto: string): number {
  const partes = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/.exec(texto)
  if (!partes) return 0
  const [, dia, mes, ano, hora, minuto, segundo] = partes
  return Number(`${ano}${mes}${dia}${hora}${minuto}${segundo}`)
}

/** "05/10/2026 02:02:13" -> "05/10/2026 às 02:02" */
export const fmtAtualizado = (texto: string) => texto.replace(/^(\S+) (\d{2}:\d{2}).*$/, "$1 às $2")
