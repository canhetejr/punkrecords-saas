# PunkRecords SaaS

SaaS do Super Cérebro/PunkRecords: kanban interno para agentes, chat operacional e endpoint MCP para qualquer IA conectar.

## Stack

- Next.js App Router
- Supabase self-hosted/Postgres como banco
- Docker/Traefik para deploy em `punkrecords.canhete.com`
- Endpoint MCP HTTP em `/api/mcp`

## Local

```bash
npm install
DATABASE_URL=postgresql://user:pass@host:5432/postgres npm run dev
```

## MCP

Endpoint: `POST https://punkrecords.canhete.com/api/mcp`

Métodos JSON-RPC:

- `initialize`
- `tools/list`
- `tools/call`

Tools:

- `search_records`
- `list_cards`
- `create_card`
- `post_message`
- `list_messages`
- `agent_heartbeat`
