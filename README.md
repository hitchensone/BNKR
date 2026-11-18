# GO Bunker! · Sistema de gestão da agência

Sistema modular da GO Bunker! Mídia e Tecnologia. Cada módulo é uma área do sistema, todos sobre o mesmo núcleo de dados.

| Módulo | Função | Status |
|---|---|---|
| **GO CL** | Captação de leads: atrair, cativar, briefing, proposta e contrato | Pronto |
| **GO UP** | Work OS: projetos, fluxos, demandas e postagens | A fazer |
| **GO GRAND** | Financeiro: lançamentos, recorrentes, indicadores e comparativos | Pronto |
| **GO THERE** | Portal do cliente: andamento, arquivos e entregas | A fazer |
| **BUNKER CHAT** | Chat interno, com clientes e assistente | A fazer |

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind 4)
- **Supabase**: Postgres, Auth, Storage, Realtime
- Tudo que é do banco fica em `supabase/migrations`, versionado no Git. Nada é criado clicando no painel.

## Rodando no seu computador

Precisa de Node 22+ e Docker Desktop (para o Supabase local).

```bash
npm install
npm run db:start          # sobe o Supabase local e aplica migrações + seed
cp .env.example .env.local  # cole a URL e a publishable key que o db:start mostrou
npm run dev               # http://localhost:3000
```

**Primeiro acesso:** crie seu usuário no Supabase Studio local (http://127.0.0.1:54323 › Authentication › Add user) e entre pelo sistema. O primeiro usuário a entrar vira **owner** automaticamente. Depois disso, ninguém mais vira owner sozinho.

## Estrutura

```
supabase/
  migrations/      # o banco inteiro, em ordem
  seed.sql         # modelos de mensagem e contrato padrão
src/
  app/
    entrar/        # login
    (sistema)/     # tudo que exige login: área de trabalho e módulos
  lib/
    supabase/      # clientes do Supabase (navegador, servidor, proxy)
    data/          # camada de acesso a dados: as telas só falam com isto
    go-cl/         # regras do GO CL (etapas, modelos, contrato)
    modules.ts     # registro dos módulos e quem acessa cada um
    types.ts
```

## Regras da arquitetura

1. **Cada dado tem um dono.** Contrato é do GO CL, demanda do GO UP, dinheiro do GO GRAND. Os outros só leem ou reagem a eventos.
2. **Eventos entre módulos** ficam na tabela `events`. Ex.: ao assinar um contrato, o banco cria o cliente, gera o projeto e grava `contract.signed` com os valores. O GO GRAND vai ler esse evento para lançar as receitas.
3. **Segurança no banco (RLS) em todas as tabelas.** Papéis: `owner`, `admin`, `team`, `client`. O cliente só enxerga o que é dele, e o financeiro é só da administração.
4. **Chave secreta nunca no front-end.** Integrações sensíveis (IA, PDF, e-mail) vão para funções no servidor.

## Fluxo do GO CL

```
novo → abordado → cativando → briefing → proposta → negociação → ganho / perdido
```

- Modelos de mensagem por etapa, com variáveis `{{contato}}`, `{{empresa}}`, `{{segmento}}`, `{{cidade}}`, `{{agencia}}`.
- Briefing com diretrizes, propósitos, metas, campanhas, entregas e resultados prováveis.
- Contrato numerado (`GB-2026-0001`), gerado a partir do modelo padrão. Ao **enviar**, o texto é congelado. Ao **assinar**:
  1. cria o cliente no núcleo (ou usa o existente)
  2. marca o lead como ganho
  3. gera o projeto inicial (GO UP)
  4. emite `contract.signed` (GO GRAND)

## Indo para produção ou para servidor próprio

- **Nuvem Supabase:** crie o projeto na região São Paulo, `npx supabase link` e `npm run db:push`. Rode o `seed.sql` uma vez pelo SQL Editor.
- **Servidor próprio:** suba o Supabase self-hosted (Docker), rode as mesmas migrações e troque URL e chaves no `.env`. O código não muda.
- **Backup:** `pg_dump` agendado + cópia do Storage, guardados fora do servidor.
