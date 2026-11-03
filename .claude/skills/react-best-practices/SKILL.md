---
name: react-best-practices
description: Boas práticas de performance e correção para o app web do psy-manager (React 19 + Vite 8 SPA, React Router 7, tRPC + TanStack Query) e para os procedures do apps/api — 76 regras com exemplos errado/certo, em 9 categorias por impacto - waterfalls, bundle e code splitting, dados com tRPC, re-render, renderização, JavaScript, Vite (env, build, sourcemaps, cache, Fast Refresh) e API. Baseada na skill react-best-practices da Vercel, sem as regras de Next.js/RSC/SSR, mais regras de Vite. Use ao escrever, revisar ou refatorar componentes, hooks, rotas, queries/mutations, a config do Vite, ou ao investigar lentidão, re-render ou bundle grande.
license: MIT
metadata:
  based-on: vercel-labs/agent-skills/skills/react-best-practices (v1.0.0, January 2026)
  adapted: "2026-11-03"
---

# React + Vite no psy-manager

76 regras em 9 categorias, ordenadas por impacto. Cada regra é um arquivo em `rules/<id>.md`
com a explicação e exemplos **errado/certo**. Leia o arquivo da regra quando ela se aplicar —
não tente seguir só pelo título.

É uma SPA: **não há** Next.js, Server Components, server actions, SSR nem hidratação. As
regras da Vercel que só existem nesse mundo foram removidas (lista no fim).

## Stack real

| Peça | Estado | Consequência |
|---|---|---|
| React 19.2 | `use`, `useEffectEvent`, `<Activity>`, `useDeferredValue` disponíveis | regras `advanced-*` e `rendering-activity` valem |
| Vite 8 (Rolldown + Oxc) | config em `apps/web/vite.config.ts` | `vite-config-v8`: snippets de Vite ≤7 quebram |
| `@vitejs/plugin-react` 6 **sem React Compiler** | nada é memoizado automaticamente | `rerender-memo*` valem por inteiro |
| React Router 7, `createBrowserRouter` | rotas `lazy` via `src/route-modules.ts` | `bundle-route-lazy` |
| tRPC 11 + TanStack Query 5 | `src/lib/trpc.ts`, `httpBatchLink` em `main.tsx` | categoria `client-` |
| `eslint-plugin-react-hooks` 7 + `react-refresh` | regras de pureza do React 19 já cobradas no lint | `vite-fast-refresh` |
| nginx + Cloudflare | `docker/nginx.conf` | `vite-caching-and-fallback` |

## Quando aplicar

- Escrever ou revisar componente, hook, rota, query ou mutation em `apps/web`
- Mexer em `vite.config.ts`, `index.html`, `main.tsx`, `router.tsx`, `docker/nginx.conf`
- Investigar tela lenta, re-render excessivo ou bundle grande
- Escrever procedure/service com várias consultas em `apps/api` (categoria `api-`)

## Categorias por prioridade

| # | Categoria | Impacto | Prefixo |
|---|---|---|---|
| 1 | Eliminar waterfalls | CRÍTICO | `async-` |
| 2 | Bundle e code splitting | CRÍTICO | `bundle-` |
| 3 | Dados no cliente (tRPC + Query) | MÉDIO-ALTO | `client-` |
| 4 | Vite: build, env, cache, dev | ALTO | `vite-` |
| 5 | API (tRPC/Hono) | ALTO | `api-` |
| 6 | Re-render | MÉDIO | `rerender-` |
| 7 | Renderização | MÉDIO | `rendering-` |
| 8 | JavaScript | BAIXO-MÉDIO | `js-` |
| 9 | Padrões avançados | BAIXO | `advanced-` |

## Referência rápida

### 1. Eliminar waterfalls (CRÍTICO)

- `async-parallel` — `Promise.all()` para operações independentes
- `async-dependencies` — dependência parcial: comece as promises cedo, espere tarde
- `async-defer-await` — `await` só no ramo que usa o valor
- `async-cheap-condition-before-await` — condição síncrona barata antes do `await`
- `async-suspense-boundaries` — Suspense só em volta da seção que depende do dado
- `client-parallel-queries` — queries independentes disparadas no mesmo render

