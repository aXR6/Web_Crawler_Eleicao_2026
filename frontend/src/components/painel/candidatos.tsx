"use client"

import type { CSSProperties } from "react"
import { BadgeCheck, Gavel, Swords } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useContador } from "@/hooks/use-movimento"
import { classificar, CLASSES, type Classe } from "@/lib/eleicao"
import { fmtDec, fmtInt, fmtPct } from "@/lib/formato"
import type { Candidato } from "@/lib/tipos"
import { cn } from "@/lib/utils"

const cor = (classe: Classe) => ({ "--cor": CLASSES[classe].cor }) as CSSProperties
const posicao = (indice: number) => String(indice + 1).padStart(2, "0")

const ICONES: Partial<Record<Classe, typeof BadgeCheck>> = { eleito: BadgeCheck, segundo: Swords, anulado: Gavel }

/** Situação do TSE em texto; a cor fica só no ícone (o texto usa a cor de leitura). */
export function EtiquetaSituacao({ situacao, className }: { situacao: string; className?: string }) {
  const classe = classificar(situacao)
  const Icone = ICONES[classe]
  if (!Icone && situacao !== "Suplente") {
    return <span className={cn("shrink-0 text-[11px] text-muted-foreground", className)}>{situacao === "-" ? "—" : situacao}</span>
  }
  return (
    <Badge
      variant="outline"
      style={cor(classe)}
      className={cn(
        "shrink-0 gap-1 border-(--cor)/50 bg-(--cor)/15 font-mono text-[10px] tracking-wider text-foreground uppercase",
        className
      )}
    >
      {Icone ? <Icone className="text-(--cor)" /> : null}
      {situacao}
    </Badge>
  )
}

export function Legenda({ classes }: { classes: Classe[] }) {
  return (
    <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {classes.map((classe) => (
        <li key={classe} className="flex items-center gap-1.5">
          <span
            aria-hidden
            style={cor(classe)}
            className={cn("h-2 w-3.5 rounded-[2px] bg-(--cor)", classe === "anulado" && "barra-hachurada")}
          />
          {CLASSES[classe].rotulo}
        </li>
      ))}
    </ul>
  )
}

/** Barras horizontais: comprimento = votos (relativo ao mais votado); rótulo na ponta. */
export function Ranking({ candidatos }: { candidatos: Candidato[] }) {
  const maximo = Math.max(1, ...candidatos.map((candidato) => candidato.votos))
  // Legenda sempre na mesma ordem (eleito, 2º turno, demais, anulado), só com o que aparece.
  const presentes = new Set(candidatos.map((candidato) => classificar(candidato.situacao)))
  const classes = (Object.keys(CLASSES) as Classe[]).filter((classe) => presentes.has(classe))

  return (
    <div className="space-y-3">
      {classes.length > 1 ? <Legenda classes={classes} /> : null}
      <ol className="space-y-0.5">
        {candidatos.map((candidato, indice) => {
          const classe = classificar(candidato.situacao)
          const largura = candidato.votos > 0 ? Math.max((candidato.votos / maximo) * 100, 0.8) : 0
          return (
            <li key={candidato.numero}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    className="rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-white/4 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{posicao(indice)}</span>
                      <span className="min-w-0 truncate text-sm font-semibold tracking-wide">{candidato.nome}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">nº {candidato.numero}</span>
                      <EtiquetaSituacao situacao={candidato.situacao} className="ml-auto" />
                    </div>
                    <div className="relative mt-1.5 ml-8 h-4">
                      <div className="absolute inset-y-[3px] right-28 left-0 rounded-r-[4px] bg-white/4">
                        <div
                          className={cn("barra motion-safe:animate-crescer", classe === "anulado" && "barra-hachurada")}
                          style={{ ...cor(classe), width: `${largura}%`, animationDelay: `${indice * 45}ms` }}
                        />
                      </div>
                      <span
                        className="absolute top-1/2 -translate-y-1/2 font-mono text-xs whitespace-nowrap tabular-nums"
                        style={{ left: `calc((100% - 7rem) * ${largura / 100} + 0.5rem)` }}
                      >
                        {fmtPct(candidato.percentual)}
                        <span className="ml-1.5 text-muted-foreground">{fmtInt(candidato.votos)}</span>
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold">{fmtInt(candidato.votos)} votos</span>
                  <span>
                    {fmtPct(candidato.percentual, 2)} dos válidos · nº {candidato.numero} · {candidato.situacao}
                  </span>
                </TooltipContent>
              </Tooltip>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** 2º turno com dois candidatos: barra dividida, vencedor em destaque. */
export function Duelo({ candidatos }: { candidatos: Candidato[] }) {
  const [primeiro, segundo] = candidatos
  const total = Math.max(1, primeiro.votos + segundo.votos)
  const diferenca = primeiro.votos - segundo.votos

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <LadoDuelo candidato={primeiro} />
        <LadoDuelo candidato={segundo} direita />
      </div>
      <div
        role="img"
        aria-label={`${primeiro.nome} ${fmtPct(primeiro.percentual)} contra ${segundo.nome} ${fmtPct(segundo.percentual)}`}
        className="flex h-5 gap-[2px]"
      >
        <div
          className="barra rounded-l-[4px] rounded-r-none motion-safe:animate-crescer"
          style={{ ...cor(classificar(primeiro.situacao)), flexBasis: `${(primeiro.votos / total) * 100}%` }}
        />
        <div
          className="barra origin-right rounded-l-none rounded-r-[4px] motion-safe:animate-crescer"
          style={{ ...cor(classificar(segundo.situacao)), flexBasis: `${(segundo.votos / total) * 100}%` }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Diferença de <strong className="font-semibold text-foreground">{fmtInt(diferenca)} votos</strong> (
        {fmtDec(primeiro.percentual - segundo.percentual)} p.p.)
      </p>
    </div>
  )
}

function LadoDuelo({ candidato, direita = false }: { candidato: Candidato; direita?: boolean }) {
  const percentual = useContador(candidato.percentual)
  return (
    <div className={cn("min-w-0 space-y-1.5", direita && "text-right")}>
      <div className={cn("flex", direita && "justify-end")}>
        <EtiquetaSituacao situacao={candidato.situacao} />
      </div>
      <p className="truncate text-sm font-semibold tracking-wide">
        {candidato.nome} <span className="font-mono text-[11px] font-normal text-muted-foreground">nº {candidato.numero}</span>
      </p>
      <p className="text-4xl leading-none font-semibold sm:text-5xl">{fmtPct(percentual)}</p>
      <p className="font-mono text-xs text-muted-foreground">{fmtInt(candidato.votos)} votos</p>
    </div>
  )
}

/** Versão em tabela de qualquer gráfico de candidatos (acessível, sem depender de cor). */
export function TabelaCandidatos({ candidatos }: { candidatos: Candidato[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Candidato</TableHead>
          <TableHead className="text-right">Nº</TableHead>
          <TableHead className="text-right">Votos</TableHead>
          <TableHead className="text-right">% válidos</TableHead>
          <TableHead>Situação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="font-mono text-xs tabular-nums">
        {candidatos.map((candidato, indice) => (
          <TableRow key={candidato.numero}>
            <TableCell className="text-muted-foreground">{posicao(indice)}</TableCell>
            <TableCell className="font-sans text-sm font-medium">{candidato.nome}</TableCell>
            <TableCell className="text-right">{candidato.numero}</TableCell>
            <TableCell className="text-right">{fmtInt(candidato.votos)}</TableCell>
            <TableCell className="text-right">{fmtPct(candidato.percentual, 2)}</TableCell>
            <TableCell className="font-sans">{candidato.situacao}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
