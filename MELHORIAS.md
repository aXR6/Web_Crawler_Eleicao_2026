# Plano de melhorias — buscador.sh

Este documento lista as correções e melhorias planejadas para o [buscador.sh](buscador.sh), seguindo a atividade **Manifesto Ágil e Extreme Programming (XP)**. Ele corresponde à etapa 4 do roteiro ("listar no README os pontos que precisam de correção e as melhorias planejadas antes de modificar o código").

- Toda mudança é feita **sobre o código existente**: o script não é reescrito. Cada passo mostra o diff que deve ser aplicado.
- Cada passo é **pequeno, executável e testável sozinho** e corresponde a **um commit**.
- Os passos estão em ordem. Os diffs de cada passo partem do resultado do passo anterior.
- Todos os passos foram executados contra a API real do TSE em 27/10/2026 (resultados na seção 6).
- **Situação:** os passos 1 a 9 estão aplicados no [buscador.sh](buscador.sh) e o passo 10 no [README.md](README.md).

> O enunciado cita o arquivo `tse-top-candidates.sh`. Neste repositório o script se chama `buscador.sh`. O conteúdo é o mesmo projeto.

---

## 1. Requisitos da atividade → passos

| Requisito do enunciado                                        | Passo(s)        |
|---------------------------------------------------------------|-----------------|
| Resultados para **todos os municípios do Maranhão**           | 8               |
| Consultar e apresentar **separadamente 1º e 2º turno**        | 6 e 7           |
| **Indicar claramente os eleitos**                             | 9               |
| Corrigir problemas e melhorar legibilidade, organização, mensagens de erro e manutenção | 1 a 6 |

---

## 2. O que a API do TSE oferece (verificado)

Estes fatos foram conferidos nos arquivos públicos do TSE e justificam as escolhas dos passos 7, 8 e 9.

| Necessidade              | Onde está                                                                                              | Observação |
|--------------------------|--------------------------------------------------------------------------------------------------------|------------|
| Lista de municípios      | `{BASE}/ele2026/6259/config/mun-e006259-cm.json` → `.abr[] \| select(.cd == "ma") \| .mu[]`              | 217 municípios do MA, com código (`cd`) e nome (`nm`) |
| Códigos do 2º turno      | `{BASE}/comum/config/ele-c.json` → campo `cdt2` de cada eleição                                         | federal `6257` → `6258`; estadual `6259` → `6260` |
| 2º turno no MA           | Presidente (`6258`) tem dados. Governador (`6260`) responde **HTTP 404**                                | o governador do MA foi eleito no 1º turno; o script precisa tratar "sem dados" sem abortar |
| Situação do candidato    | campo `st` do candidato: `Eleito`, `Não eleito`, `2º turno`, `Eleito por QP`, `Eleito por média`, `Suplente` | |
| Situação dos deputados   | no arquivo **do município** o `st` dos deputados vem **vazio**. Só o arquivo **da UF** (`ma-c0006-e006259-u.json`) traz o resultado | eleição proporcional é apurada no estado inteiro |
| Candidato com voto anulado | campo `dvt`: `Válido` ou `Anulado sub judice`                                                          | ex.: ROBERTO ROCHA (Governador) |

---

## 3. Diagnóstico: o que precisa de correção

A lista completa, com linhas e efeitos, está na seção 11 do [DOCUMENTACAO.md](DOCUMENTACAO.md). A tabela abaixo mostra os itens que este plano resolve e em qual passo.

| Problema no código atual                                                          | Linhas atuais | Passo |
|-----------------------------------------------------------------------------------|---------------|:-----:|
| Comentário sem relação com o código ("Fizemos o fark...")                          | 16-20         | 1     |
| Nomes com acento desalinham a tabela (o `printf` do Bash conta bytes)              | 65-67         | 2     |
| Código de eleição com zero à esquerda é lido como octal (`0544` → `000356`; `06259` → erro) | 87    | 3     |
| `NO_COLOR` definida mas vazia também desliga a cor (o padrão no-color.org diz que não deveria) | 38 | 4     |
| Laço principal com variáveis globais e sem função, o que dificulta evoluir o script | 83-113       | 5     |
| Erro em **um** cargo encerra o script inteiro                                      | 90-96         | 6     |
| HTTP 404 é repetido 3 vezes por causa de `--retry-all-errors`                       | 91            | 6     |
| Falha no `jq` de extração sai com código 5 e sem a mensagem `Erro:`                 | 99-110        | 6     |
| Só existe o 1º turno                                                              | 12-13         | 7     |
| Só um município fixo (`07242`) e sem mostrar o nome dele                           | 10            | 8     |
| Não informa quem foi eleito; candidatos "Anulado sub judice" aparecem como válidos | 104           | 9     |

---

## 4. Passos de implementação

Sugestão de pair programming: **alternem Driver e Navigator a cada passo**. Quem é Navigator confere o diff, roda o teste do passo e só então o commit é feito.

Antes de começar:

```bash
git checkout -b melhoria-xp
```

### Passo 1 — Remover comentário sem relação com o código

**Problema:** as linhas 16-20 descrevem o fluxo do Git ("Fizemos o fark…"), não o script.
**Mudança:**

```diff
--- buscador.sh
+++ buscador.sh
@@ -15,8 +15,2 @@
 
-##########################
-# - Fizemos o fark;
-# - Fizemos o clone;
-# - E vamos fazer o commit;
-###########################
-
 die() { printf 'Erro: %s\n' "$*" >&2; exit 1; }
```

