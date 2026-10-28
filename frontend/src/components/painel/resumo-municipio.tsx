"use client"

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts"

import { ChartContainer } from "@/components/ui/chart"
import { useContador } from "@/hooks/use-movimento"
import { fmtInt, fmtPct, nomeProprio } from "@/lib/formato"
import type { Resumo, Turno } from "@/lib/tipos"
import { cn } from "@/lib/utils"

interface Props {
  codigo: string
  nome: string | null
  uf: string
  turno: Turno
  resumo?: Resumo
  /** Cargo de onde vieram os números (o eleitorado é o mesmo; válidos variam por cargo). */
  cargoResumo: string | null
  obsoleto: boolean
}

export function ResumoMunicipio({ codigo, nome, uf, turno, resumo, cargoResumo, obsoleto }: Props) {
  const comparecimento = resumo && resumo.eleitores ? (resumo.comparecimento / resumo.eleitores) * 100 : 0
  const abstencao = resumo && resumo.eleitores ? (resumo.abstencao / resumo.eleitores) * 100 : 0

  return (
    <section
      aria-labelledby="titulo-municipio"
      className={cn("hud-panel p-5 transition-opacity duration-500 sm:p-6", obsoleto && "opacity-40")}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.25fr)]">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.3em] text-primary/90 uppercase">
            Município · {uf} · cód. TSE {codigo}
          </p>
          <h2 id="titulo-municipio" className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">
            {nome ? nomeProprio(nome) : "Carregando…"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {turno}º turno
            {resumo ? ` · ${fmtPct(resumo.secoes_totalizadas, 0)} das seções totalizadas` : ""}
          </p>
        </div>

        <Medidor valor={comparecimento} />

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2 xl:col-span-1 xl:grid-cols-2">
          <Indicador rotulo="Eleitorado apto" valor={resumo?.eleitores ?? 0} />
          <Indicador rotulo="Compareceram" valor={resumo?.comparecimento ?? 0} />
          <Indicador rotulo="Abstenções" valor={resumo?.abstencao ?? 0} detalhe={`${fmtPct(abstencao)} do eleitorado`} />
          <Indicador rotulo={cargoResumo ? `Votos válidos · ${cargoResumo}` : "Votos válidos"} valor={resumo?.validos ?? 0} />
        </dl>
      </div>
    </section>
  )
}

/** Medidor de comparecimento: trilho e preenchimento no mesmo tom; o número é o destaque da tela. */
function Medidor({ valor }: { valor: number }) {
  const animado = useContador(valor)
  return (
    <figure className="flex items-center gap-4">
      <ChartContainer
        config={{ valor: { label: "Comparecimento", color: "var(--neon)" } }}
        className="aspect-square size-28 drop-shadow-[0_0_14px_rgb(56_189_248/0.45)] sm:size-32"
        initialDimension={{ width: 128, height: 128 }}
      >
        <RadialBarChart data={[{ valor }]} startAngle={90} endAngle={-270} innerRadius="78%" outerRadius="100%" barSize={10}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar dataKey="valor" fill="var(--color-valor)" background={{ fill: "rgb(56 189 248 / 0.13)" }} cornerRadius={6} />
        </RadialBarChart>
      </ChartContainer>
      <figcaption>
        <span className="block text-5xl leading-none font-semibold sm:text-6xl">{fmtPct(animado)}</span>
        <span className="mt-1 block text-sm text-muted-foreground">de comparecimento</span>
      </figcaption>
    </figure>
  )
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: number; detalhe?: string }) {
  const animado = useContador(valor)
  return (
    <div className="rounded-lg border border-border/70 bg-white/2.5 px-3.5 py-3">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1 text-2xl font-semibold">{fmtInt(animado)}</dd>
      {detalhe ? <dd className="text-[11px] text-muted-foreground">{detalhe}</dd> : null}
    </div>
  )
}
