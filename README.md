# helvecioneto.github.io

Página pessoal e portfólio acadêmico de **Helvecio Bezerra Leal Neto** — Professor do
Magistério Superior no Instituto de Engenharia e Geociências da Universidade Federal
do Oeste do Pará (UFOPA).

Site estático, sem build, servido pelo GitHub Pages em <https://helvecioneto.github.io>.

## Estrutura

```
index.html                 página única, bilíngue (PT-BR / EN)
assets/css/style.css       identidade visual institucional
assets/js/content.js       CÓPIA DE RESERVA do conteúdo (gerada, não editar à mão)
assets/js/remote.js        busca o conteúdo vivo no Supabase
assets/js/app.js           renderização, troca de idioma, filtros e formulário
assets/img/                retrato e favicon
admin/                     painel de edição (/admin)
scripts/sync-fallback.js   regenera a cópia de reserva a partir do banco
supabase/migrations/       schema e carga inicial
```

## Painel de edição

Em <https://helvecioneto.github.io/admin/>. Entre com `helvecio.leal@ufopa.edu.br`
e a senha definida no Supabase. O que sai de lá entra no ar **na hora**: o site lê
o conteúdo direto do banco, sem precisar de commit nem de novo deploy.

O menu do painel segue a mesma ordem das seções da página — Perfil, Pesquisa,
Publicações, Ensino, Produtos, Formação, Contato — para que editar seja procurar
pelo mesmo nome que se vê no site. Dentro de cada seção, os textos e as fichas
daquela parte aparecem juntos, em blocos. Um oitavo item, **Geral**, reúne o que
não pertence a nenhuma seção: título da aba do navegador, descrição para
buscadores, nomes do menu e rodapé.

As contagens dos filtros de publicação são somadas a partir dos registros — não
existem como campo, então nunca ficam dessincronizadas.

Atalhos: `Ctrl/Cmd + S` salva o registro em foco; a busca filtra a seção aberta;
as setas ▲▼ reordenam. Um registro alterado e ainda não salvo fica marcado em
âmbar, e a página avisa se você tentar sair com pendências.

### Como a segurança funciona

A senha **nunca** é comparada no navegador. Ela é verificada pelo Supabase, e a
autorização vem do banco: as políticas de *Row Level Security* liberam leitura
para todo mundo (o site é público) e só aceitam escrita de um e-mail cadastrado
na tabela `admins`. A chave que aparece no código do cliente é a publicável — com
ela sozinha, um visitante lê, mas não altera nem apaga nada.

Para trocar a senha, use *Authentication → Users* no painel do Supabase. Para
autorizar outra pessoa a editar, insira o e-mail dela em `admins` e crie o usuário
correspondente — nenhuma dessas duas coisas basta sozinha.

### A cópia de reserva

`assets/js/content.js` é um retrato do conteúdo embutido na própria página. Ele é
renderizado de imediato e depois substituído pelos dados do banco. Se o Supabase
estiver fora do ar, bloqueado por rede corporativa ou **pausado por inatividade**
— o plano gratuito pausa projetos parados por cerca de uma semana — o site
continua completo, mostrando esse retrato em vez de quebrar.

Por isso a reserva precisa ser atualizada de vez em quando:

```sh
node scripts/sync-fallback.js
git commit -am "Atualiza a cópia de reserva do conteúdo"
```

Rode isso depois de uma rodada de edições no painel. Sem isso, uma eventual queda
do banco faria o site exibir conteúdo antigo.

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

Pelo painel em `/admin`. As tabelas no Supabase são:

| Tabela | O que guarda |
|---|---|
| `site_text` | todo texto da página, com `pt` e `en` lado a lado |
| `publications` | publicações, com autores, veículo, DOI e citações |
| `research_areas` / `research_groups` | linhas e grupos de pesquisa |
| `courses` | disciplinas, com código, carga horária e tópicos |
| `software` | produtos, estrelas e links |
| `education` | linha do tempo da formação |
| `links` | botões de perfil do topo |
| `admins` | quem pode escrever (invisível para o cliente) |

Ao cadastrar uma publicação, escreva seu nome exatamente como `Leal Neto, H. B.`
para que apareça em negrito na lista de autores. O campo `type` aceita `journal`,
`conference`, `preprint`, `thesis` e `dataset` — é ele que alimenta os filtros.

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