**Teste:** `./buscador.sh` mostra a mesma saída de antes.
**Commit:** `chore: remove comentário sem relação com o script`

---

### Passo 2 — Alinhar nomes com acento na tabela

**Problema:** `${#name}` conta caracteres, mas a largura do `printf` do Bash conta **bytes**. "CAMARÃO" tem 7 caracteres e 8 bytes, então a linha fica um espaço mais curta:

```text
| FELIPE CAMARÃO |     13 |  1087 |     ← antes
| FELIPE CAMARÃO  |     13 |  1087 |    ← depois
```

**Mudança:** uma função `pad_right` completa o nome com espaços contando caracteres. O `printf` passa a receber o nome já preenchido (`%s`).

```diff
--- buscador.sh
+++ buscador.sh
@@ -40,2 +40,5 @@
 
+# Completa com espaços contando caracteres; o printf do Bash conta bytes e desalinha nomes com acento.
+pad_right() { printf -v "$1" '%s%*s' "$2" $(( $3 - ${#2} )) ''; }
+
 print_table() {
@@ -57,6 +60,7 @@
     IFS=$'\t' read -r name number votes <<<"$row"
+    pad_right name "$name" "$name_width"
     if $use_color; then
-      printf '| \033[36m%-*s\033[0m | %*s | \033[32m%*s\033[0m |\n' "$name_width" "$name" "$number_width" "$number" "$votes_width" "$votes"
+      printf '| \033[36m%s\033[0m | %*s | \033[32m%*s\033[0m |\n' "$name" "$number_width" "$number" "$votes_width" "$votes"
     else
-      printf '| %-*s | %*s | %*s |\n' "$name_width" "$name" "$number_width" "$number" "$votes_width" "$votes"
+      printf '| %s | %*s | %*s |\n' "$name" "$number_width" "$number" "$votes_width" "$votes"
     fi
```

**Teste:** `TSE_RESULTS_LIMIT=5 ./buscador.sh` mostra as linhas de Governador alinhadas (FELIPE CAMARÃO, ANDRÉ LUIS).
**Commit:** `fix: alinha nomes acentuados na tabela`

---

### Passo 3 — Ler códigos de eleição sempre em base 10

**Problema:** `printf '%06d' 0544` interpreta o valor como octal e imprime `000356`. Com `06259` o script morre com "número octal inválido". A validação (`^[0-9]+$`) aceita esses valores.
**Mudança:** normalizar os códigos uma vez, logo após a validação.

```diff
--- buscador.sh
+++ buscador.sh
@@ -26,2 +26,5 @@
 UF="${UF,,}"
+# Base 10 explícita: sem isso, "0544" seria lido como octal.
+FEDERAL_ELECTION=$((10#$FEDERAL_ELECTION))
+STATE_ELECTION=$((10#$STATE_ELECTION))
 BASE_URL="${BASE_URL%/}"
```

**Teste:** `TSE_RESULTS_STATE_ELECTION=06259 ./buscador.sh` funciona igual ao padrão. Antes: `printf: 06259: número octal inválido`.
**Commit:** `fix: trata códigos de eleição com zero à esquerda como decimais`

---

### Passo 4 — `NO_COLOR` vazia não deve desligar a cor

**Problema:** `[[ ! -v NO_COLOR ]]` considera `NO_COLOR=` (vazia) como "definida". Pelo padrão no-color.org, só um valor **não vazio** desliga a cor.

```diff
--- buscador.sh
+++ buscador.sh
@@ -34,3 +34,3 @@
 use_color=false
-if [[ "$COLOR_MODE" == always ]] || { [[ "$COLOR_MODE" == auto && -t 1 && "${TERM:-dumb}" != dumb ]] && [[ ! -v NO_COLOR ]]; }; then
+if [[ "$COLOR_MODE" == always ]] || { [[ "$COLOR_MODE" == auto && -t 1 && "${TERM:-dumb}" != dumb ]] && [[ -z "${NO_COLOR:-}" ]]; }; then
   use_color=true
```

**Teste:** num terminal, `NO_COLOR= ./buscador.sh` sai colorido e `NO_COLOR=1 ./buscador.sh` sai sem cor.
**Commit:** `fix: respeita NO_COLOR apenas quando não vazia`

---

### Passo 5 — Mover o corpo do laço para a função `show_cargo`

**Problema:** o laço principal tem 30 linhas e usa variáveis globais (`election`, `file`, `url`, `rows`...). Os passos 6 a 9 precisam de um lugar para `return` e de parâmetros (turno, município).
**Mudança:** refatoração **sem mudar o comportamento**. O corpo do laço continua igual (já tinha a indentação certa), só passa a ficar dentro da função, com variáveis `local`.

```diff
--- buscador.sh
+++ buscador.sh
@@ -83,3 +83,6 @@
 
-for cargo in "${CARGOS[@]}"; do
+# Consulta um cargo e imprime sua tabela.
+show_cargo() {
+  local cargo="$1" election cargo_padded election_padded url file rows_file cargo_name
+  local -a rows
   election="$(election_for_cargo "$cargo")"
@@ -113,2 +116,6 @@
   print_table rows
-done
+}
+
+for cargo in "${CARGOS[@]}"; do
+  show_cargo "$cargo"
+done
```

