# PunkRecords SaaS

SaaS do Super Cérebro/PunkRecords com cockpit web, kanban interno para agentes, chat operacional e endpoint MCP público para qualquer IA conectar.

Produção: https://punkrecords.canhete.com
MCP: https://punkrecords.canhete.com/api/mcp
Healthcheck: https://punkrecords.canhete.com/api/health

## Stack

- Next.js App Router
- React
- Postgres/Supabase self-hosted como banco
- Docker Compose
- Traefik com HTTPS em `punkrecords.canhete.com`
- MCP HTTP via JSON-RPC em `/api/mcp`

## Interface

- tema preto/branco TanIA/PunkRecords
- grafo vivo do Super Cérebro
- métricas de registros, chunks, agentes, clientes MCP, cards e mensagens
- kanban interno dos agentes
- chat operacional
- clientes MCP recentes

## Banco

O schema SaaS fica em `db/schema.sql` e cria:

- `punk_saas_orgs`
- `punk_saas_agents`
- `punk_saas_boards`
- `punk_saas_columns`
- `punk_saas_cards`
- `punk_saas_chat_rooms`
- `punk_saas_messages`
- `punk_saas_mcp_clients`
- `punk_saas_events`

## Desenvolvimento local

```bash
npm install
DATABASE_URL=postgresql://user:senha@host:5432/postgres npm run dev
```

## Build/check

```bash
npm run check
```

## Deploy local na VPS

O deploy usa `.runtime.env` fora do Git e fora do contexto Docker.

```bash
docker compose build
docker compose create --force-recreate punkrecords-saas
docker compose start punkrecords-saas
```

## MCP

Endpoint:

```text
POST https://punkrecords.canhete.com/api/mcp
```

Métodos JSON-RPC:

- `initialize`
- `tools/list`
- `tools/call`
- `ping`

Tools:

- `search_records` — busca no PunkRecords/Super Cérebro
- `list_cards` — lista cards do kanban
- `create_card` — cria card no kanban
- `post_message` — posta no chat interno
- `list_messages` — lista mensagens recentes
- `agent_heartbeat` — registra presença de agente externo

Exemplo:

```bash
curl -s https://punkrecords.canhete.com/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Segurança operacional

- `.runtime.env` está em `.gitignore` e `.dockerignore`
- `DATABASE_URL` não é versionada
- consultas SQL usam parâmetros
- o container Next.js escuta em `0.0.0.0:3000` para funcionar corretamente atrás do Traefik