### 2. Bundle e code splitting (CRÍTICO)

- `bundle-route-lazy` — toda rota com `lazy` (mapa em `route-modules.ts`)
- `bundle-dynamic-imports` — `React.lazy` para dialog/sheet/gráfico pesado
- `bundle-conditional` — módulo carregado só quando a funcionalidade é ativada
- `bundle-preload` — `import()` no hover/foco para adiantar o download
- `bundle-barrel-imports` — nada de `import *`; sem barris no código-fonte
- `bundle-analyzable-paths` — `import()` com caminho literal, via mapa
- `bundle-defer-third-party` — terceiros depois do primeiro paint
- `vite-bundle-analyze` — medir o chunk de entrada antes e depois

### 3. Dados no cliente (MÉDIO-ALTO)

- `client-trpc-query` — `trpc.x.y.useQuery`, nunca `useEffect` + `fetch`
- `client-invalidate-after-mutation` — invalidar tudo que a mutation afeta
- `client-query-options` — `isPending` × `isFetching`, `placeholderData`, input estável, `staleTime`
- `client-event-listeners` — um listener global para N componentes
- `client-passive-event-listeners` — `{ passive: true }` em scroll/touch/wheel
- `client-localstorage-schema` — chave versionada, campos mínimos, try/catch

### 4. Vite (ALTO)

- `vite-caching-and-fallback` — assets com hash imutáveis, `index.html` sem cache, fallback de SPA
- `vite-preload-error` — recarregar quando um deploy apaga um chunk
- `vite-sourcemaps` — mapas só para o Sentry, nunca servidos
- `vite-env-vars` — `VITE_*` é público e embutido no build
- `vite-build-validation` — `vite build` não checa tipos; deep link no preview
- `vite-fast-refresh` — arquivo de componente só exporta componentes
- `vite-assets` — importar assets; `public/` só para nome fixo
- `vite-config-v8` — opções do Vite 8 (Rolldown/Oxc), não do Vite 5
- `vite-dev-server` — barris, `optimizeDeps`, warmup, proxy

### 5. API — tRPC/Hono (ALTO)

- `api-parallel-awaits` — consultas independentes do procedure em paralelo
- `api-parallel-nested` — encadear o fetch dependente por item
- `api-no-shared-module-state` — dado de request nunca em variável de módulo
- `api-lru-cache` — cache em memória por dono, com invalidação

### 6. Re-render (MÉDIO)

- `rerender-derived-state-no-effect` — derivar no render, não com estado + efeito
- `rerender-move-effect-to-event` — efeito de ação do usuário vai no handler
- `rerender-no-inline-components` — nunca componente dentro de componente
- `rerender-functional-setstate` — `setX(prev => ...)` para callbacks estáveis
- `rerender-lazy-state-init` — `useState(() => caro())`
- `rerender-dependencies` — dependências primitivas nos efeitos
- `rerender-derived-state` — assinar booleano derivado, não valor contínuo
- `rerender-defer-reads` — não assinar estado que só é lido no handler
- `rerender-split-combined-hooks` — um memo/efeito por responsabilidade
- `rerender-memo` — extrair trabalho caro para componente `memo`
- `rerender-memo-with-default-value` — default não primitivo vira constante de módulo
- `rerender-simple-expression-in-memo` — não memoizar expressão barata
- `rerender-transitions` — `startTransition` para atualização não urgente
- `rerender-use-deferred-value` — `useDeferredValue` em filtro de lista grande
- `rerender-use-ref-transient-values` — valor que muda o tempo todo vai em ref

### 7. Renderização (MÉDIO)

- `rendering-conditional-render` — `cond ? <X/> : null`, não `count && <X/>`
- `rendering-content-visibility` — `content-visibility: auto` em lista longa
- `rendering-activity` — `<Activity>` para UI cara que abre e fecha
- `rendering-hoist-jsx` — JSX estático como constante de módulo
- `rendering-usetransition-loading` — `useTransition` em vez de loading manual
- `rendering-resource-hints` — preload/preconnect no `index.html` e no hover
- `rendering-script-defer-async` — `defer`/`async` em script de terceiro
- `rendering-no-theme-flash` — preferência visual aplicada antes do React montar
- `rendering-animate-svg-wrapper` — animar o wrapper, não o `<svg>`
- `rendering-svg-precision` — reduzir casas decimais de SVG