**Teste:** a saída deve ser **idêntica** à do passo 4:

```bash
diff <(git show HEAD:buscador.sh | bash) <(./buscador.sh) && echo "sem mudança"
```

**Commit:** `refactor: extrai a consulta de um cargo para show_cargo`

---

### Passo 6 — Um cargo com erro não derruba os outros

**Problema:**
- Qualquer `die` dentro do laço encerra o script, e os cargos seguintes somem.
- No 2º turno isso é o caso **normal**: o TSE responde 404 para Governador do MA.
- `--retry-all-errors` repete até um 404 três vezes.
- Uma falha do `jq` de extração sai com código 5 e sem `Erro:`.

**Mudança:**
- `warn` escreve avisos e `fail` conta falhas.
- `fetch_json` separa os três casos: **ok**, **sem dados** (403/404) e **falha**.
- `show_cargo` usa `return` em vez de `die`.
- Ao final, se houve falha real, o script sai com código 1 e um resumo.
- O `--retry 3` continua repetindo erros temporários (timeout, 5xx, 429), mas não repete 404.

```diff
--- buscador.sh
+++ buscador.sh
@@ -16,2 +16,5 @@
 die() { printf 'Erro: %s\n' "$*" >&2; exit 1; }
+warn() { printf 'Aviso: %s\n' "$*" >&2; }
+# Registra uma falha sem interromper os demais cargos.
+fail() { warn "$*"; failures=$((failures + 1)); }
 command -v curl >/dev/null || die "curl não encontrado"
@@ -30,2 +33,3 @@
 BASE_URL="${BASE_URL%/}"
+failures=0
 tmp_dir="$(mktemp -d)"
@@ -83,5 +87,18 @@
 
+# Baixa a URL para o arquivo. Retorna 0 (ok), 2 (TSE ainda não tem o arquivo) ou 1 (falha).
+fetch_json() {
+  local url="$1" output="$2" http_code
+  http_code="$(curl --silent --show-error --location \
+    --retry 3 --connect-timeout 10 --max-time 30 \
+    --output "$output" --write-out '%{http_code}' "$url")" || return 1
+  case "$http_code" in
+    200) return 0 ;;
+    403|404) return 2 ;;
+    *) return 1 ;;
+  esac
+}
+
 # Consulta um cargo e imprime sua tabela.
 show_cargo() {
-  local cargo="$1" election cargo_padded election_padded url file rows_file cargo_name
+  local cargo="$1" election cargo_padded election_padded url file rows_file cargo_name status=0
   local -a rows
@@ -93,9 +110,16 @@
 
-  curl --fail --silent --show-error --location \
-    --retry 3 --retry-all-errors --connect-timeout 10 --max-time 30 \
-    --output "$file" "$url" || die "falha ao consultar o cargo $cargo"
-  jq -e '.carg | type == "array"' "$file" >/dev/null || die "resposta inválida para o cargo $cargo"
-
-  cargo_name="$(jq -r --arg cargo "$cargo" '.carg[] | select(.cd == $cargo) | .nmn' "$file" | head -n 1)"
-  [[ -n "$cargo_name" ]] || die "cargo $cargo ausente na resposta"
+  fetch_json "$url" "$file" || status=$?
+  case "$status" in
+    0) ;;
+    2) warn "o TSE não tem dados do cargo $cargo para esta consulta"; return 0 ;;
+    *) fail "falha ao consultar o cargo $cargo ($url)"; return 0 ;;
+  esac
+  if ! jq -e '.carg | type == "array"' "$file" >/dev/null 2>&1; then
+    fail "resposta inválida para o cargo $cargo"; return 0
+  fi
+
+  cargo_name="$(jq -r --arg cargo "$cargo" 'first(.carg[] | select(.cd == $cargo) | .nmn) // empty' "$file")" || cargo_name=""
+  if [[ -z "$cargo_name" ]]; then
+    fail "cargo $cargo ausente na resposta"; return 0
+  fi
   printf '\n%s (cargo %s)\n' "$cargo_name" "$cargo"
@@ -113,3 +137,3 @@
     | [.nome, .numero, (.votos | tostring)] | @tsv
-  ' "$file" >"$rows_file"
+  ' "$file" >"$rows_file" || { fail "não foi possível ler os candidatos do cargo $cargo"; return 0; }
   mapfile -t rows <"$rows_file"
@@ -121 +145,3 @@
 done
+
+(( failures == 0 )) || die "$failures consulta(s) falharam; veja os avisos acima"
```

> **Cuidado ao revisar:** `show_cargo` é chamada **fora** de `if`/`||` de propósito. Dentro de uma função chamada como condição, o Bash desliga o `set -e`.

**Teste:**
- `TSE_RESULTS_STATE_ELECTION=6260 TSE_RESULTS_FEDERAL_ELECTION=6258 ./buscador.sh` mostra 4 avisos "o TSE não tem dados…" e a tabela de Presidente, com código de saída 0. Antes: `Erro: falha ao consultar o cargo 6` e nada mais.
- Com uma resposta inválida, o script mostra os outros cargos, termina com `Erro: 1 consulta(s) falharam…` e sai com código 1.

**Commit:** `fix: continua nos demais cargos quando um falha e trata 404 como sem dados`

---

### Passo 7 — Consultar 1º e 2º turno separadamente (requisito)

