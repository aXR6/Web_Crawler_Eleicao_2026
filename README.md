# Web_Crawler_Eleicao_2026

Script em Bash ([buscador.sh](buscador.sh)) que consulta os **resultados oficiais do TSE** e mostra no terminal, para cada município do Maranhão, os candidatos mais votados de cada cargo. Ele separa o 1º e o 2º turno e indica quem foi eleito.

Atividade prática de Engenharia de Software: **Manifesto Ágil e Extreme Programming (XP)**, feita em pair programming.

---

## Pré-requisitos

| Ferramenta | Versão  | Instalação (Ubuntu/Debian) |
|------------|---------|----------------------------|
| bash       | 4.4+    | já vem no sistema          |
| curl       | qualquer recente | `sudo apt install curl` |
| jq         | 1.5+    | `sudo apt install jq`      |

---

## Como executar

```bash
chmod +x buscador.sh
./buscador.sh
```

Sem nenhuma configuração, o script percorre **os 217 municípios do Maranhão**, no **1º e no 2º turno**. Como são mais de mil consultas ao TSE, a execução completa leva vários minutos. Para testar rápido, escolha um município.

### Exemplos de uso

```bash
TSE_RESULTS_MUNICIPALITY=09210 ./buscador.sh              # só São Luís
TSE_RESULTS_TURN=1 ./buscador.sh                          # só o 1º turno
TSE_RESULTS_TURN=2 TSE_RESULTS_LIMIT=5 ./buscador.sh      # só o 2º turno, 5 candidatos por cargo
TSE_RESULTS_COLOR=never ./buscador.sh > resultados.txt    # salva em arquivo, sem cores
```

### Configuração (variáveis de ambiente)

| Variável                          | Padrão  | Para que serve |
|-----------------------------------|---------|----------------|
| `TSE_RESULTS_MUNICIPALITY`        | `todos` | `todos` ou o código TSE de 5 dígitos do município |
| `TSE_RESULTS_TURN`                | `ambos` | `1`, `2` ou `ambos` |
| `TSE_RESULTS_LIMIT`               | `20`    | máximo de candidatos por cargo |
| `TSE_RESULTS_UF`                  | `ma`    | estado |
| `TSE_RESULTS_YEAR`                | `2026`  | ano da eleição |
| `TSE_RESULTS_FEDERAL_ELECTION`    | `6257`  | código da eleição federal, 1º turno |
| `TSE_RESULTS_STATE_ELECTION`      | `6259`  | código da eleição estadual, 1º turno |
| `TSE_RESULTS_FEDERAL_ELECTION_T2` | `6258`  | código da eleição federal, 2º turno |
| `TSE_RESULTS_STATE_ELECTION_T2`   | `6260`  | código da eleição estadual, 2º turno |
| `TSE_RESULTS_COLOR`               | `auto`  | `auto`, `always` ou `never` |
| `TSE_RESULTS_BASE_URL`            | `https://resultados.tse.jus.br/oficial` | endereço da API |

### Exemplo de saída

```text
######## SÃO LUÍS (09210) - MA ########

===== 1º turno =====

Governador (cargo 3)
+-----------------+--------+--------+------------+
| NOME            | NÚMERO |  VOTOS | SITUAÇÃO   |
+-----------------+--------+--------+------------+
| EDUARDO BRAIDE  |     55 | 467634 | Eleito     |
| ORLEANS BRANDÃO |     15 |  89914 | Não eleito |
| FELIPE CAMARÃO  |     13 |  49297 | Não eleito |
+-----------------+--------+--------+------------+

===== 2º turno =====
Aviso: o TSE não tem dados do cargo 3 no 2º turno

Presidente (cargo 1)
+------------------+--------+--------+------------+
| NOME             | NÚMERO |  VOTOS | SITUAÇÃO   |
+------------------+--------+--------+------------+
| LULA             |     13 | 385821 | Eleito     |
| FLAVIO BOLSONARO |     22 | 235947 | Não eleito |
+------------------+--------+--------+------------+
```

---

## Melhorias e correções realizadas

Cada item foi feito em um passo pequeno, sobre o código que já existia. O passo a passo com os diffs está em [MELHORIAS.md](MELHORIAS.md). A documentação técnica do script original está em [DOCUMENTACAO.md](DOCUMENTACAO.md).

### Requisitos da atividade

| Requisito | Como foi atendido |
|-----------|-------------------|
| **Todos os municípios do Maranhão** | A lista dos 217 municípios é lida do próprio TSE (`config/mun-e006259-cm.json`). O padrão passou a ser `todos`, e cada bloco mostra o **nome** e o código da cidade. |
| **1º e 2º turno separados** | Nova variável `TSE_RESULTS_TURN` (`1`, `2`, `ambos`). Cada turno aparece em uma seção própria. No 2º turno só são consultados Governador e Presidente. Quando o TSE não tem o 2º turno de um cargo (Governador do MA, eleito no 1º turno), o script mostra um aviso e segue. |
| **Indicar os eleitos** | Nova coluna **SITUAÇÃO**: `Eleito`, `Eleito por QP`, `Eleito por média`, `Suplente`, `2º turno`, `Não eleito` ou `Anulado sub judice`. Com cor, os eleitos ficam em amarelo. Para deputados a situação vem do arquivo estadual do TSE, porque o arquivo do município não a traz. |

### Correções

