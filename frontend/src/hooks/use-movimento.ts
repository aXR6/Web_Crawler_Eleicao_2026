"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"

const CONSULTA_MOVIMENTO = "(prefers-reduced-motion: reduce)"

/** true quando o sistema pede menos animação. */
export function useMenosMovimento() {
  return useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia(CONSULTA_MOVIMENTO)
      consulta.addEventListener("change", avisar)
      return () => consulta.removeEventListener("change", avisar)
    },
    () => window.matchMedia(CONSULTA_MOVIMENTO).matches,
    () => false
  )
}

/** Anima um número do valor anterior até o alvo (efeito "contador"). */
export function useContador(alvo: number, duracaoMs = 900) {
  const menosMovimento = useMenosMovimento()
  const [valor, setValor] = useState(0)
  const ultimo = useRef(0)

  useEffect(() => {
    if (menosMovimento) return
    const inicio = performance.now()
    const de = ultimo.current
    let quadro = 0
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracaoMs)
      const atual = de + (alvo - de) * (1 - Math.pow(1 - t, 3))
      ultimo.current = atual
      setValor(atual)
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo, duracaoMs, menosMovimento])

  return menosMovimento ? alvo : valor
}

/** Segundos desde que `ativo` virou true (para o painel de carregamento). */
export function useSegundos(ativo: boolean, reinicio: string) {
  const [estado, setEstado] = useState({ reinicio, segundos: 0 })

  useEffect(() => {
    if (!ativo) return
    const inicio = Date.now()
    const relogio = setInterval(() => setEstado({ reinicio, segundos: Math.floor((Date.now() - inicio) / 1000) }), 1000)
    return () => clearInterval(relogio)
  }, [ativo, reinicio])

  return estado.reinicio === reinicio ? estado.segundos : 0
}