### 8. JavaScript (BAIXO-MÉDIO)

- `js-tosorted-immutable` — `toSorted()`; `.sort()` muta prop/estado/cache
- `js-index-maps` — `Map` por id em vez de `.find()` repetido
- `js-set-map-lookups` — `Set.has` em vez de `includes` repetido
- `js-length-check-first` — comparar tamanho antes de comparação cara
- `js-combine-iterations` — um laço em vez de vários `.filter()`
- `js-flatmap-filter` — `flatMap` em vez de `map().filter(Boolean)`
- `js-early-exit` — retornar assim que souber
- `js-hoist-regexp` — regex/formatador fora do render
- `js-cache-function-results` — cache de módulo para função pura repetida
- `js-cache-property-access` — tirar acesso profundo de laço quente
- `js-cache-storage` — cachear leitura de `localStorage`
- `js-batch-dom-css` — não intercalar leitura de layout e escrita de estilo
- `js-min-max-loop` — mínimo/máximo com um laço, sem ordenar
- `js-request-idle-callback` — trabalho de fundo no tempo ocioso

### 9. Avançado (BAIXO)

- `advanced-effect-event-deps` — retorno de `useEffectEvent` nunca nas dependências
- `advanced-event-handler-refs` — handler em ref/`useEffectEvent` para assinatura estável
- `advanced-use-latest` — `useEffectEvent` para callback sempre atual
- `advanced-init-once` — inicialização global fora de `useEffect([])`

## Checklist mínimo para código novo em `apps/web`

1. Tela nova: entrada em `route-modules.ts` + `lazy` no router (`bundle-route-lazy`).
2. Lib pesada ou formulário com zod só na tela/dialog que usa (`bundle-dynamic-imports`).
3. Dados via tRPC; queries independentes juntas; invalidação após mutation.
4. Derivar no render; efeito de clique no handler; nada de componente aninhado.
5. Segredo nunca em `VITE_*`.
6. `bun run build:web`, lint e `bun run test:web` antes de dar por feito.

## Ao revisar

Cite o id da regra e `arquivo:linha`. Não recomende memoização sem motivo concreto (filho
`memo`, dependência de efeito, cálculo caro medido). Regra de impacto baixo não justifica
piorar a legibilidade de código fora de caminho quente.

## Adicionar uma regra

Copie `rules/_template.md` para `rules/<prefixo>-<slug>.md`, preencha o frontmatter
(`title`, `impact`, `impactDescription`, `tags`), escreva os exemplos errado/certo com código
real do projeto quando houver, e adicione a linha na referência rápida acima.

## Removidas da skill original (só Next.js/RSC/SSR)

`server-cache-react`, `server-dedup-props`, `server-serialization`, `server-parallel-fetching`,
`server-after-nonblocking`, `server-hoist-static-io`, `rendering-hydration-suppress-warning`.
Substituídas por versões para este stack: `client-swr-dedup` → `client-trpc-query`;
`async-api-routes` → `api-parallel-awaits`; `server-parallel-nested-fetching` → `api-parallel-nested`;
`server-no-shared-module-state` → `api-no-shared-module-state`; `server-cache-lru` → `api-lru-cache`;
`rendering-hydration-no-flicker` → `rendering-no-theme-flash`. `server-auth-actions` está coberta
pelas regras de autorização do `CLAUDE.md`.

## Créditos

Regras genéricas copiadas de [vercel-labs/agent-skills · react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
(MIT, Vercel Engineering). Regras com Next/SWR reescritas para este stack. Regras `vite-`
baseadas em [claudiocebpaz/vite-react-best-practices](https://github.com/claudiocebpaz/vite-react-best-practices),
[asyrafhussin/agent-skills · react-vite-best-practices](https://github.com/asyrafhussin/agent-skills/tree/main/skills/react-vite-best-practices)
(MIT) e na documentação do Vite ([performance](https://vite.dev/guide/performance),
[build](https://vite.dev/guide/build)).
