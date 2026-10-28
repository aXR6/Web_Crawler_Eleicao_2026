# Documentação — Web Crawler Eleição 2026

Script em Bash ([buscador.sh](buscador.sh)) que consulta os **resultados oficiais do TSE** de um município e mostra, no terminal, uma tabela com os candidatos mais votados de cada cargo.

---

## 1. Visão rápida

| Item          | Valor                                                       |
|---------------|-------------------------------------------------------------|
| Arquivo       | [buscador.sh](buscador.sh) (113 linhas)                     |
| Linguagem     | Bash                                                        |
| Fonte de dados| `https://resultados.tse.jus.br/oficial` (JSON público)      |
| Entrada       | Variáveis de ambiente (não aceita argumentos)               |
| Saída         | 5 tabelas no terminal (uma por cargo)                       |
| Padrão        | Município `07242` / MA, eleições de 2026, 1º turno          |

### Cargos consultados (nesta ordem)

| Ordem | Código | Cargo             | Eleição usada                  |
|:-----:|:------:|-------------------|--------------------------------|
| 1     | 6      | Deputado Federal  | estadual (`6259`)              |
| 2     | 7      | Deputado Estadual | estadual (`6259`)              |
| 3     | 5      | Senador           | estadual (`6259`)              |
| 4     | 3      | Governador        | estadual (`6259`)              |
| 5     | 1      | Presidente        | federal (`6257`)               |

---

## 2. Como executar

### Requisitos

| Ferramenta | Versão mínima | Motivo                                                       |
|------------|---------------|--------------------------------------------------------------|
| bash       | 4.4           | usa `local -n`, `${var,,}`, `mapfile`, arrays vazios com `set -u` |
| curl       | 7.71          | usa `--retry-all-errors`                                     |
| jq         | 1.5           | usa `--argjson`, `gsub`, `unique_by`                         |

Instalação no Ubuntu/Debian: `sudo apt install curl jq`

### Exemplos

```bash
./buscador.sh                                   # usa os valores padrão
TSE_RESULTS_LIMIT=5 ./buscador.sh               # só os 5 mais votados por cargo
TSE_RESULTS_COLOR=never ./buscador.sh > saida.txt   # sem cores, salvando em arquivo
TSE_RESULTS_UF=<uf> TSE_RESULTS_MUNICIPALITY=<código TSE> ./buscador.sh
```

---

## 3. Configuração (variáveis de ambiente)