**Mudança:**
- Nova variável `TSE_RESULTS_TURN`, que aceita `1`, `2` ou `ambos` (padrão `ambos`).
- Códigos do 2º turno em `TSE_RESULTS_FEDERAL_ELECTION_T2` (padrão `6258`) e `TSE_RESULTS_STATE_ELECTION_T2` (padrão `6260`). Esses valores vêm do campo `cdt2` do `ele-c.json`.
- No 2º turno só se consulta Governador e Presidente, os únicos cargos que podem ter 2º turno.
- Cada turno é impresso em uma seção própria (`===== 1º turno =====`).
- `election_for_cargo` passa a receber o turno.

```diff
--- buscador.sh
+++ buscador.sh
@@ -5,2 +5,4 @@
 readonly -a CARGOS=(6 7 5 3 1)
+# Só Governador e Presidente podem ter 2º turno.
+readonly -a CARGOS_T2=(3 1)
 
@@ -13,2 +15,5 @@
 STATE_ELECTION="${TSE_RESULTS_STATE_ELECTION:-6259}"
+FEDERAL_ELECTION_T2="${TSE_RESULTS_FEDERAL_ELECTION_T2:-6258}"
+STATE_ELECTION_T2="${TSE_RESULTS_STATE_ELECTION_T2:-6260}"
+TURN="${TSE_RESULTS_TURN:-ambos}"
 COLOR_MODE="${TSE_RESULTS_COLOR:-auto}"
@@ -26,2 +31,4 @@
 [[ "$FEDERAL_ELECTION" =~ ^[0-9]+$ && "$STATE_ELECTION" =~ ^[0-9]+$ ]] || die "códigos de eleição devem ser numéricos"
+[[ "$FEDERAL_ELECTION_T2" =~ ^[0-9]+$ && "$STATE_ELECTION_T2" =~ ^[0-9]+$ ]] || die "códigos de eleição do 2º turno devem ser numéricos"
+[[ "$TURN" =~ ^(1|2|ambos)$ ]] || die "TSE_RESULTS_TURN deve ser 1, 2 ou ambos"
 [[ "$COLOR_MODE" =~ ^(auto|always|never)$ ]] || die "TSE_RESULTS_COLOR deve ser auto, always ou never"
@@ -32,2 +39,4 @@
 STATE_ELECTION=$((10#$STATE_ELECTION))
+FEDERAL_ELECTION_T2=$((10#$FEDERAL_ELECTION_T2))
+STATE_ELECTION_T2=$((10#$STATE_ELECTION_T2))
 BASE_URL="${BASE_URL%/}"
@@ -79,7 +88,10 @@
 
+# Recebe cargo e turno; devolve o código da eleição.
 election_for_cargo() {
-  case "$1" in
-    1) printf '%s' "$FEDERAL_ELECTION" ;;
-    3|5|6|7) printf '%s' "$STATE_ELECTION" ;;
-    *) die "cargo não suportado: $1" ;;
+  case "$1-$2" in
+    1-1) printf '%s' "$FEDERAL_ELECTION" ;;
+    1-2) printf '%s' "$FEDERAL_ELECTION_T2" ;;
+    [3567]-1) printf '%s' "$STATE_ELECTION" ;;
+    3-2) printf '%s' "$STATE_ELECTION_T2" ;;
+    *) die "cargo $1 não suportado no ${2}º turno" ;;
   esac
@@ -100,7 +112,7 @@
 
-# Consulta um cargo e imprime sua tabela.
+# Consulta um cargo em um turno e imprime sua tabela.
 show_cargo() {
-  local cargo="$1" election cargo_padded election_padded url file rows_file cargo_name status=0
+  local cargo="$1" turn="$2" election cargo_padded election_padded url file rows_file cargo_name status=0
   local -a rows
-  election="$(election_for_cargo "$cargo")"
+  election="$(election_for_cargo "$cargo" "$turn")"
   file="$tmp_dir/cargo-$cargo.json"
@@ -113,3 +125,3 @@
     0) ;;
-    2) warn "o TSE não tem dados do cargo $cargo para esta consulta"; return 0 ;;
+    2) warn "o TSE não tem dados do cargo $cargo no ${turn}º turno"; return 0 ;;
     *) fail "falha ao consultar o cargo $cargo ($url)"; return 0 ;;
@@ -142,4 +154,13 @@
 
-for cargo in "${CARGOS[@]}"; do
-  show_cargo "$cargo"
+case "$TURN" in
+  ambos) turns=(1 2) ;;
+  *) turns=("$TURN") ;;
+esac
+
+for turn in "${turns[@]}"; do
+  printf '\n===== %sº turno =====\n' "$turn"
+  if (( turn == 1 )); then cargos=("${CARGOS[@]}"); else cargos=("${CARGOS_T2[@]}"); fi
+  for cargo in "${cargos[@]}"; do
+    show_cargo "$cargo" "$turn"
+  done
 done
```

**Teste:**
- `TSE_RESULTS_TURN=1 ./buscador.sh` mostra o mesmo conteúdo do passo 6, com o título da seção.
- `TSE_RESULTS_TURN=2 ./buscador.sh` mostra o aviso para Governador e a tabela do 2º turno de Presidente (LULA 5829 × FLAVIO BOLSONARO 3885 em Davinópolis).
- `TSE_RESULTS_TURN=3 ./buscador.sh` mostra `Erro: TSE_RESULTS_TURN deve ser 1, 2 ou ambos`.

