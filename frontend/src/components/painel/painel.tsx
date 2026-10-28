"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { RefreshCw, TriangleAlert } from "lucide-react"

import { Cabecalho, Rodape, type EstadoGeral } from "@/components/painel/cabecalho"
import { CartaoCargo } from "@/components/painel/cartao-cargo"
import { Composicao } from "@/components/painel/composicao"
import { ResumoMunicipio } from "@/components/painel/resumo-municipio"
import { SeletorMunicipio } from "@/components/painel/seletor-municipio"
import { FaixaProgresso, Varredura, type Etapa } from "@/components/painel/varredura"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSegundos } from "@/hooks/use-movimento"
import { useMunicipios, useResultados } from "@/hooks/use-resultados"
import { CAPITAL, CARGOS, cargosDoTurno, chave, CONSULTAS, OPCOES_TOP } from "@/lib/eleicao"
import { nomeProprio, ordemDaData } from "@/lib/formato"
import type { ResultadoCargo, Turno } from "@/lib/tipos"
import { cn } from "@/lib/utils"

// Cargo usado no resumo do município (eleitorado e comparecimento são os mesmos em todos).
const PREFERENCIA_RESUMO: Record<Turno, number[]> = { 1: [3, 1, 5, 6, 7], 2: [1, 3] }

const lerMunicipio = (valor: string | null) => (valor && /^\d{5}$/.test(valor) ? valor : CAPITAL)
const lerTop = (valor: string | null) => {
  const numero = Number(valor)
  return (OPCOES_TOP as readonly number[]).includes(numero) ? numero : 10
}

function dicaDoErro(erro: string) {
  if (/jq não encontrado/.test(erro)) return "Instale o jq no computador do servidor: sudo apt install jq"
  if (/curl não encontrado/.test(erro)) return "Instale o curl no computador do servidor: sudo apt install curl"
  if (/falha ao consultar|lista de municípios/.test(erro)) return "Verifique a conexão com resultados.tse.jus.br e tente de novo."
  return null
}

