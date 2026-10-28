"use client"

import { Check, LoaderCircle, Minus, X } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { CARGOS } from "@/lib/eleicao"
import type { Turno } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export type EstadoEtapa = "pendente" | "ok" | "sem-dados" | "falha"
export interface Etapa {
  turno: Turno
  cargo: number
  estado: EstadoEtapa
}

const concluidas = (etapas: Etapa[]) => etapas.filter((etapa) => etapa.estado !== "pendente").length

/** Primeira carga: radar animado + lista das 7 consultas do buscador.sh. */
export function Varredura({ nome, etapas, segundos }: { nome: string | null; etapas: Etapa[]; segundos: number }) {
  const feitas = concluidas(etapas)
  return (
    <section
      aria-labelledby="titulo-varredura"
      className="hud-panel grid gap-8 p-6 motion-safe:animate-surgir sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center"
    >
      <Radar />
      <div className="min-w-0 space-y-4">
        <p className="font-mono text-[11px] tracking-[0.32em] text-primary uppercase">Varredura em andamento</p>
        <h2 id="titulo-varredura" className="text-2xl font-semibold sm:text-3xl">
          Consultando o TSE{nome ? ` para ${nome}` : ""}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          O buscador.sh faz uma consulta por cargo e por turno no resultados.tse.jus.br. Cada cargo aparece na tela assim que chega.
        </p>
        <Progress value={(feitas / etapas.length) * 100} className="h-1.5" aria-label="Progresso da consulta" />
        <ListaEtapas etapas={etapas} />
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {feitas}/{etapas.length} consultas · {segundos}s
        </p>
      </div>
    </section>
  )
}

/** Recarga (outro município): faixa fina, sem esconder os dados anteriores. */
export function FaixaProgresso({ nome, etapas }: { nome: string | null; etapas: Etapa[] }) {
  const feitas = concluidas(etapas)
  return (
    <div role="status" className="hud-panel flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 motion-safe:animate-surgir">
      <LoaderCircle className="size-4 shrink-0 text-primary motion-safe:animate-spin" />
      <span className="text-sm">
        Atualizando {nome ?? "município"} · <span className="font-mono tabular-nums">{feitas}/{etapas.length}</span>
      </span>
      <Progress value={(feitas / etapas.length) * 100} className="h-1 min-w-32 flex-1" aria-label="Progresso da consulta" />
    </div>
  )
}

function ListaEtapas({ etapas }: { etapas: Etapa[] }) {
  return (
    <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
      {etapas.map((etapa) => (
        <li
          key={`${etapa.turno}-${etapa.cargo}`}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px]",
            etapa.estado === "ok" ? "border-primary/40 bg-primary/10 text-foreground" : "border-border text-muted-foreground"
          )}
        >
          <IconeEtapa estado={etapa.estado} />
          {CARGOS[etapa.cargo].curto} · {etapa.turno}º
        </li>
      ))}
    </ul>
  )
}

function IconeEtapa({ estado }: { estado: EstadoEtapa }) {
  if (estado === "ok") return <Check aria-label="recebido" className="size-3.5 text-primary" />
  if (estado === "sem-dados") return <Minus aria-label="sem dados no TSE" className="size-3.5" />
  if (estado === "falha") return <X aria-label="falhou" className="size-3.5 text-destructive" />
  return <LoaderCircle aria-label="aguardando" className="size-3.5 motion-safe:animate-spin" />
}

function Radar() {
  return (
    <div
      aria-hidden
      className="relative mx-auto size-44 overflow-hidden rounded-full border border-primary/40 bg-[radial-gradient(circle,rgb(56_189_248/0.12),transparent_70%)] shadow-[0_0_60px_-20px_var(--neon)] sm:size-52"
    >
      <div className="absolute inset-[17%] rounded-full border border-primary/20" />
      <div className="absolute inset-[34%] rounded-full border border-primary/20" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-primary/15" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-primary/15" />
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgb(56_189_248/0.55),transparent_26%)] motion-safe:animate-radar" />
      {[
        ["left-[64%] top-[28%]", "0s"],
        ["left-[30%] top-[58%]", "0.9s"],
        ["left-[56%] top-[70%]", "1.7s"],
      ].map(([posicao, atraso]) => (
        <span key={posicao} className={cn("absolute size-2 rounded-full bg-primary", posicao)}>
          <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-pulso" style={{ animationDelay: atraso }} />
        </span>
      ))}
    </div>
  )
}