**Commit:** `feat: permite consultar 1º e 2º turno separadamente`

---

### Passo 8 — Todos os municípios do Maranhão (requisito)

**Mudança:**
- `TSE_RESULTS_MUNICIPALITY` passa a ter o padrão `todos`. Um código de 5 dígitos continua funcionando para consultar uma cidade só.
- A lista de municípios vem do arquivo de configuração do TSE (`mun-e006259-cm.json`): 217 municípios no MA. O código **e o nome** de cada um aparecem no título.
- Um código que não existe na UF gera um erro claro.
- O 404 de um par turno/cargo é lembrado em `missing`. Assim o script não pergunta ao TSE 217 vezes pelo 2º turno de Governador, que não existe.

```diff
--- buscador.sh
+++ buscador.sh
@@ -11,3 +11,3 @@
 UF="${TSE_RESULTS_UF:-ma}"
-MUNICIPIO="${TSE_RESULTS_MUNICIPALITY:-07242}"
+MUNICIPIO="${TSE_RESULTS_MUNICIPALITY:-todos}"
 LIMIT="${TSE_RESULTS_LIMIT:-20}"
@@ -27,3 +27,3 @@
 [[ "$UF" =~ ^[[:alpha:]]{2}$ ]] || die "TSE_RESULTS_UF deve conter duas letras"
-[[ "$MUNICIPIO" =~ ^[0-9]{5}$ ]] || die "TSE_RESULTS_MUNICIPALITY deve conter cinco dígitos"
+[[ "$MUNICIPIO" =~ ^([0-9]{5}|todos)$ ]] || die "TSE_RESULTS_MUNICIPALITY deve ser um código de cinco dígitos ou todos"
 [[ "$YEAR" =~ ^[0-9]{4}$ ]] || die "TSE_RESULTS_YEAR deve conter quatro dígitos"
@@ -43,2 +43,4 @@
 failures=0
+# Pares "turno-cargo" que o TSE respondeu não existir; evita repetir a consulta em cada município.
+declare -A missing=()
 tmp_dir="$(mktemp -d)"
@@ -112,5 +114,15 @@
 
-# Consulta um cargo em um turno e imprime sua tabela.
+# Grava em stdout "código<TAB>nome" de cada município da UF, usando a configuração do TSE.
+load_municipalities() {
+  local election_padded file="$tmp_dir/municipios.json"
+  printf -v election_padded '%06d' "$STATE_ELECTION"
+  fetch_json "$BASE_URL/ele$YEAR/$STATE_ELECTION/config/mun-e${election_padded}-cm.json" "$file" \
+    || die "não foi possível obter a lista de municípios"
+  jq -r --arg uf "$UF" '.abr[] | select(.cd == $uf) | .mu[] | [.cd, .nm] | @tsv' "$file" \
+    || die "lista de municípios inválida"
+}
+
+# Consulta um cargo em um turno, em um município, e imprime sua tabela.
 show_cargo() {
-  local cargo="$1" turn="$2" election cargo_padded election_padded url file rows_file cargo_name status=0
+  local municipio="$1" cargo="$2" turn="$3" election cargo_padded election_padded url file rows_file cargo_name status=0
   local -a rows
@@ -120,3 +132,4 @@
   printf -v election_padded '%06d' "$election"
-  url="$BASE_URL/ele$YEAR/$election/dados/$UF/${UF}${MUNICIPIO}-c${cargo_padded}-e${election_padded}-u.json"
+  [[ -v "missing[$turn-$cargo]" ]] && return 0
+  url="$BASE_URL/ele$YEAR/$election/dados/$UF/${UF}${municipio}-c${cargo_padded}-e${election_padded}-u.json"
 
@@ -125,3 +138,3 @@
     0) ;;
-    2) warn "o TSE não tem dados do cargo $cargo no ${turn}º turno"; return 0 ;;
+    2) warn "o TSE não tem dados do cargo $cargo no ${turn}º turno"; missing[$turn-$cargo]=1; return 0 ;;
     *) fail "falha ao consultar o cargo $cargo ($url)"; return 0 ;;
@@ -159,7 +172,19 @@
 
-for turn in "${turns[@]}"; do
-  printf '\n===== %sº turno =====\n' "$turn"
-  if (( turn == 1 )); then cargos=("${CARGOS[@]}"); else cargos=("${CARGOS_T2[@]}"); fi
-  for cargo in "${cargos[@]}"; do
-    show_cargo "$cargo" "$turn"
+load_municipalities >"$tmp_dir/municipios.tsv"
+if [[ "$MUNICIPIO" != todos ]]; then
+  grep "^$MUNICIPIO"$'\t' "$tmp_dir/municipios.tsv" >"$tmp_dir/selecionados.tsv" \
+    || die "município $MUNICIPIO não encontrado em ${UF^^}"
+  mv "$tmp_dir/selecionados.tsv" "$tmp_dir/municipios.tsv"
+fi
+mapfile -t municipalities <"$tmp_dir/municipios.tsv"
+
+for entry in "${municipalities[@]}"; do
+  IFS=$'\t' read -r municipio municipio_name <<<"$entry"
+  printf '\n######## %s (%s) - %s ########\n' "$municipio_name" "$municipio" "${UF^^}"
+  for turn in "${turns[@]}"; do
+    printf '\n===== %sº turno =====\n' "$turn"
+    if (( turn == 1 )); then cargos=("${CARGOS[@]}"); else cargos=("${CARGOS_T2[@]}"); fi
+    for cargo in "${cargos[@]}"; do
+      show_cargo "$municipio" "$cargo" "$turn"
+    done
   done
```

