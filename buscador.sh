#!/usr/bin/env bash
set -Eeuo pipefail

readonly DEFAULT_BASE_URL="https://resultados.tse.jus.br/oficial"
readonly -a CARGOS=(6 7 5 3 1)
# Só Governador e Presidente podem ter 2º turno.
readonly -a CARGOS_T2=(3 1)

BASE_URL="${TSE_RESULTS_BASE_URL:-$DEFAULT_BASE_URL}"
YEAR="${TSE_RESULTS_YEAR:-2026}"
UF="${TSE_RESULTS_UF:-ma}"
MUNICIPIO="${TSE_RESULTS_MUNICIPALITY:-todos}"
LIMIT="${TSE_RESULTS_LIMIT:-20}"
FEDERAL_ELECTION="${TSE_RESULTS_FEDERAL_ELECTION:-6257}"
STATE_ELECTION="${TSE_RESULTS_STATE_ELECTION:-6259}"
FEDERAL_ELECTION_T2="${TSE_RESULTS_FEDERAL_ELECTION_T2:-6258}"
STATE_ELECTION_T2="${TSE_RESULTS_STATE_ELECTION_T2:-6260}"
TURN="${TSE_RESULTS_TURN:-ambos}"
COLOR_MODE="${TSE_RESULTS_COLOR:-auto}"
FORMAT="${TSE_RESULTS_FORMAT:-tabela}"

die() { printf 'Erro: %s\n' "$*" >&2; exit 1; }
warn() { printf 'Aviso: %s\n' "$*" >&2; }
# Registra uma falha sem interromper os demais cargos.
fail() { warn "$*"; failures=$((failures + 1)); }
command -v curl >/dev/null || die "curl não encontrado"
command -v jq >/dev/null || die "jq não encontrado"
[[ "$UF" =~ ^[[:alpha:]]{2}$ ]] || die "TSE_RESULTS_UF deve conter duas letras"
[[ "$MUNICIPIO" =~ ^([0-9]{5}|todos|lista)$ ]] || die "TSE_RESULTS_MUNICIPALITY deve ser um código de cinco dígitos, todos ou lista"
[[ "$YEAR" =~ ^[0-9]{4}$ ]] || die "TSE_RESULTS_YEAR deve conter quatro dígitos"
[[ "$LIMIT" =~ ^[1-9][0-9]*$ ]] || die "TSE_RESULTS_LIMIT deve ser um inteiro positivo"
[[ "$FEDERAL_ELECTION" =~ ^[0-9]+$ && "$STATE_ELECTION" =~ ^[0-9]+$ ]] || die "códigos de eleição devem ser numéricos"
[[ "$FEDERAL_ELECTION_T2" =~ ^[0-9]+$ && "$STATE_ELECTION_T2" =~ ^[0-9]+$ ]] || die "códigos de eleição do 2º turno devem ser numéricos"
[[ "$TURN" =~ ^(1|2|ambos)$ ]] || die "TSE_RESULTS_TURN deve ser 1, 2 ou ambos"
[[ "$COLOR_MODE" =~ ^(auto|always|never)$ ]] || die "TSE_RESULTS_COLOR deve ser auto, always ou never"
[[ "$FORMAT" =~ ^(tabela|json)$ ]] || die "TSE_RESULTS_FORMAT deve ser tabela ou json"

