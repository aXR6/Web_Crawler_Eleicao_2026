"use client"

import { useId, useState } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartBar, PieChart, Table2 } from "lucide-react"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CARGOS } from "@/lib/eleicao"
import { fmtInt, fmtPct } from "@/lib/formato"
import type { Resumo, Turno } from "@/lib/tipos"
import { cn } from "@/lib/utils"

const SERIES = ["validos", "brancos", "nulos", "anulados"] as const
type Serie = (typeof SERIES)[number]

const config = {
  validos: { label: "Válidos", color: "var(--validos)" },
  brancos: { label: "Brancos", color: "var(--brancos)" },
  nulos: { label: "Nulos", color: "var(--nulos)" },
  anulados: { label: "Anulados sub judice", color: "var(--neutro)" },
} satisfies ChartConfig

interface Linha extends Record<Serie, number> {
  rotulo: string
  total: number
  rotuloValidos: string
}

/** Barras 100% empilhadas: como os votos de cada cargo se dividem (parte do todo). */
export function Composicao({ turno, itens, obsoleto }: { turno: Turno; itens: { cargo: number; resumo: Resumo }[]; obsoleto: boolean }) {
  const [modo, setModo] = useState("grafico")
  const hachura = `hachura-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const linhas: Linha[] = itens.map(({ cargo, resumo }) => ({
    rotulo: CARGOS[cargo].curto,
    validos: resumo.validos,
    brancos: resumo.brancos,
    nulos: resumo.nulos,
    anulados: resumo.anulados,
    total: Math.max(1, resumo.votos),
    rotuloValidos: fmtPct((resumo.validos / Math.max(1, resumo.votos)) * 100),
  }))
  if (!linhas.length) return null

  return (
    <section
      aria-labelledby="titulo-composicao"
      className={cn("hud-panel min-w-0 space-y-4 p-5 transition-opacity duration-500", obsoleto && "opacity-40")}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <PieChart className="size-5" />
          </span>
          <div>
            <h3 id="titulo-composicao" className="text-lg leading-tight font-semibold">
              Composição dos votos por cargo
            </h3>
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {turno}º turno · cada barra soma 100% dos votos do cargo
            </p>
          </div>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          spacing={0}
          value={modo}
          onValueChange={(valor) => valor && setModo(valor)}
          aria-label="Visualização da composição"
        >
          <ToggleGroupItem value="grafico" aria-label="Ver gráfico">
            <ChartBar />
          </ToggleGroupItem>
          <ToggleGroupItem value="tabela" aria-label="Ver tabela">
            <Table2 />
          </ToggleGroupItem>
        </ToggleGroup>
      </header>

      <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SERIES.map((serie) => (
          <li key={serie} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("h-2 w-3.5 rounded-[2px]", serie === "anulados" && "barra-hachurada")}
              style={{ background: serie === "anulados" ? undefined : config[serie].color, ["--cor" as string]: config[serie].color }}
            />
            {config[serie].label}
          </li>
        ))}
      </ul>

      {modo === "tabela" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cargo</TableHead>
              {SERIES.map((serie) => (
                <TableHead key={serie} className="text-right">
                  {config[serie].label}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono text-xs tabular-nums">
            {linhas.map((linha) => (
              <TableRow key={linha.rotulo}>
                <TableCell className="font-sans text-sm font-medium">{linha.rotulo}</TableCell>
                {SERIES.map((serie) => (
                  <TableCell key={serie} className="text-right">
                    {fmtInt(linha[serie])} <span className="text-muted-foreground">({fmtPct((linha[serie] / linha.total) * 100)})</span>
                  </TableCell>
                ))}
                <TableCell className="text-right">{fmtInt(linha.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: linhas.length * 46 + 36 }}>
          <BarChart data={linhas} layout="vertical" stackOffset="expand" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <pattern id={hachura} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
                <rect width="6" height="6" fill="rgb(100 116 139 / 0.3)" />
                <rect width="3" height="6" fill="var(--neutro)" />
              </pattern>
            </defs>
            <CartesianGrid horizontal={false} stroke="rgb(148 163 184 / 0.12)" />
            <XAxis
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(valor: number) => `${Math.round(valor * 100)}%`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis type="category" dataKey="rotulo" width={104} tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={{ fill: "rgb(56 189 248 / 0.06)" }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(valor, nome, item) => {
                    const serie = String(nome) as Serie
                    const total = (item.payload as Linha).total
                    return (
                      <div className="flex w-full min-w-48 items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-0.5 w-3 rounded-full" style={{ background: config[serie].color }} />
                          {config[serie].label}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {fmtInt(Number(valor))}
                          <span className="ml-1 text-muted-foreground">· {fmtPct((Number(valor) / total) * 100)}</span>
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            {SERIES.map((serie) => (
              <Bar
                key={serie}
                dataKey={serie}
                stackId="votos"
                barSize={20}
                fill={serie === "anulados" ? `url(#${hachura})` : `var(--color-${serie})`}
                stroke="var(--surface)"
                strokeWidth={2}
              >
                {serie === "validos" ? (
                  <LabelList dataKey="rotuloValidos" position="insideLeft" offset={10} className="fill-white font-mono" fontSize={11} />
                ) : null}
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </section>
  )
}