**Teste:**
- `TSE_RESULTS_MUNICIPALITY=09210 ./buscador.sh` mostra `######## SÃO LUÍS (09210) - MA ########`.
- `TSE_RESULTS_MUNICIPALITY=99999 ./buscador.sh` mostra `Erro: município 99999 não encontrado em MA`.
- `./buscador.sh` percorre os 217 municípios (veja o tempo na seção 6).

**Commit:** `feat: consulta todos os municípios da UF e mostra o nome do município`

---

### Passo 9 — Indicar os eleitos (requisito)

**Mudança:**
- Nova coluna **SITUAÇÃO** na tabela, com o valor do campo `st` do TSE: `Eleito`, `Eleito por QP`, `Eleito por média`, `Suplente`, `2º turno`, `Não eleito`.
- A situação vem do **arquivo da UF**, porque no arquivo do município ela está vazia para deputados. Esse arquivo é baixado **uma vez por cargo e turno** e reaproveitado nos 217 municípios.
- Candidatos com voto anulado mostram `Anulado sub judice` em vez da situação.
- Com cor, a situação que começa com "Eleito" fica em **amarelo negrito**. Sem cor, o texto da coluna já identifica o eleito.
- A coluna é preenchida com `pad_right` (passo 2), porque "SITUAÇÃO" e "Eleito por média" têm acento.

```diff
--- buscador.sh
+++ buscador.sh
@@ -54,4 +54,4 @@
 print_rule() {
-  local name_width="$1" number_width="$2" votes_width="$3"
-  printf '+-%*s-+-%*s-+-%*s-+\n' "$name_width" '' "$number_width" '' "$votes_width" '' | tr ' ' '-'
+  local name_width="$1" number_width="$2" votes_width="$3" status_width="$4"
+  printf '+-%*s-+-%*s-+-%*s-+-%*s-+\n' "$name_width" '' "$number_width" '' "$votes_width" '' "$status_width" '' | tr ' ' '-'
 }
@@ -63,7 +63,7 @@
   local -n table_rows="$1"
-  local name_width=${#name_header} number_width=${#number_header} votes_width=${#votes_header}
-  local row name number votes
+  local name_width=${#name_header} number_width=${#number_header} votes_width=${#votes_header} status_width=${#status_header}
+  local row name number votes status status_title status_color
 
   for row in "${table_rows[@]}"; do
-    IFS=$'\t' read -r name number votes <<<"$row"
+    IFS=$'\t' read -r name number votes status <<<"$row"
     (( ${#name} > name_width )) && name_width=${#name}
@@ -71,20 +71,25 @@
     (( ${#votes} > votes_width )) && votes_width=${#votes}
+    (( ${#status} > status_width )) && status_width=${#status}
   done
 
-  print_rule "$name_width" "$number_width" "$votes_width"
-  printf '| %-*s | %*s | %*s |\n' "$name_width" "$name_header" "$number_width" "$number_header" "$votes_width" "$votes_header"
-  print_rule "$name_width" "$number_width" "$votes_width"
+  pad_right status_title "$status_header" "$status_width"
+  print_rule "$name_width" "$number_width" "$votes_width" "$status_width"
+  printf '| %-*s | %*s | %*s | %s |\n' "$name_width" "$name_header" "$number_width" "$number_header" "$votes_width" "$votes_header" "$status_title"
+  print_rule "$name_width" "$number_width" "$votes_width" "$status_width"
   for row in "${table_rows[@]}"; do
-    IFS=$'\t' read -r name number votes <<<"$row"
+    IFS=$'\t' read -r name number votes status <<<"$row"
     pad_right name "$name" "$name_width"
+    status_color='\033[0m'
+    [[ "$status" == Eleito* ]] && status_color='\033[1;33m'
+    pad_right status "$status" "$status_width"
     if $use_color; then
-      printf '| \033[36m%s\033[0m | %*s | \033[32m%*s\033[0m |\n' "$name" "$number_width" "$number" "$votes_width" "$votes"
+      printf '| \033[36m%s\033[0m | %*s | \033[32m%*s\033[0m | %b%s\033[0m |\n' "$name" "$number_width" "$number" "$votes_width" "$votes" "$status_color" "$status"
     else
-      printf '| %s | %*s | %*s |\n' "$name" "$number_width" "$number" "$votes_width" "$votes"
+      printf '| %s | %*s | %*s | %s |\n' "$name" "$number_width" "$number" "$votes_width" "$votes" "$status"
     fi
   done
-  print_rule "$name_width" "$number_width" "$votes_width"
+  print_rule "$name_width" "$number_width" "$votes_width" "$status_width"
 }
 
-readonly name_header="NOME" number_header="NÚMERO" votes_header="VOTOS"
+readonly name_header="NOME" number_header="NÚMERO" votes_header="VOTOS" status_header="SITUAÇÃO"
 
@@ -127,2 +132,3 @@
   local municipio="$1" cargo="$2" turn="$3" election cargo_padded election_padded url file rows_file cargo_name status=0
+  local status_file="$tmp_dir/situacao-t$turn-c$cargo.json"
   local -a rows
@@ -145,2 +151,8 @@
 
+  # A situação dos deputados (eleito, suplente...) só vem no arquivo da UF; baixado uma vez por cargo e turno.
+  if [[ ! -s "$status_file" ]]; then
+    fetch_json "$BASE_URL/ele$YEAR/$election/dados/$UF/${UF}-c${cargo_padded}-e${election_padded}-u.json" "$status_file" \
+      || { warn "situação dos candidatos do cargo $cargo indisponível"; printf '{}' >"$status_file"; }
+  fi
+
   cargo_name="$(jq -r --arg cargo "$cargo" 'first(.carg[] | select(.cd == $cargo) | .nmn) // empty' "$file")" || cargo_name=""
@@ -151,4 +163,5 @@
   rows_file="$tmp_dir/cargo-$cargo.tsv"
-  jq -r --arg cargo "$cargo" --argjson limit "$LIMIT" '
-    [
+  jq -r --arg cargo "$cargo" --argjson limit "$LIMIT" --slurpfile uf "$status_file" '
+    ($uf[0] | [.. | objects | .cand? // empty | .[] | select(.n != null) | {key: .n, value: .st}] | from_entries) as $status
+    | [
       .carg[] | select(.cd == $cargo)
@@ -156,3 +169,4 @@
       | select((.nmu // "") != "" and (.n // "") != "")
-      | { nome: (.nmu | gsub("[[:cntrl:]]"; " ")), numero: .n, votos: ((.vap // "0") | tonumber) }
+      | { nome: (.nmu | gsub("[[:cntrl:]]"; " ")), numero: .n, votos: ((.vap // "0") | tonumber),
+          situacao: (if (.dvt // "") | startswith("Anulado") then .dvt else ($status[.n] // .st // "") end) }
     ]
@@ -161,3 +175,3 @@
     | .[:$limit][]
-    | [.nome, .numero, (.votos | tostring)] | @tsv
+    | [.nome, .numero, (.votos | tostring), (if .situacao == "" then "-" else .situacao end)] | @tsv
   ' "$file" >"$rows_file" || { fail "não foi possível ler os candidatos do cargo $cargo"; return 0; }
```