| Problema encontrado | Correção |
|---------------------|----------|
| Nomes com acento (ex.: `FELIPE CAMARÃO`) desalinhavam a tabela | Nova função `pad_right`, que completa com espaços contando caracteres, não bytes |
| Um erro em um cargo encerrava o script inteiro | Os erros viram avisos, os outros cargos continuam e o script termina com um resumo e código 1 |
| Um HTTP 404 era tentado 3 vezes | A nova função `fetch_json` separa "sem dados" (404) de "falha" e só repete erros temporários |
| Código de eleição com zero à esquerda era lido como octal (`06259` dava erro) | Os códigos são lidos sempre em base 10 |
| Falha do `jq` saía sem mensagem clara | Toda falha de leitura gera uma mensagem `Aviso:` explicando o cargo |
| `NO_COLOR` vazia desligava a cor | Só um valor não vazio desliga a cor, como diz o padrão no-color.org |
| Laço principal longo, com variáveis globais | O corpo foi extraído para a função `show_cargo`, com variáveis `local` |
| Comentário sem relação com o código | Removido |

---

## Validação

Testes feitos contra a API real do TSE em 27/10/2026:

| Cenário | Resultado |
|---------|-----------|
| `jq` não instalado | `Erro: jq não encontrado` (código 1) |
| Parâmetros inválidos (UF, município, limite, turno, cor) | mensagem `Erro:` específica para cada um (código 1) |
| Município inexistente (`99999`) | `Erro: município 99999 não encontrado em MA` |
| Resposta inválida do servidor (HTML no lugar do JSON) | aviso no cargo afetado, os demais são exibidos, resumo final e código 1 |
| 2º turno sem dados (Governador/MA) | aviso e continuação (código 0) |
| Nomes acentuados | tabelas alinhadas |
| Eleitos no 1º e 2º turno (Davinópolis e São Luís) | situação correta nos 5 cargos |
| Todos os municípios | 15 municípios em sequência sem falhas, cerca de 15 s por município nesta rede |

---

## Pair programming

Fluxo usado: branch `melhoria-xp`, um commit por passo do [MELHORIAS.md](MELHORIAS.md), revezando os papéis a cada passo.

<!-- Preencher com os nomes da dupla -->
| Passo | Driver | Navigator |
|-------|--------|-----------|
| 1–2 Comentário e acentos | | |
| 3–4 Códigos de eleição e `NO_COLOR` | | |
| 5–6 `show_cargo` e tratamento de erros | | |
| 7 1º/2º turno | | |
| 8 Todos os municípios | | |
| 9 Eleitos | | |
| 10 README | | |

---

## Implementação: tela web

Painel em [frontend/](frontend/) que mostra os resultados do `buscador.sh` com gráficos. O script continua sendo o backend: a tela só o executa e desenha o que ele devolve.

![Tela web do painel de resultados](docs/tela-web.png)

**Tecnologias:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Recharts (gráficos do shadcn)

### Como executar

Pré-requisitos: Node.js 20.9 ou mais novo, além de bash, curl e jq (os mesmos do script).

```bash
cd frontend
npm install
npm run dev      # abre em http://localhost:3000
```

Para a versão otimizada: `npm run build` e depois `npm start`.

### O que a tela mostra

- Busca entre os 217 municípios do Maranhão, sem precisar de acento (atalho `Ctrl K`).
- 1º e 2º turno em seções separadas (teclas `1` e `2`). Quando não houve 2º turno para um cargo, a tela avisa.
- Eleitos destacados em azul com a etiqueta **ELEITO**. Quem foi ao 2º turno aparece em laranja.
- Comparecimento, abstenção e eleitorado do município.
- Gráfico de barras por cargo e composição dos votos (válidos, brancos e nulos). Cada gráfico tem uma versão em tabela.
- Cada cargo aparece assim que o TSE responde, com a varredura do radar mostrando o progresso.
- A escolha fica na URL (ex.: `?municipio=09210&turno=2`), para compartilhar o link.

### Como a tela usa o script

```text
navegador ──► /api/municipios ──► buscador.sh  (TSE_RESULTS_MUNICIPALITY=lista)
          ──► /api/resultados ──► buscador.sh  (TSE_RESULTS_FORMAT=json)
                                   └─ uma linha JSON por cargo, enviada à tela assim que chega
```

O `buscador.sh` ganhou só duas opções. O modo tabela do terminal continua igual.

| Variável | Valor novo | Efeito |
|----------|------------|--------|
| `TSE_RESULTS_FORMAT` | `json` (padrão `tabela`) | imprime cada cargo como uma linha JSON, com candidatos, percentuais e resumo de votos |
| `TSE_RESULTS_MUNICIPALITY` | `lista` | imprime `código<TAB>nome` dos municípios e sai |

### Arquivos principais

| Arquivo | Papel |
|---------|-------|
| [frontend/src/lib/buscador.ts](frontend/src/lib/buscador.ts) | executa o `buscador.sh` e repassa a saída (cache de 10 min) |
| [frontend/src/app/api/](frontend/src/app/api/) | rotas `/api/municipios` e `/api/resultados` |
| [frontend/src/components/painel/](frontend/src/components/painel/) | componentes da tela (cartões, gráficos, busca, carregamento) |
| [frontend/src/app/globals.css](frontend/src/app/globals.css) | tema escuro, cores dos gráficos e efeitos visuais |

As cores dos gráficos foram conferidas com um validador de paleta para daltonismo e contraste. As animações são desligadas quando o sistema pede menos movimento.