UF="${UF,,}"
# Base 10 explícita: sem isso, "0544" seria lido como octal.
FEDERAL_ELECTION=$((10#$FEDERAL_ELECTION))
STATE_ELECTION=$((10#$STATE_ELECTION))
FEDERAL_ELECTION_T2=$((10#$FEDERAL_ELECTION_T2))
STATE_ELECTION_T2=$((10#$STATE_ELECTION_T2))
BASE_URL="${BASE_URL%/}"
failures=0
# Pares "turno-cargo" que o TSE respondeu não existir; evita repetir a consulta em cada município.
declare -A missing=()
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

use_color=false
if [[ "$COLOR_MODE" == always ]] || { [[ "$COLOR_MODE" == auto && -t 1 && "${TERM:-dumb}" != dumb ]] && [[ -z "${NO_COLOR:-}" ]]; }; then
  use_color=true
fi

print_rule() {
  local name_width="$1" number_width="$2" votes_width="$3" status_width="$4"
  printf '+-%*s-+-%*s-+-%*s-+-%*s-+\n' "$name_width" '' "$number_width" '' "$votes_width" '' "$status_width" '' | tr ' ' '-'
}

# Completa com espaços contando caracteres; o printf do Bash conta bytes e desalinha nomes com acento.
pad_right() { printf -v "$1" '%s%*s' "$2" $(( $3 - ${#2} )) ''; }

print_table() {
  local -n table_rows="$1"
  local name_width=${#name_header} number_width=${#number_header} votes_width=${#votes_header} status_width=${#status_header}
  local row name number votes status status_title status_color

  for row in "${table_rows[@]}"; do
    IFS=$'\t' read -r name number votes status <<<"$row"
    (( ${#name} > name_width )) && name_width=${#name}
    (( ${#number} > number_width )) && number_width=${#number}
    (( ${#votes} > votes_width )) && votes_width=${#votes}
    (( ${#status} > status_width )) && status_width=${#status}
  done

  pad_right status_title "$status_header" "$status_width"
  print_rule "$name_width" "$number_width" "$votes_width" "$status_width"
  printf '| %-*s | %*s | %*s | %s |\n' "$name_width" "$name_header" "$number_width" "$number_header" "$votes_width" "$votes_header" "$status_title"
  print_rule "$name_width" "$number_width" "$votes_width" "$status_width"
  for row in "${table_rows[@]}"; do
    IFS=$'\t' read -r name number votes status <<<"$row"
    pad_right name "$name" "$name_width"
    status_color='\033[0m'
    [[ "$status" == Eleito* ]] && status_color='\033[1;33m'
    pad_right status "$status" "$status_width"
    if $use_color; then
      printf '| \033[36m%s\033[0m | %*s | \033[32m%*s\033[0m | %b%s\033[0m |\n' "$name" "$number_width" "$number" "$votes_width" "$votes" "$status_color" "$status"
    else
      printf '| %s | %*s | %*s | %s |\n' "$name" "$number_width" "$number" "$votes_width" "$votes" "$status"
    fi
  done
  print_rule "$name_width" "$number_width" "$votes_width" "$status_width"
}

readonly name_header="NOME" number_header="NÚMERO" votes_header="VOTOS" status_header="SITUAÇÃO"

# Imprime o cargo como uma linha JSON (TSE_RESULTS_FORMAT=json); é o que a tela em frontend/ lê.
print_json() {
  local municipio="$1" municipio_name="$2" turn="$3" cargo="$4" cargo_name="$5" file="$6" rows_file="$7"
  jq -cRn --arg municipio "$municipio" --arg nome_municipio "$municipio_name" --arg uf "${UF^^}" \
    --argjson turno "$turn" --argjson cargo "$cargo" --arg nome_cargo "$cargo_name" --slurpfile doc "$file" '
    def num: (. // "0") | sub(","; ".") | tonumber;
    $doc[0] as $d
    | ([$d | .. | objects | .cand? // empty | .[] | select(.n != null) | {key: .n, value: (.pvap | num)}] | from_entries) as $pct
    | {
        municipio: $municipio, nome_municipio: $nome_municipio, uf: $uf, turno: $turno, cargo: $cargo, nome_cargo: $nome_cargo,
        atualizado: "\($d.dg // "") \($d.hg // "")",
        resumo: {
          eleitores: ($d.e.te | num), comparecimento: ($d.e.c | num), abstencao: ($d.e.a | num),
          votos: ($d.v.tv | num), validos: ($d.v.vv | num), brancos: ($d.v.vb | num),
          nulos: ($d.v.tvn | num), anulados: ($d.v.vansj | num), secoes_totalizadas: ($d.s.pst | num)
        },
        candidatos: [inputs | split("\t")
          | {nome: .[0], numero: .[1], votos: (.[2] | tonumber), percentual: ($pct[.[1]] // 0), situacao: .[3]}]
      }' <"$rows_file"
}

# Recebe cargo e turno; devolve o código da eleição.
election_for_cargo() {
  case "$1-$2" in
    1-1) printf '%s' "$FEDERAL_ELECTION" ;;
    1-2) printf '%s' "$FEDERAL_ELECTION_T2" ;;
    [3567]-1) printf '%s' "$STATE_ELECTION" ;;
    3-2) printf '%s' "$STATE_ELECTION_T2" ;;
    *) die "cargo $1 não suportado no ${2}º turno" ;;
  esac
}

# Baixa a URL para o arquivo. Retorna 0 (ok), 2 (TSE ainda não tem o arquivo) ou 1 (falha).
fetch_json() {
  local url="$1" output="$2" http_code
  http_code="$(curl --silent --show-error --location \
    --retry 3 --connect-timeout 10 --max-time 30 \
    --output "$output" --write-out '%{http_code}' "$url")" || return 1
  case "$http_code" in
    200) return 0 ;;
    403|404) return 2 ;;
    *) return 1 ;;
  esac
}

# Grava em stdout "código<TAB>nome" de cada município da UF, usando a configuração do TSE.
load_municipalities() {
  local election_padded file="$tmp_dir/municipios.json"
  printf -v election_padded '%06d' "$STATE_ELECTION"
  fetch_json "$BASE_URL/ele$YEAR/$STATE_ELECTION/config/mun-e${election_padded}-cm.json" "$file" \
    || die "não foi possível obter a lista de municípios"
  jq -r --arg uf "$UF" '.abr[] | select(.cd == $uf) | .mu[] | [.cd, .nm] | @tsv' "$file" \
    || die "lista de municípios inválida"
}

# Consulta um cargo em um turno, em um município, e imprime sua tabela.
show_cargo() {
  local municipio="$1" cargo="$2" turn="$3" municipio_name="$4" election cargo_padded election_padded url file rows_file cargo_name status=0
  local status_file="$tmp_dir/situacao-t$turn-c$cargo.json"
  local -a rows
  election="$(election_for_cargo "$cargo" "$turn")"
  file="$tmp_dir/cargo-$cargo.json"
  printf -v cargo_padded '%04d' "$cargo"
  printf -v election_padded '%06d' "$election"
  [[ -v "missing[$turn-$cargo]" ]] && return 0
  url="$BASE_URL/ele$YEAR/$election/dados/$UF/${UF}${municipio}-c${cargo_padded}-e${election_padded}-u.json"

  fetch_json "$url" "$file" || status=$?
  case "$status" in
    0) ;;
    2) warn "o TSE não tem dados do cargo $cargo no ${turn}º turno"; missing[$turn-$cargo]=1; return 0 ;;
    *) fail "falha ao consultar o cargo $cargo ($url)"; return 0 ;;
  esac
  if ! jq -e '.carg | type == "array"' "$file" >/dev/null 2>&1; then
    fail "resposta inválida para o cargo $cargo"; return 0
  fi

  # A situação dos deputados (eleito, suplente...) só vem no arquivo da UF; baixado uma vez por cargo e turno.
  if [[ ! -s "$status_file" ]]; then
    fetch_json "$BASE_URL/ele$YEAR/$election/dados/$UF/${UF}-c${cargo_padded}-e${election_padded}-u.json" "$status_file" \
      || { warn "situação dos candidatos do cargo $cargo indisponível"; printf '{}' >"$status_file"; }
  fi

  cargo_name="$(jq -r --arg cargo "$cargo" 'first(.carg[] | select(.cd == $cargo) | .nmn) // empty' "$file")" || cargo_name=""
  if [[ -z "$cargo_name" ]]; then
    fail "cargo $cargo ausente na resposta"; return 0
  fi
  rows_file="$tmp_dir/cargo-$cargo.tsv"
  jq -r --arg cargo "$cargo" --argjson limit "$LIMIT" --slurpfile uf "$status_file" '
    ($uf[0] | [.. | objects | .cand? // empty | .[] | select(.n != null) | {key: .n, value: .st}] | from_entries) as $status
    | [
      .carg[] | select(.cd == $cargo)
      | .. | objects | .cand? // empty | .[]
      | select((.nmu // "") != "" and (.n // "") != "")
      | { nome: (.nmu | gsub("[[:cntrl:]]"; " ")), numero: .n, votos: ((.vap // "0") | tonumber),
          situacao: (if (.dvt // "") | startswith("Anulado") then .dvt else ($status[.n] // .st // "") end) }
    ]
    | unique_by(.numero)
    | sort_by([-.votos, (.nome | ascii_downcase), .numero])
    | .[:$limit][]
    | [.nome, .numero, (.votos | tostring), (if .situacao == "" then "-" else .situacao end)] | @tsv
  ' "$file" >"$rows_file" || { fail "não foi possível ler os candidatos do cargo $cargo"; return 0; }
  if [[ "$FORMAT" == json ]]; then
    print_json "$municipio" "$municipio_name" "$turn" "$cargo" "$cargo_name" "$file" "$rows_file" \
      || fail "não foi possível gerar o JSON do cargo $cargo"
    return 0
  fi
  printf '\n%s (cargo %s)\n' "$cargo_name" "$cargo"
  mapfile -t rows <"$rows_file"
  print_table rows
}

case "$TURN" in
  ambos) turns=(1 2) ;;
  *) turns=("$TURN") ;;
esac

load_municipalities >"$tmp_dir/municipios.tsv"
if [[ "$MUNICIPIO" == lista ]]; then
  cat "$tmp_dir/municipios.tsv"
  exit 0
fi
if [[ "$MUNICIPIO" != todos ]]; then
  grep "^$MUNICIPIO"$'\t' "$tmp_dir/municipios.tsv" >"$tmp_dir/selecionados.tsv" \
    || die "município $MUNICIPIO não encontrado em ${UF^^}"
  mv "$tmp_dir/selecionados.tsv" "$tmp_dir/municipios.tsv"
fi
mapfile -t municipalities <"$tmp_dir/municipios.tsv"

for entry in "${municipalities[@]}"; do
  IFS=$'\t' read -r municipio municipio_name <<<"$entry"
  if [[ "$FORMAT" == tabela ]]; then
    printf '\n######## %s (%s) - %s ########\n' "$municipio_name" "$municipio" "${UF^^}"
  fi
  for turn in "${turns[@]}"; do
    if [[ "$FORMAT" == tabela ]]; then
      printf '\n===== %sº turno =====\n' "$turn"
    fi
    if (( turn == 1 )); then cargos=("${CARGOS[@]}"); else cargos=("${CARGOS_T2[@]}"); fi
    for cargo in "${cargos[@]}"; do
      show_cargo "$municipio" "$cargo" "$turn" "$municipio_name"
    done
  done
done

(( failures == 0 )) || die "$failures consulta(s) falharam; veja os avisos acima"