**Teste:** `TSE_RESULTS_MUNICIPALITY=07242 TSE_RESULTS_LIMIT=5 ./buscador.sh` (trecho):

```text
Governador (cargo 3)
+-----------------+--------+-------+--------------------+
| NOME            | NÚMERO | VOTOS | SITUAÇÃO           |
+-----------------+--------+-------+--------------------+
| ORLEANS BRANDÃO |     15 |  4085 | Não eleito         |
| EDUARDO BRAIDE  |     55 |  3992 | Eleito             |
| FELIPE CAMARÃO  |     13 |  1087 | Não eleito         |
| ROBERTO ROCHA   |     28 |   156 | Anulado sub judice |
| ANDRÉ LUIS      |     14 |    39 | Não eleito         |
+-----------------+--------+-------+--------------------+

===== 2º turno =====
Aviso: o TSE não tem dados do cargo 3 no 2º turno
Presidente (cargo 1)
+------------------+--------+-------+------------+
| NOME             | NÚMERO | VOTOS | SITUAÇÃO   |
+------------------+--------+-------+------------+
| LULA             |     13 |  5829 | Eleito     |
| FLAVIO BOLSONARO |     22 |  3885 | Não eleito |
+------------------+--------+-------+------------+
```

**Commit:** `feat: mostra a situação de cada candidato e destaca os eleitos`

---

### Passo 10 — README.md

O enunciado (etapa 9) pede que o README contenha:
- objetivo;
- pré-requisitos;
- como executar;
- melhorias e correções feitas (a seção 3 deste documento);
- exemplos de uso;
- divisão do pair programming (quem foi Driver/Navigator em cada passo);
- evidências de validação (a seção 6).

**Commit:** `docs: atualiza README com uso, melhorias e registro do pair programming`

---

## 5. Novas variáveis de ambiente (resumo)

| Variável                          | Padrão  | Valores                     | Passo |
|-----------------------------------|---------|-----------------------------|:-----:|
| `TSE_RESULTS_TURN`                | `ambos` | `1`, `2`, `ambos`           | 7     |
| `TSE_RESULTS_FEDERAL_ELECTION_T2` | `6258`  | só dígitos                  | 7     |
| `TSE_RESULTS_STATE_ELECTION_T2`   | `6260`  | só dígitos                  | 7     |
| `TSE_RESULTS_MUNICIPALITY`        | `todos` (antes `07242`) | `todos` ou 5 dígitos | 8 |

Exemplos:

```bash
./buscador.sh                                              # todos os municípios, 1º e 2º turno
TSE_RESULTS_MUNICIPALITY=09210 ./buscador.sh               # só São Luís
TSE_RESULTS_TURN=2 TSE_RESULTS_LIMIT=5 ./buscador.sh       # só o 2º turno, 5 por cargo
TSE_RESULTS_COLOR=never ./buscador.sh > resultados.txt     # arquivo sem cores
```

---

## 6. Validação (cenários testados)

Resultados obtidos com a versão do passo 9, contra a API do TSE, em 27/10/2026:

