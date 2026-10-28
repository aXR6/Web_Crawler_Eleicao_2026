"use client"

import { useCallback, useEffect, useState } from "react"

import { buscarMunicipios, lerResultados, mensagemDe } from "@/lib/cliente"
import { chave, chaveDoAviso, LIMITE_CONSULTA } from "@/lib/eleicao"
import type { Municipio, ResultadoCargo } from "@/lib/tipos"

export interface Consulta {
  id: string
  municipio: string
  cargos: Record<string, ResultadoCargo>
  /** "turno-cargo" para os quais o TSE não tem arquivo (ex.: Governador no 2º turno). */
  ausentes: string[]
  avisos: string[]
  concluida: boolean
  erro: string | null
}

/**
 * Consulta um município em fluxo. Enquanto a nova consulta chega, `anterior` guarda a
 * última consulta concluída, para a tela mantê-la esmaecida em vez de piscar vazia.
 */
export function useResultados(municipio: string) {
  const [tentativa, setTentativa] = useState(0)
  const [atual, setAtual] = useState<Consulta | null>(null)
  const [ultimaConcluida, setUltimaConcluida] = useState<Consulta | null>(null)
  const id = `${municipio}#${tentativa}`

  useEffect(() => {
    const controle = new AbortController()
    let consulta: Consulta = { id, municipio, cargos: {}, ausentes: [], avisos: [], concluida: false, erro: null }
    const publicar = (proxima: Consulta) => {
      consulta = proxima
      setAtual(proxima)
      if (proxima.concluida) setUltimaConcluida(proxima)
    }

    lerResultados(municipio, LIMITE_CONSULTA, tentativa > 0, controle.signal, (evento) => {
      if (evento.tipo === "cargo") {
        const dados = evento.dados
        publicar({ ...consulta, cargos: { ...consulta.cargos, [chave(dados.turno, dados.cargo)]: dados } })
      } else if (evento.tipo === "aviso") {
        const ausente = chaveDoAviso(evento.mensagem)
        publicar({
          ...consulta,
          avisos: [...consulta.avisos, evento.mensagem],
          ausentes: ausente ? [...consulta.ausentes, ausente] : consulta.ausentes,
        })
      } else {
        publicar({ ...consulta, concluida: true, erro: evento.codigo === 0 ? null : (evento.erro ?? "o buscador.sh terminou com erro") })
      }
    }).catch((falha) => {
      if (!controle.signal.aborted) publicar({ ...consulta, concluida: true, erro: mensagemDe(falha) })
    })

    return () => controle.abort()
  }, [id, municipio, tentativa])

  const consulta = atual?.id === id ? atual : null
  const anterior = ultimaConcluida && ultimaConcluida.id !== id ? ultimaConcluida : null
  const atualizar = useCallback(() => setTentativa((valor) => valor + 1), [])

  return { consulta, anterior, carregando: !consulta?.concluida, atualizar }
}

export function useMunicipios() {
  const [tentativa, setTentativa] = useState(0)
  const [estado, setEstado] = useState<{ tentativa: number; municipios: Municipio[]; erro: string | null }>()

  useEffect(() => {
    const controle = new AbortController()
    buscarMunicipios(controle.signal)
      .then((municipios) => setEstado({ tentativa, municipios, erro: null }))
      .catch((falha) => {
        if (!controle.signal.aborted) setEstado((anterior) => ({ tentativa, municipios: anterior?.municipios ?? [], erro: mensagemDe(falha) }))
      })
    return () => controle.abort()
  }, [tentativa])

  return {
    municipios: estado?.municipios ?? [],
    carregando: estado?.tentativa !== tentativa,
    erro: estado?.tentativa === tentativa ? estado.erro : null,
    recarregar: () => setTentativa((valor) => valor + 1),
  }
}
