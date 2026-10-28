// Formato das linhas que o buscador.sh imprime com TSE_RESULTS_FORMAT=json.

export type Turno = 1 | 2

export interface Municipio {
  codigo: string
  nome: string
}

export interface Candidato {
  nome: string
  numero: string
  votos: number
  /** Percentual sobre os votos válidos, como o TSE publica (campo pvap). */
  percentual: number
  situacao: string
}

export interface Resumo {
  eleitores: number
  comparecimento: number
  abstencao: number
  votos: number
  validos: number
  brancos: number
  nulos: number
  anulados: number
  secoes_totalizadas: number
}

export interface ResultadoCargo {
  municipio: string
  nome_municipio: string
  uf: string
  turno: Turno
  cargo: number
  nome_cargo: string
  atualizado: string
  resumo: Resumo
  candidatos: Candidato[]
}

/** Eventos que a rota /api/resultados envia, um JSON por linha. */
export type Evento =
  | { tipo: "cargo"; dados: ResultadoCargo }
  | { tipo: "aviso"; mensagem: string }
  | { tipo: "fim"; codigo: number; erro: string | null }
