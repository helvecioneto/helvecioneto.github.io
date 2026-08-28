# helvecioneto.github.io

Página pessoal e portfólio acadêmico de **Helvecio Bezerra Leal Neto** — Professor do
Magistério Superior no Instituto de Engenharia e Geociências da Universidade Federal
do Oeste do Pará (UFOPA).

Site estático, sem build, servido pelo GitHub Pages em <https://helvecioneto.github.io>.

## Estrutura

```
index.html               página única, bilíngue (PT-BR / EN)
assets/css/style.css     identidade visual institucional
assets/js/content.js     textos traduzidos + dados (publicações, disciplinas, software)
assets/js/app.js         renderização, troca de idioma, filtros e formulário
assets/img/              retrato e favicon
```

## Formulário de contato

O formulário usa o [Web3Forms](https://web3forms.com) — gratuito, sem backend e sem
limite mensal. **Já está configurado**: a Access Key fica no topo de
`assets/js/app.js` e as mensagens chegam em `helvecio.leal@ufopa.edu.br` com o
assunto no formato `[Motivo do contato] Nome do remetente`.

Motivos de contato disponíveis: Contato Institucional, Busca de Colaboração,
Orientações Acadêmicas, Parcerias Científicas e Outros.

A Access Key é um identificador público, feito para ficar visível no código do
cliente: ela só autoriza o envio para o e-mail já cadastrado e não dá acesso a
nenhuma conta. Para trocá-la, gere outra em <https://web3forms.com> e substitua o
valor de `WEB3FORMS_KEY`. Se o valor deixar de ser um UUID válido, o formulário
volta ao **modo de reserva**: monta um e-mail já preenchido e abre o programa de
e-mail do visitante.

Proteções já incluídas: validação de todos os campos no cliente, campo-armadilha
(*honeypot*) contra robôs e mensagens de erro traduzidas.

## Atualizar o conteúdo

Todo o conteúdo editorial fica em `assets/js/content.js`:

| O que mudar | Onde |
|---|---|
| Textos em português | objeto `I18N.pt` |
| Textos em inglês | objeto `I18N.en` |
| Publicações | array `PUBLICATIONS` |
| Disciplinas | array `COURSES` (títulos e ementas em `I18N`, chaves `c1`–`c5`) |
| Software | array `SOFTWARE` |
| Formação | array `EDUCATION` |

Para incluir uma publicação, acrescente um objeto ao array `PUBLICATIONS` com
`year`, `type` (`journal`, `conference`, `preprint`, `thesis` ou `dataset`),
`title`, `authors`, `venue`, `doi` e `cites`. Use a constante `ME` na lista de
autores para que o nome apareça em destaque. Os filtros, as contagens e as métricas
do topo são calculados automaticamente.

## Desenvolvimento local

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```

## Outras páginas do domínio

- `gp5.html` — GP-5 USB-MIDI Tester
- `trackboard/` — visualização de trajetórias
- `windy/` — visualização meteorológica

## Idioma

A página detecta o idioma do navegador e guarda a escolha em `localStorage`.
Também aceita `?lang=pt` ou `?lang=en` na URL.