export function Painel() {
  const parametros = useSearchParams()
  const [municipio, setMunicipio] = useState(() => lerMunicipio(parametros.get("municipio")))
  const [turno, setTurno] = useState<Turno>(() => (parametros.get("turno") === "2" ? 2 : 1))
  const [top, setTop] = useState(() => lerTop(parametros.get("top")))
  const lista = useMunicipios()
  const { consulta, anterior, carregando, atualizar } = useResultados(municipio)

  // A URL guarda a escolha: dá para compartilhar o link ou voltar a ele depois.
  useEffect(() => {
    const busca = new URLSearchParams({ municipio, turno: String(turno), top: String(top) })
    window.history.replaceState(null, "", `?${busca}`)
  }, [municipio, turno, top])

  // Teclas 1 e 2 trocam o turno (fora de campos de texto).
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement
      if (evento.ctrlKey || evento.metaKey || evento.altKey || alvo.closest("input, textarea, [contenteditable]")) return
      if (evento.key === "1" || evento.key === "2") setTurno(Number(evento.key) as Turno)
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [])

  const nomeBruto =
    lista.municipios.find((item) => item.codigo === municipio)?.nome ??
    Object.values(consulta?.cargos ?? {})[0]?.nome_municipio ??
    null
  const nome = nomeBruto ? nomeProprio(nomeBruto) : null

  useEffect(() => {
    document.title = nome ? `${nome} · Eleições 2026` : "Eleições 2026 · Maranhão"
  }, [nome])

  /** Dado de um cargo: o da consulta atual ou, enquanto ela chega, o da anterior (esmaecido). */
  const obter = (turnoAlvo: Turno, cargo: number): { dado?: ResultadoCargo; obsoleto: boolean } => {
    const k = chave(turnoAlvo, cargo)
    if (consulta?.cargos[k]) return { dado: consulta.cargos[k], obsoleto: false }
    if (carregando && anterior?.cargos[k]) return { dado: anterior.cargos[k], obsoleto: true }
    return { obsoleto: false }
  }

  const cargos = cargosDoTurno(turno)
  const fonteResumo = PREFERENCIA_RESUMO[turno].map((cargo) => ({ cargo, ...obter(turno, cargo) })).find((item) => item.dado)
  const exibidos = cargos.map((cargo) => ({ cargo, ...obter(turno, cargo) }))
  const atualizado =
    exibidos
      .map((item) => item.dado?.atualizado)
      .filter((data): data is string => Boolean(data))
      .sort((a, b) => ordemDaData(b) - ordemDaData(a))[0] ?? null

  const etapas: Etapa[] = CONSULTAS.map(({ turno: turnoEtapa, cargo }) => {
    const k = chave(turnoEtapa, cargo)
    const estado = consulta?.cargos[k]
      ? "ok"
      : consulta?.ausentes.includes(k)
        ? "sem-dados"
        : consulta?.concluida
          ? "falha"
          : "pendente"
    return { turno: turnoEtapa, cargo, estado }
  })

  const recebidos = Object.keys(consulta?.cargos ?? {}).length
  const primeiraCarga = carregando && recebidos === 0 && !anterior
  const erroTotal = consulta?.concluida && consulta.erro && recebidos === 0 ? consulta.erro : null
  const erroParcial = consulta?.concluida && consulta.erro && recebidos > 0 ? consulta.erro : null
  const estado: EstadoGeral = carregando ? "carregando" : erroTotal || erroParcial ? "erro" : "pronto"
  const segundos = useSegundos(carregando, `${municipio}-${consulta?.id ?? ""}`)

  const anuncio = carregando
    ? `Carregando resultados de ${nome ?? "município"}: ${recebidos} de ${CONSULTAS.length} consultas.`
    : erroTotal
      ? `Erro ao consultar o TSE: ${erroTotal}`
      : `Resultados de ${nome ?? "município"} carregados.`

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Pular para os resultados
      </a>
      <Cabecalho estado={estado} atualizado={atualizado} />

      <div className="z-40 -mx-4 border-b border-border/70 bg-background/75 px-4 py-3 backdrop-blur-xl sm:sticky sm:top-0 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 max-sm:gap-x-3">
          <Campo rotulo="Município" className="max-sm:w-full">
            <SeletorMunicipio
              municipios={lista.municipios}
              valor={municipio}
              carregando={lista.carregando}
              erro={lista.erro}
              aoEscolher={setMunicipio}
              aoRecarregar={lista.recarregar}
            />
          </Campo>
          <Campo rotulo="Turno · teclas 1 e 2" rotuloCurto="Turno">
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={String(turno)}
              onValueChange={(valor) => valor && setTurno(Number(valor) as Turno)}
              aria-label="Turno"
            >
              <ToggleGroupItem value="1" className="h-10 px-4 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground">
                1º turno
              </ToggleGroupItem>
              <ToggleGroupItem value="2" className="h-10 px-4 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground">
                2º turno
              </ToggleGroupItem>
            </ToggleGroup>
          </Campo>
          <Campo rotulo="Candidatos por cargo" rotuloCurto="Top">
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={String(top)}
              onValueChange={(valor) => valor && setTop(Number(valor))}
              aria-label="Quantidade de candidatos por cargo"
            >
              {OPCOES_TOP.map((opcao) => (
                <ToggleGroupItem
                  key={opcao}
                  value={String(opcao)}
                  className="h-10 px-3.5 font-mono data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
                >
                  {opcao}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Campo>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon-lg" className="size-10" onClick={atualizar} aria-label="Consultar o TSE de novo">
                <RefreshCw className={carregando ? "motion-safe:animate-spin" : undefined} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Consultar o TSE de novo (ignora o cache de 10 min)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <main id="conteudo" aria-busy={carregando} className="flex-1 space-y-6 pt-6 pb-16">
        {erroTotal ? (
          <Alert variant="destructive" className="hud-panel">
            <TriangleAlert />
            <AlertTitle>Não foi possível consultar o TSE</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{erroTotal}</p>
              {dicaDoErro(erroTotal) ? <p className="text-foreground">{dicaDoErro(erroTotal)}</p> : null}
              <Button variant="outline" onClick={atualizar}>
                <RefreshCw /> Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : primeiraCarga ? (
          <Varredura nome={nome} etapas={etapas} segundos={segundos} />
        ) : (
          <>
            {carregando ? <FaixaProgresso nome={nome} etapas={etapas} /> : null}
            {erroParcial ? (
              <Alert className="hud-panel">
                <TriangleAlert className="text-destructive" />
                <AlertTitle>Alguns cargos não foram carregados</AlertTitle>
                <AlertDescription>
                  {erroParcial}. {dicaDoErro(erroParcial) ?? "Use o botão de atualizar para tentar de novo."}
                </AlertDescription>
              </Alert>
            ) : null}

            <ResumoMunicipio
              codigo={municipio}
              nome={nomeBruto}
              uf={fonteResumo?.dado?.uf ?? "MA"}
              turno={turno}
              resumo={fonteResumo?.dado?.resumo}
              cargoResumo={fonteResumo ? CARGOS[fonteResumo.cargo].nome : null}
              obsoleto={fonteResumo?.obsoleto ?? false}
            />

            <div className="grid gap-6 xl:grid-cols-2">
              {exibidos.map(({ cargo, dado, obsoleto }, indice) => (
                <CartaoCargo
                  key={`${turno}-${cargo}`}
                  cargo={cargo}
                  turno={turno}
                  dado={dado}
                  obsoleto={obsoleto}
                  ausente={consulta?.ausentes.includes(chave(turno, cargo)) ?? false}
                  carregando={carregando}
                  top={top}
                  indice={indice}
                  aoVerPrimeiroTurno={() => setTurno(1)}
                />
              ))}
              <Composicao
                turno={turno}
                obsoleto={exibidos.some((item) => item.obsoleto)}
                itens={exibidos.flatMap(({ cargo, dado }) => (dado ? [{ cargo, resumo: dado.resumo }] : []))}
              />
            </div>
          </>
        )}
      </main>

      <Rodape />
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>
    </div>
  )
}

function Campo({
  rotulo,
  rotuloCurto,
  className,
  children,
}: {
  rotulo: string
  rotuloCurto?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
        {rotuloCurto ? (
          <>
            <span className="sm:hidden">{rotuloCurto}</span>
            <span className="max-sm:hidden">{rotulo}</span>
          </>
        ) : (
          rotulo
        )}
      </span>
      {children}
    </div>
  )
}
