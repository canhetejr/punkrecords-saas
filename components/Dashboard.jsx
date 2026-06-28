
'use client';

import { useMemo, useState } from 'react';
import { Activity, Bot, Brain, Cable, CheckCircle2, KanbanSquare, MessageSquare, Plus, Radio, Search, Sparkles } from 'lucide-react';

export default function Dashboard({ initialData, error }) {
  const [data, setData] = useState(initialData);
  const [chatText, setChatText] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [search, setSearch] = useState('');
  const app = data.app || { brand: 'TanIA / PunkRecords Command OS', publicUrl: 'https://punkrecords.canhete.com', mcpPath: '/api/mcp', mcpUrl: 'https://punkrecords.canhete.com/api/mcp' };
  const graphNodes = useMemo(() => buildGraph(), []);

  async function refresh() {
    const res = await fetch('/api/state');
    if (res.ok) setData(await res.json());
  }

  async function sendMessage(e) {
    e.preventDefault();
    const body = chatText.trim();
    if (!body) return;
    await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body, author_name: 'Operador', kind: 'chat' }) });
    setChatText('');
    refresh();
  }

  async function createCard(e) {
    e.preventDefault();
    const title = cardTitle.trim();
    if (!title) return;
    await fetch('/api/kanban/cards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, description: 'Criado pelo cockpit PunkRecords', priority: 'medium' }) });
    setCardTitle('');
    refresh();
  }

  const filteredRecords = (data.recentRecords || []).filter(r => !search || `${r.title} ${r.path}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="shell">
      <section className="hero panel">
        <div className="brandRow">
          <div className="duck" aria-label="TanIA">◖●◗</div>
          <div>
            <p className="eyebrow">{app.brand}</p>
            <h1>Super Cérebro SaaS para agentes, humanos e qualquer IA via MCP.</h1>
          </div>
        </div>
        <p className="heroText">Kanban interno, chat operacional, memória Supabase e endpoint MCP universal em uma interface preta, branca e consistente.</p>
        <div className="statusStrip">
          <span><CheckCircle2 size={16}/> Produção online</span>
          <span><Activity size={16}/> Health: /api/health</span>
          <span><Cable size={16}/> MCP: {app.mcpPath}</span>
        </div>
        <div className="metrics">
          <Metric icon={<Brain />} label="Registros" value={data.stats?.records ?? '—'} />
          <Metric icon={<Sparkles />} label="Chunks" value={data.stats?.chunks ?? '—'} />
          <Metric icon={<Bot />} label="Agentes" value={data.stats?.agents ?? (data.agents?.length || '—')} />
          <Metric icon={<Cable />} label="Clientes MCP" value={data.stats?.mcp_clients ?? '—'} />
          <Metric icon={<KanbanSquare />} label="Cards" value={data.stats?.cards ?? '—'} />
          <Metric icon={<MessageSquare />} label="Mensagens" value={data.stats?.messages ?? '—'} />
        </div>
        {error && <div className="error">Banco ainda não respondeu: {error}</div>}
      </section>

      <section className="gridTwo">
        <div className="panel graphPanel">
          <div className="sectionTitle"><Radio size={18}/> Grafo vivo</div>
          <div className="graphCanvas">
            {graphNodes.map((n) => <div key={n.label} className={`node ${n.kind}`} style={{ left: n.x + '%', top: n.y + '%' }}>{n.label}</div>)}
            <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="50" y1="50" x2="18" y2="24" />
              <line x1="50" y1="50" x2="82" y2="20" />
              <line x1="50" y1="50" x2="18" y2="80" />
              <line x1="50" y1="50" x2="82" y2="78" />
              <line x1="50" y1="50" x2="50" y2="12" />
            </svg>
          </div>
        </div>

        <div className="panel agentsPanel">
          <div className="sectionTitle"><Bot size={18}/> Agentes conectados</div>
          <div className="agentList">
            {(data.agents || []).map(agent => (
              <div className="agent" key={agent.id}>
                <div className="agentAvatar">{agent.avatar === 'duck' ? '◖●◗' : agent.name[0]}</div>
                <div>
                  <strong>{agent.name}</strong>
                  <span>{agent.role} · {agent.model || 'local'}</span>
                </div>
                <em className={agent.status}>{agent.status}</em>
              </div>
            ))}
          </div>
          <div className="mcpBox">
            <Cable size={18}/>
            <div>
              <strong>MCP ativo</strong>
              <code>POST {app.mcpPath}</code>
              <span>initialize · tools/list · tools/call · ping</span>
            </div>
          </div>
          <div className="clientList">
            <strong>Clientes MCP recentes</strong>
            {(data.mcpClients || []).length === 0 && <span>Nenhum cliente registrado ainda.</span>}
            {(data.mcpClients || []).map(client => <span key={client.client_name}>{client.client_name}</span>)}
          </div>
        </div>
      </section>

      <section className="panel kanbanPanel">
        <div className="sectionHead">
          <div className="sectionTitle"><KanbanSquare size={18}/> Kanban dos agentes</div>
          <form onSubmit={createCard} className="inlineForm">
            <input value={cardTitle} onChange={e => setCardTitle(e.target.value)} placeholder="Novo card para os agentes…" />
            <button><Plus size={16}/> Criar</button>
          </form>
        </div>
        <div className="kanban">
          {(data.columns || []).map(col => (
            <div className="column" key={col.column_id}>
              <div className="columnTitle"><span>{col.column_name}</span><b>{col.cards?.length || 0}</b></div>
              {(col.cards || []).map(card => <Card key={card.id} card={card} />)}
            </div>
          ))}
        </div>
      </section>

      <section className="gridTwo bottomGrid">
        <div className="panel chatPanel">
          <div className="sectionTitle"><MessageSquare size={18}/> Chat interno</div>
          <div className="messages">
            {(data.messages || []).map(m => <div key={m.id} className={`msg ${m.kind}`}><b>{m.author_name}</b><p>{m.body}</p></div>)}
          </div>
          <form onSubmit={sendMessage} className="chatForm">
            <input value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Falar com os agentes…" />
            <button>Enviar</button>
          </form>
        </div>

        <div className="panel recordsPanel">
          <div className="sectionHead">
            <div className="sectionTitle"><Brain size={18}/> Memória recente</div>
            <label className="search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="filtrar" /></label>
          </div>
          <div className="recordList">
            {filteredRecords.map(r => <article key={r.path}><strong>{r.title}</strong><code>{r.path}</code></article>)}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return <div className="metric">{icon}<span>{label}</span><strong>{value}</strong></div>;
}

function Card({ card }) {
  return <article className={`card priority-${card.priority}`}><strong>{card.title}</strong><p>{card.description}</p><span>{card.assignee || 'sem agente'} · {card.priority}</span></article>;
}

function buildGraph() {
  return [
    { label: 'PunkRecords', x: 50, y: 50, kind: 'root' },
    { label: 'MCP', x: 18, y: 24, kind: 'small' },
    { label: 'Kanban', x: 82, y: 20, kind: 'small' },
    { label: 'Chat', x: 18, y: 80, kind: 'small' },
    { label: 'Supabase', x: 82, y: 78, kind: 'small' },
    { label: 'TanIA', x: 50, y: 12, kind: 'signature' },
  ];
}
