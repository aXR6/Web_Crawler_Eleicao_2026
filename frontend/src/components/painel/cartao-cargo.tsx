"use client"

import { useState, type ReactNode } from "react"
import { ChartBar, CircleSlash, Table2, TriangleAlert } from "lucide-react"

import { Duelo, Ranking, TabelaCandidatos } from "@/components/painel/candidatos"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CARGOS, classificar, eleitos } from "@/lib/eleicao"
import { fmtAtualizado, fmtPct, nomeProprio } from "@/lib/formato"
import type { ResultadoCargo, Turno } from "@/lib/tipos"
import { cn } from "@/lib/utils"

interface Props {
  cargo: number
  turno: Turno
  dado?: ResultadoCargo
  /** Dado de outro município, exibido esmaecido enquanto o novo chega. */
  obsoleto: boolean
  /** O TSE não tem arquivo para este cargo neste turno. */
  ausente: boolean
  carregando: boolean
  top: number
  indice: number
  aoVerPrimeiroTurno: () => void
}

export function CartaoCargo({ cargo, turno, dado, obsoleto, ausente, carregando, top, indice, aoVerPrimeiroTurno }: Props) {
  const [modo, setModo] = useState("grafico")
  const info = CARGOS[cargo]

  if (!dado) {
    if (ausente) {
      return (
        <Moldura cargo={cargo} turno={turno} indice={indice} subtitulo="Sem resultado neste turno" className="self-start">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <CircleSlash className="mt-0.5 size-4 shrink-0 text-primary" />
            {turno === 2
              ? `Não houve 2º turno para ${info.nome}: o cargo foi decidido no 1º turno e o TSE não publicou dados.`
              : `O TSE não publicou dados de ${info.nome} para este município.`}
          </p>
          {turno === 2 ? (
            <Button variant="outline" size="sm" className="self-start" onClick={aoVerPrimeiroTurno}>
              Ver resultado do 1º turno
            </Button>
          ) : null}
        </Moldura>
      )
    }
    if (carregando) {
      return (
        <Moldura cargo={cargo} turno={turno} indice={indice} subtitulo="Aguardando o TSE…">
          <div aria-hidden className="space-y-3">
            {[92, 74, 58, 40].map((largura) => (
              <div key={largura} className="h-3 animate-pulse rounded-r-[4px] bg-primary/10" style={{ width: `${largura}%` }} />
            ))}
          </div>
        </Moldura>
      )
    }
    return (
      <Moldura cargo={cargo} turno={turno} indice={indice} subtitulo="Indisponível">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          Não foi possível carregar este cargo. Use o botão de atualizar acima para tentar de novo.
        </p>
      </Moldura>
    )
  }

  const lista = dado.candidatos.slice(0, top)
  const duelo = turno === 2 && dado.candidatos.length === 2

  return (
    <Moldura
      cargo={cargo}
      turno={turno}
      indice={indice}
      obsoleto={obsoleto}
      subtitulo={duelo ? "Disputa final" : `${lista.length} mais votados no município`}
      acao={
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          spacing={0}
          value={modo}
          onValueChange={(valor) => valor && setModo(valor)}
          aria-label={`Visualização de ${info.nome}`}
        >
          <ToggleGroupItem value="grafico" aria-label="Ver gráfico">
            <ChartBar />
          </ToggleGroupItem>
          <ToggleGroupItem value="tabela" aria-label="Ver tabela">
            <Table2 />
          </ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <Destaques dado={dado} />
      {modo === "tabela" ? (
        <TabelaCandidatos candidatos={duelo ? dado.candidatos : lista} />
      ) : duelo ? (
        <Duelo candidatos={dado.candidatos} />
      ) : (
        <Ranking candidatos={lista} />
      )}
      <p className="mt-auto pt-1 text-[11px] text-muted-foreground">
        % sobre os votos válidos do cargo no município · dados do TSE de {fmtAtualizado(dado.atualizado)}
      </p>
    </Moldura>
  )
}

function Moldura({
  cargo,
  turno,
  indice,
  subtitulo,
  obsoleto = false,
  acao,
  className,
  children,
}: {
  cargo: number
  turno: Turno
  indice: number
  subtitulo: string
  obsoleto?: boolean
  acao?: ReactNode
  className?: string
  children: ReactNode
}) {
  const info = CARGOS[cargo]
  const Icone = info.icone
  const idTitulo = `cargo-${turno}-${cargo}`
  return (
    <section
      aria-labelledby={idTitulo}
      className={cn(
        "hud-panel flex min-w-0 flex-col gap-4 p-5 transition-opacity duration-500 motion-safe:animate-surgir",
        obsoleto && "opacity-40",
        className
      )}
      style={{ animationDelay: `${indice * 70}ms` }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary shadow-[0_0_24px_-8px_var(--neon)]">
            <Icone className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 id={idTitulo} className="truncate text-lg leading-tight font-semibold">
              {info.nome}
            </h3>
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {turno}º turno · {subtitulo}
            </p>
          </div>
        </div>
        {acao}
      </header>
      {children}
    </section>
  )
}

/** Frases-resumo do cargo: quem liderou no município e quem foi eleito. */
function Destaques({ dado }: { dado: ResultadoCargo }) {
  const [lider] = dado.candidatos
  if (!lider) return null
  const cidade = nomeProprio(dado.nome_municipio)
  const escopo = dado.cargo === 1 ? "no país" : `no ${dado.uf}`
  const listaEleitos = eleitos(dado.candidatos)
  const noSegundo = dado.candidatos.filter((candidato) => classificar(candidato.situacao) === "segundo")
  const itens: { rotulo: string; valor: string; nota?: string }[] = [
    { rotulo: `Mais votado em ${cidade}`, valor: `${lider.nome} · ${fmtPct(lider.percentual)}` },
  ]

  if (CARGOS[dado.cargo].proporcional) {
    itens.push({
      rotulo: "Eleitos entre os 20 mais votados aqui",
      valor: `${listaEleitos.length} ${listaEleitos.length === 1 ? "candidato" : "candidatos"}`,
    })
  } else if (noSegundo.length >= 2) {
    itens.push({ rotulo: "Foram ao 2º turno", valor: noSegundo.map((candidato) => candidato.nome).join(" × ") })
  } else if (listaEleitos.length) {
    const liderEleito = listaEleitos.some((candidato) => candidato.numero === lider.numero)
    itens.push({
      rotulo: listaEleitos.length > 1 ? `Eleitos ${escopo}` : `Eleito ${escopo}`,
      valor: listaEleitos.map((candidato) => candidato.nome).join(", "),
      nota: liderEleito ? undefined : `${cidade} votou diferente do resultado geral`,
    })
  }

  return (
    <dl className="grid gap-3 rounded-lg border border-border/70 bg-white/2 p-3 sm:grid-cols-2">
      {itens.map((item) => (
        <div key={item.rotulo} className="min-w-0">
          <dt className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{item.rotulo}</dt>
          <dd className="mt-0.5 truncate text-sm font-semibold" title={item.valor}>
            {item.valor}
          </dd>
          {item.nota ? <dd className="text-[11px] text-muted-foreground">{item.nota}</dd> : null}
        </div>
      ))}
    </dl>
  )
}
