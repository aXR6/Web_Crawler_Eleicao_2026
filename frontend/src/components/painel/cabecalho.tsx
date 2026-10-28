import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react"

import { fmtAtualizado } from "@/lib/formato"

export type EstadoGeral = "carregando" | "pronto" | "erro"

export function Cabecalho({ estado, atualizado }: { estado: EstadoGeral; atualizado: string | null }) {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-mono text-[11px] tracking-[0.32em] text-primary/90 uppercase">TSE · resultados oficiais</p>
            <h1 className="font-display text-2xl font-bold tracking-[0.16em] text-glow motion-safe:animate-flicker sm:text-3xl">
              ELEIÇÕES 2026
            </h1>
            <p className="text-xs text-muted-foreground">Maranhão · resultados por município</p>
          </div>
        </div>
        <Status estado={estado} atualizado={atualizado} />
      </header>
      <div aria-hidden className="linha-fluxo h-px w-full opacity-80 motion-safe:animate-fluxo" />
    </>
  )
}

function Status({ estado, atualizado }: { estado: EstadoGeral; atualizado: string | null }) {
  const conteudo = {
    carregando: { icone: <LoaderCircle className="size-4 text-primary motion-safe:animate-spin" />, texto: "Sincronizando com o TSE" },
    pronto: {
      icone: <CircleCheck className="size-4 text-primary" />,
      texto: atualizado ? `Dados de ${fmtAtualizado(atualizado)}` : "Dados carregados",
    },
    erro: { icone: <TriangleAlert className="size-4 text-destructive" />, texto: "Falha na consulta" },
  }[estado]

  return (
    <p className="hud-panel flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-xs">
      {conteudo.icone}
      {conteudo.texto}
    </p>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 48 48" className="size-12 shrink-0 drop-shadow-[0_0_12px_rgb(56_189_248/0.6)]" aria-hidden>
      <g className="origin-center motion-safe:animate-[spin_18s_linear_infinite]">
        <circle cx="24" cy="24" r="22" fill="none" stroke="var(--neon)" strokeOpacity="0.45" strokeDasharray="3 5" />
      </g>
      <path d="M24 7 39 15.5v17L24 41 9 32.5v-17z" fill="rgb(56 189 248 / 0.08)" stroke="var(--neon)" strokeWidth="1.8" />
      <path d="M17.5 24.5l4.5 4.5 9-10" fill="none" stroke="var(--foreground)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Rodape() {
  return (
    <footer className="flex flex-wrap justify-between gap-2 border-t border-border/60 py-6 text-xs text-muted-foreground">
      <p>Fonte: TSE — resultados.tse.jus.br. Percentuais sobre os votos válidos, como o TSE publica.</p>
      <p className="font-mono">backend: buscador.sh · TSE_RESULTS_FORMAT=json</p>
    </footer>
  )
}
