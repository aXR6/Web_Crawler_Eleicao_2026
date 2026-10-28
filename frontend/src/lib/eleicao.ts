import { Building2, Landmark, Scale, Users, UsersRound, type LucideIcon } from "lucide-react"

import type { Candidato, Turno } from "@/lib/tipos"

/** São Luís, a capital: município aberto quando a URL não indica outro. */
export const CAPITAL = "09210"

/** A tela pede 20 candidatos por cargo e recorta no navegador (Top 5/10/20), sem nova consulta. */
export const LIMITE_CONSULTA = 20
export const OPCOES_TOP = [5, 10, 20] as const

/** Ordem em que o buscador.sh consulta o TSE; usada para mostrar o progresso. */
export const CONSULTAS: { turno: Turno; cargo: number }[] = [
  { turno: 1, cargo: 6 },
  { turno: 1, cargo: 7 },
  { turno: 1, cargo: 5 },
  { turno: 1, cargo: 3 },
  { turno: 1, cargo: 1 },
  { turno: 2, cargo: 3 },
  { turno: 2, cargo: 1 },
]

/** Ordem de exibição: cargos majoritários primeiro. */
export const ORDEM_CARGOS = [1, 3, 5, 6, 7]
/** Só Governador e Presidente podem ter 2º turno. */
export const CARGOS_SEGUNDO_TURNO = [1, 3]

export const CARGOS: Record<number, { nome: string; curto: string; icone: LucideIcon; proporcional: boolean }> = {
  1: { nome: "Presidente", curto: "Presidente", icone: Landmark, proporcional: false },
  3: { nome: "Governador", curto: "Governador", icone: Building2, proporcional: false },
  5: { nome: "Senador", curto: "Senador", icone: Scale, proporcional: false },
  6: { nome: "Deputado Federal", curto: "Dep. Federal", icone: Users, proporcional: true },
  7: { nome: "Deputado Estadual", curto: "Dep. Estadual", icone: UsersRound, proporcional: true },
}

export const chave = (turno: Turno, cargo: number) => `${turno}-${cargo}`

export const cargosDoTurno = (turno: Turno) =>
  ORDEM_CARGOS.filter((cargo) => turno === 1 || CARGOS_SEGUNDO_TURNO.includes(cargo))

/** Grupo visual de cada situação do TSE. Cores validadas com o validador de paleta (fundo #0a1222). */
export type Classe = "eleito" | "segundo" | "demais" | "anulado"

export const CLASSES: Record<Classe, { rotulo: string; cor: string }> = {
  eleito: { rotulo: "Eleito", cor: "var(--eleito)" },
  segundo: { rotulo: "Vai ao 2º turno", cor: "var(--segundo)" },
  demais: { rotulo: "Não eleito / suplente", cor: "var(--neutro)" },
  anulado: { rotulo: "Anulado sub judice", cor: "var(--neutro)" },
}

export function classificar(situacao: string): Classe {
  if (situacao.startsWith("Eleito")) return "eleito"
  if (situacao === "2º turno") return "segundo"
  if (situacao.startsWith("Anulado")) return "anulado"
  return "demais"
}

export const eleitos = (candidatos: Candidato[]) =>
  candidatos.filter((candidato) => classificar(candidato.situacao) === "eleito")

/** "o TSE não tem dados do cargo 3 no 2º turno" -> "2-3" */
export function chaveDoAviso(aviso: string): string | null {
  const encontrado = /cargo (\d+) no (\d)º turno/.exec(aviso)
  return encontrado ? `${encontrado[2]}-${encontrado[1]}` : null
}