Definidas em [buscador.sh:7-14](buscador.sh#L7-L14) e validadas em [buscador.sh:25-30](buscador.sh#L25-L30).

| Variável                       | Padrão                                  | Regra de validação                      | Para que serve                         |
|--------------------------------|-----------------------------------------|-----------------------------------------|----------------------------------------|
| `TSE_RESULTS_BASE_URL`         | `https://resultados.tse.jus.br/oficial` | nenhuma (só remove a `/` final)         | endereço base da API                   |
| `TSE_RESULTS_YEAR`             | `2026`                                  | 4 dígitos                               | ano da eleição                         |
| `TSE_RESULTS_UF`               | `ma`                                    | 2 letras (convertida para minúsculas)   | estado                                 |
| `TSE_RESULTS_MUNICIPALITY`     | `07242`                                 | 5 dígitos                               | código **TSE** do município (não é o do IBGE) |
| `TSE_RESULTS_LIMIT`            | `20`                                    | inteiro positivo, sem zero à esquerda   | máximo de candidatos por cargo         |
| `TSE_RESULTS_FEDERAL_ELECTION` | `6257`                                  | só dígitos                              | código da eleição federal (Presidente) |
| `TSE_RESULTS_STATE_ELECTION`   | `6259`                                  | só dígitos                              | código da eleição estadual (demais)    |
| `TSE_RESULTS_COLOR`            | `auto`                                  | `auto`, `always` ou `never`             | uso de cores                           |
| `NO_COLOR`                     | —                                       | —                                       | se existir, desliga a cor no modo `auto` |

**Regra da cor** ([buscador.sh:37-40](buscador.sh#L37-L40)): a cor é ligada se o modo for `always`, **ou** se o modo for `auto`, a saída for um terminal, `TERM` não for `dumb` e `NO_COLOR` não estiver definida.

---

## 4. Fluxo de execução

```text
 ┌──────────────────────────────────────────────┐
 │ 1. Lê as variáveis de ambiente      (L7-14)  │
 │ 2. Verifica se curl e jq existem    (L23-24) │
 │ 3. Valida os valores                (L25-30) │
 │ 4. UF minúscula, tira "/" da URL,            │
 │    cria pasta temporária + trap     (L32-35) │
 │ 5. Decide se usa cor                (L37-40) │
 └──────────────────────┬───────────────────────┘
                        ▼
 ┌──────────────────────────────────────────────┐
 │ 6. Para cada cargo (6, 7, 5, 3, 1): (L83-113)│
 │    a. escolhe o código da eleição            │
 │    b. monta a URL e baixa o JSON (curl)      │
 │    c. confere o JSON e lê o nome do cargo    │
 │    d. extrai/ordena/limita candidatos (jq)   │
 │    e. imprime a tabela                       │
 └──────────────────────┬───────────────────────┘
                        ▼
 ┌──────────────────────────────────────────────┐
 │ 7. Ao sair, apaga a pasta temporária         │
 └──────────────────────────────────────────────┘
```

> Qualquer erro em qualquer etapa **encerra o script inteiro**. Os cargos seguintes não são exibidos.

---

## 5. Funções

| Função               | Linhas                                  | Recebe                                   | Faz                                                  |
|----------------------|-----------------------------------------|------------------------------------------|------------------------------------------------------|
| `die`                | [L22](buscador.sh#L22)                  | mensagem                                 | escreve `Erro: <mensagem>` no stderr e sai com código 1 |
| `print_rule`         | [L42-45](buscador.sh#L42-L45)           | largura do nome, do número e dos votos   | imprime a linha separadora `+----+----+----+`        |
| `print_table`        | [L47-71](buscador.sh#L47-L71)           | **nome** de um array de linhas TSV       | calcula as larguras e imprime a tabela completa      |
| `election_for_cargo` | [L75-81](buscador.sh#L75-L81)           | código do cargo                          | devolve o código da eleição (federal ou estadual)    |

### `die`

- Uso: `die "mensagem"`.
- Usada nas verificações de dependência, de validação e de resposta da API.

### `print_rule`

- Gera espaços com `printf '%*s'` e troca todos por `-` com `tr`.
- Exemplo: `print_rule 4 6 5` → `+------+--------+-------+`

### `print_table`

1. Recebe o nome do array e o acessa por referência (`local -n table_rows`).
2. Começa com a largura dos cabeçalhos `NOME`, `NÚMERO`, `VOTOS` ([L73](buscador.sh#L73)).
3. Percorre as linhas e guarda o maior tamanho de cada coluna.
4. Imprime: separador → cabeçalho → separador → linhas → separador.
5. Alinhamento: nome à esquerda; número e votos à direita.
6. Com cor: nome em **ciano** (`\033[36m`) e votos em **verde** (`\033[32m`).

- Depende de variáveis globais: `name_header`, `number_header`, `votes_header` e `use_color`.

### `election_for_cargo`

| Cargo recebido   | Retorno                    |
|------------------|----------------------------|
| `1`              | `$FEDERAL_ELECTION`        |
| `3`, `5`, `6`, `7` | `$STATE_ELECTION`        |
| outro            | `die "cargo não suportado"` |

---

## 6. Requisição à API

### Formato da URL ([buscador.sh:88](buscador.sh#L88))

```text
{BASE_URL}/ele{ANO}/{ELEIÇÃO}/dados/{uf}/{uf}{MUNICÍPIO}-c{CARGO:4 dígitos}-e{ELEIÇÃO:6 dígitos}-u.json
```

### Exemplo (Governador, valores padrão)

```text
https://resultados.tse.jus.br/oficial/ele2026/6259/dados/ma/ma07242-c0003-e006259-u.json
```

### Opções do curl ([buscador.sh:90-92](buscador.sh#L90-L92))

| Opção                         | Efeito                                         |
|-------------------------------|------------------------------------------------|
| `--fail`                      | trata HTTP 4xx/5xx como erro                   |
| `--silent --show-error`       | sem barra de progresso, mas mostra erros       |
| `--location`                  | segue redirecionamentos                        |
| `--retry 3 --retry-all-errors`| tenta mais 3 vezes em qualquer falha           |
| `--connect-timeout 10`        | até 10 s para conectar                         |
| `--max-time 30`               | até 30 s por tentativa                         |

### Arquivos temporários (apagados ao sair)

| Arquivo                     | Conteúdo                         |
|-----------------------------|----------------------------------|
| `$tmp_dir/cargo-N.json`     | resposta bruta da API            |
| `$tmp_dir/cargo-N.tsv`      | linhas `nome⇥número⇥votos`       |

---

## 7. Dados do JSON

### Estrutura usada pelo script

```text
{
  "carg": [                       ← lista de cargos
    {
      "cd": "3",                  ← código do cargo (texto)
      "nmn": "Governador",        ← nome do cargo
      "agr": [                    ← agrupamentos (coligação/federação/isolado)
        { "par": [                ← partidos
            { "cand": [           ← candidatos
                { "nmu": "ORLEANS BRANDÃO",  ← nome de urna
                  "n":   "15",                ← número
                  "vap": "4085" }             ← votos apurados (texto)
```

### Campos que existem na resposta mas não são usados (significado deduzido dos dados)

| Campo        | Exemplo              | Significado provável                      |
|--------------|----------------------|-------------------------------------------|
| `cand.pvap`  | `"43,60"`            | percentual de votos válidos               |
| `cand.st`    | `"Eleito"`, `"2º turno"`, `"Não eleito"` | situação do candidato |
| `cand.e`     | `"s"` / `"n"`        | eleito?                                   |
| `cand.dvt`   | `"Válido"`, `"Anulado sub judice"` | destino do voto              |
| `cand.nm`    | nome completo        | nome civil                                |
| `dg` / `hg`  | `"05/10/2026"` / `"12:52:22"` | data/hora em que o arquivo foi gerado |
| `s.pst`      | `"100,00"`           | % de seções totalizadas                   |
| `e.c` / `e.a`| `"9864"` / `"2359"`  | comparecimento / abstenção                |
| `v.vb` / `v.vn` | `"182"` / `"311"` | votos brancos / nulos                     |

---

## 8. Processamento dos candidatos (jq)

Filtro em [buscador.sh:99-110](buscador.sh#L99-L110), passo a passo:

```jq
[
  .carg[] | select(.cd == $cargo)                 # 1. pega só o cargo atual
  | .. | objects | .cand? // empty | .[]          # 2. acha toda lista "cand", em qualquer nível
  | select((.nmu // "") != "" and (.n // "") != "")   # 3. descarta sem nome ou sem número
  | { nome: (.nmu | gsub("[[:cntrl:]]"; " ")),    # 4. troca caracteres de controle por espaço
      numero: .n,
      votos: ((.vap // "0") | tonumber) }         #    votos viram número (ausente = 0)
]
| unique_by(.numero)                              # 5. remove números repetidos
| sort_by([-.votos, (.nome | ascii_downcase), .numero])  # 6. votos ↓, nome ↑, número ↑
| .[:$limit][]                                    # 7. mantém os N primeiros
| [.nome, .numero, (.votos | tostring)] | @tsv    # 8. gera "nome⇥número⇥votos"
```

---

## 9. Exemplo de saída

Saída real do cargo Governador (dados do TSE gerados em 05/10/2026):

```text
Governador (cargo 3)
+-----------------+--------+-------+
| NOME            | NÚMERO | VOTOS |
+-----------------+--------+-------+
| ORLEANS BRANDÃO |     15 |  4085 |
| EDUARDO BRAIDE  |     55 |  3992 |
| FELIPE CAMARÃO |     13 |  1087 |
| ROBERTO ROCHA   |     28 |   156 |
| ANDRÉ LUIS     |     14 |    39 |
| SAULO ARCANGELI |     16 |     5 |
| REGINALDO LIMA  |     21 |     4 |
| DIMAS CASSIMIRO |     29 |     1 |
+-----------------+--------+-------+
```

> Repare nas linhas com acento (`CAMARÃO`, `ANDRÉ`): ficam desalinhadas. Veja o item 1 da seção 11.

---

## 10. Erros e códigos de saída

| Situação                                    | Mensagem                                  | Código |
|---------------------------------------------|-------------------------------------------|:------:|
| Tudo certo                                  | —                                         | 0      |
| `curl` ou `jq` não instalado                | `Erro: curl não encontrado` / `jq não encontrado` | 1 |
| Variável inválida                           | `Erro: TSE_RESULTS_... deve ...`          | 1      |
| Falha de rede/HTTP (após as tentativas)     | `Erro: falha ao consultar o cargo N`      | 1      |
| Resposta sem `carg` ou JSON inválido        | `Erro: resposta inválida para o cargo N`  | 1      |
| Cargo não encontrado dentro do JSON         | `Erro: cargo N ausente na resposta`       | 1      |
| `vap` não numérico (falha no passo 4 do jq) | mensagem do próprio jq                    | 5      |

O script usa `set -Eeuo pipefail` ([L2](buscador.sh#L2)): para no primeiro comando com erro, em variável não definida ou em falha dentro de um pipe.

---

## 11. Pontos de atenção (base para melhorias)

Itens verificados no código e nos testes:

| #  | Ponto                                                                 | Onde                                   | Efeito                                                         |
|:--:|-----------------------------------------------------------------------|----------------------------------------|----------------------------------------------------------------|
| 1  | `printf` do Bash conta **bytes**, não caracteres                       | [L65-67](buscador.sh#L65-L67)          | nomes com acento ficam desalinhados na tabela                  |
| 2  | Um erro em um cargo encerra tudo                                      | [L90-96](buscador.sh#L90-L96)          | os cargos restantes não aparecem                               |
| 3  | Códigos de eleição com zero à esquerda são lidos como octal           | [L87](buscador.sh#L87)                 | `0544` vira `000356`; `08` causa erro                          |
| 4  | Falha no jq de extração não passa pelo `die`                          | [L99-110](buscador.sh#L99-L110)        | encerra com código 5, sem a mensagem padrão `Erro:`            |
| 5  | Candidatos "Anulado sub judice" aparecem junto dos válidos            | [L103](buscador.sh#L103)               | ex.: ROBERTO ROCHA na tabela de Governador                     |
| 6  | Não mostra percentual, situação (eleito/2º turno) nem horário dos dados | [L104](buscador.sh#L104)             | informação disponível no JSON é descartada                     |
| 7  | Só 1º turno (códigos de eleição fixos)                                | [L12-13](buscador.sh#L12-L13)          | 2º turno exige trocar as variáveis manualmente                 |
| 8  | Sem argumentos de linha de comando e sem `--help`                     | —                                      | configuração só por variável de ambiente                       |
| 9  | Não mostra o nome do município, só o código                           | —                                      | difícil saber qual cidade foi consultada                       |
| 10 | Validação de UF aceita qualquer par de letras, inclusive acentuadas   | [L25](buscador.sh#L25)                 | `çã` passa na validação                                        |
| 11 | `TSE_RESULTS_BASE_URL` não é validada                                 | [L7](buscador.sh#L7)                   | aceita qualquer texto como URL                                 |
| 12 | `NO_COLOR` vazia também desliga a cor                                 | [L38](buscador.sh#L38)                 | o padrão no-color.org considera só valor não vazio             |
| 13 | Requisições feitas uma por vez, sem cache                             | [L83-113](buscador.sh#L83-L113)        | 5 downloads a cada execução                                    |
| 14 | Desempate por nome usa `ascii_downcase`; número comparado como texto  | [L107](buscador.sh#L107)               | acentos não são tratados; `"10"` vem antes de `"9"`            |
| 15 | `set -E` sem `trap ERR`                                               | [L2](buscador.sh#L2)                   | a opção não tem efeito                                         |
| 16 | Variáveis do laço são globais; não há função `main`                   | [L83-113](buscador.sh#L83-L113)        | dificulta testes e reaproveitamento                            |
| 17 | Comentário sem relação com o código ("Fizemos o fark...")             | [L16-20](buscador.sh#L16-L20)          | ruído no código                                                |
| 18 | README com apenas uma linha                                           | [README.md](README.md)                 | sem instruções de uso                                          |
