
'use client';

import { useMemo, useState } from 'react';
import { Bot, Brain, Cable, KanbanSquare, MessageSquare, Plus, Radio, Search, Sparkles } from 'lucide-react';

export default function Dashboard({ initialData, error }) {
  const [data, setData] = useState(initialData);
  const [chatText, setChatText] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [search, setSearch] = useState('');
  const graphNodes = useMemo(() => buildGraph(data), [data]);

  async function refresh() {
    const res = await fetch('/api/state');
    if (res.ok) setData(await res.json());
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!chatText.trim()) return;
    await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: chatText, author_name: 'Operador', kind: 'chat' }) });
    setChatText('');
    refresh();
  }

  async function createCard(e) {
    e.preventDefault();
    if (!cardTitle.trim()) return;
    await fetch('/api/kanban/cards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: cardTitle, description: 'Criado pelo cockpit PunkRecords', priority: 'medium' }) });
    setCardTitle('');
    refresh();
  }

  const filteredRecords = (data.recentRecords || []).filter(r => !search || `${r.title} ${r.path}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="shell">
      <section className="hero panel">
        <div className="brandRow">
          <div className="duck">◖●◗</div>
          <div>
            <p className="eyebrow">TanIA / PunkRecords Command OS</p>
            <h1>Super Cérebro SaaS para agentes, humanos e qualquer IA via MCP.</h1>
          </div>
        </div>
        <p className="heroText">Kanban interno estilo Runrun.it/Trello, chat operacional, memória Supabase e endpoint MCP universal em uma interface preta, branca e viva.</p>
        <div className="metrics">
          <Metric icon={<Brain />} label="Registros" value={data.stats?.records ?? '—'} />
          <Metric icon={<Sparkles />} label="Chunks" value={data.stats?.chunks ?? '—'} />
          <Metric icon={<Cable />} label="Links" value={data.stats?.links ?? '—'} />
          <Metric icon={<KanbanSquare />} label="Cards" value={data.stats?.cards ?? '—'} />
        </div>
        {error && <div className="error">Banco ainda não respondeu: {error}</div>}
      </section>

      <section className="gridTwo">
        <div className="panel graphPanel">
          <div className="sectionTitle"><Radio size={18}/> Grafo vivo</div>
          <div className="graphCanvas">
            {graphNodes.map((n) => <div key={n.label} className={`node ${n.kind}`} style={{ left: n.x + '%', top: n.y + '%' }}>{n.label}</div>)}
            <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none">
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
              <code>POST /api/mcp</code>
              <span>tools/list · tools/call · initialize</span>
            </div>
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

function buildGraph(data) {
  return [
    { label: 'PunkRecords', x: 50, y: 50, kind: 'root' },
    { label: 'MCP', x: 18, y: 24, kind: 'small' },
    { label: 'Kanban', x: 82, y: 20, kind: 'small' },
    { label: 'Chat', x: 18, y: 80, kind: 'small' },
    { label: 'Supabase', x: 82, y: 78, kind: 'small' },
    { label: 'TanIA', x: 50, y: 12, kind: 'signature' },
  ];
}