| Cenário                                   | Comando                                                        | Resultado |
|-------------------------------------------|----------------------------------------------------------------|-----------|
| Dependência ausente                       | `PATH=/usr/bin:/bin ./buscador.sh` (sem jq)                     | `Erro: jq não encontrado`, código 1 |
| UF inválida                               | `TSE_RESULTS_UF=m1`                                            | `Erro: TSE_RESULTS_UF deve conter duas letras` |
| Município inválido                        | `TSE_RESULTS_MUNICIPALITY=123`                                 | `Erro: … deve ser um código de cinco dígitos ou todos` |
| Município inexistente                     | `TSE_RESULTS_MUNICIPALITY=99999`                               | `Erro: município 99999 não encontrado em MA` |
| Limite inválido                           | `TSE_RESULTS_LIMIT=0`                                          | `Erro: TSE_RESULTS_LIMIT deve ser um inteiro positivo` |
| Turno inválido                            | `TSE_RESULTS_TURN=3`                                           | `Erro: TSE_RESULTS_TURN deve ser 1, 2 ou ambos` |
| Cor inválida                              | `TSE_RESULTS_COLOR=sim`                                        | `Erro: TSE_RESULTS_COLOR deve ser auto, always ou never` |
| Resposta inválida (HTML no lugar do JSON) | servidor local com o arquivo de Governador corrompido           | os outros 4 cargos são exibidos; `Aviso: resposta inválida para o cargo 3`; `Erro: 1 consulta(s) falharam…`; código 1 |
| 2º turno sem dados                        | `TSE_RESULTS_TURN=2`                                           | `Aviso: o TSE não tem dados do cargo 3 no 2º turno` + tabela de Presidente; código 0 |
| Código de eleição com zero à esquerda     | `TSE_RESULTS_STATE_ELECTION=06259`                             | funciona (antes: "número octal inválido") |
| Acentos                                   | Governador em Davinópolis                                      | tabela alinhada |
| Eleitos                                   | Davinópolis, 1º e 2º turno                                     | coluna SITUAÇÃO correta para os 5 cargos, inclusive deputados |
| Cor                                       | `TSE_RESULTS_COLOR=always`                                     | situação "Eleito" em `\033[1;33m` |
| Regressão do passo 5                      | `diff` da saída antes/depois                                   | idêntica |
| **Todos os municípios**                   | `TSE_RESULTS_LIMIT=3 ./buscador.sh`                            | execução interrompida após 15 municípios (87 tabelas) em 219 s, sem falhas; o aviso de Governador no 2º turno apareceu **uma única vez**. Estimativa para os 217: ≈ 55 min nesta rede (motivo do item 8 da seção 7) |

---

## 7. Outras melhorias possíveis (fora do escopo mínimo)

Não são exigidas pelo enunciado. Ficam como próximos ciclos, se houver tempo. Cada uma continua sendo uma mudança pequena no código existente.

| #  | Melhoria                                                                 | Onde               | Por quê |
|:--:|--------------------------------------------------------------------------|--------------------|---------|
| 1  | Coluna `%` com o campo `pvap` (percentual de votos válidos)              | jq de extração     | o dado já vem no JSON e ajuda a comparar municípios |
| 2  | Mostrar data/hora dos dados (`dg`/`hg`) e `% seções totalizadas` (`s.pst`) no título | `show_cargo` | saber se a apuração terminou |
| 3  | Ordenar o desempate por número como **número** (`.numero \| tonumber`)    | `sort_by`          | hoje `"10"` vem antes de `"9"` |
| 4  | `--proto '=https'` no curl                                               | `fetch_json`       | impede `TSE_RESULTS_BASE_URL=file:///…` de ler arquivos locais |
| 5  | Validar a UF com `^[a-zA-Z]{2}$` em vez de `[[:alpha:]]`                  | validação          | hoje `çã` passa |
| 6  | Remover `-E` de `set -Eeuo pipefail`, ou adicionar um `trap … ERR`       | linha 2            | sem `trap ERR` a opção não tem efeito |
| 7  | `--help` e argumentos de linha de comando (ex.: `-m 09210 -t 2`)          | início do script   | hoje só há variáveis de ambiente |
| 8  | Consultas em paralelo (`xargs -P` ou `curl --parallel`) ou cache em disco entre execuções | laço de municípios | a execução completa leva vários minutos |
| 9  | Verificação com `shellcheck buscador.sh` antes de cada commit            | —                  | feedback rápido (prática XP) |
| 10 | Mostrar o total do estado (arquivo `ma-c000N-…`, já baixado no passo 9)  | depois do laço     | visão geral do MA além de cada cidade |

---

## 8. Fluxo Git sugerido

```bash
git checkout -b melhoria-xp
# para cada passo: aplicar o diff → rodar o teste do passo → commit
git add buscador.sh && git commit -m "fix: alinha nomes acentuados na tabela"
...
git push -u origin melhoria-xp
# depois de validar: merge na main do fork e rodar ./buscador.sh mais uma vez
```

Sequência de commits proposta:

1. `chore: remove comentário sem relação com o script`
2. `fix: alinha nomes acentuados na tabela`
3. `fix: trata códigos de eleição com zero à esquerda como decimais`
4. `fix: respeita NO_COLOR apenas quando não vazia`
5. `refactor: extrai a consulta de um cargo para show_cargo`
6. `fix: continua nos demais cargos quando um falha e trata 404 como sem dados`
7. `feat: permite consultar 1º e 2º turno separadamente`
8. `feat: consulta todos os municípios da UF e mostra o nome do município`
9. `feat: mostra a situação de cada candidato e destaca os eleitos`
10. `docs: atualiza README com uso, melhorias e registro do pair programming`
