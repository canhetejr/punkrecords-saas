'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bot,
  Brain,
  Cable,
  CheckCircle2,
  Clock3,
  Command,
  KanbanSquare,
  Library,
  MessageSquare,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Trash2,
  Globe2,
  Terminal,
  Sparkles,
} from 'lucide-react';

export default function Dashboard({ initialData, error }) {
  const [data, setData] = useState(initialData);
  const [chatText, setChatText] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [mcpForm, setMcpForm] = useState({ name: '', transport: 'http', url: '', command: '', args: '', category: 'custom', description: '' });
  const [search, setSearch] = useState('');
  const app = data.app || {
    brand: 'TanIA / PunkRecords Command OS',
    publicUrl: 'https://punkrecords.canhete.com',
    mcpPath: '/api/mcp',
    mcpUrl: 'https://punkrecords.canhete.com/api/mcp',
  };
  const graphNodes = useMemo(() => buildGraph(), []);
  const filteredRecords = (data.recentRecords || []).filter((record) => {
    const haystack = `${record.title} ${record.path}`.toLowerCase();
    return !search || haystack.includes(search.toLowerCase());
  });

  async function refresh() {
    const res = await fetch('/api/state');
    if (res.ok) setData(await res.json());
  }

  async function sendMessage(event) {
    event.preventDefault();
    const body = chatText.trim();
    if (!body) return;
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body, author_name: 'Operador', kind: 'chat' }),
    });
    setChatText('');
    refresh();
  }

  async function createCard(event) {
    event.preventDefault();
    const title = cardTitle.trim();
    if (!title) return;
    await fetch('/api/kanban/cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, description: 'Criado pelo cockpit PunkRecords', priority: 'medium' }),
    });
    setCardTitle('');
    refresh();
  }

  async function createMcp(event) {
    event.preventDefault();
    const payload = {
      ...mcpForm,
      name: mcpForm.name.trim(),
      url: mcpForm.url.trim(),
      command: mcpForm.command.trim(),
      args: mcpForm.args.trim(),
      category: mcpForm.category.trim() || 'custom',
      description: mcpForm.description.trim(),
      status: 'available',
    };
    if (!payload.name) return;
    await fetch('/api/mcp-library', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setMcpForm({ name: '', transport: 'http', url: '', command: '', args: '', category: 'custom', description: '' });
    refresh();
  }

  async function removeMcp(id) {
    await fetch(`/api/mcp-library/${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <main className="appShell">
      <header className="topbar glass">
        <a className="brandMark" href="#top" aria-label="PunkRecords TanIA">
          <span className="duck" aria-hidden="true">◖●◗</span>
          <span>
            <b>PunkRecords</b>
            <small>Super Cérebro SaaS</small>
          </span>
        </a>
        <nav className="topnav" aria-label="Navegação principal">
          <a href="#graph">Grafo</a>
          <a href="#kanban">Kanban</a>
          <a href="#mcp-library">MCPs</a>
          <a href="#chat">Chat</a>
          <a href={app.mcpUrl} target="_blank" rel="noreferrer">MCP <ArrowUpRight size={13} /></a>
        </nav>
        <button className="ghostButton" type="button" onClick={refresh}><Activity size={15} /> Sync</button>
      </header>

      <section id="top" className="heroGrid">
        <div className="heroCopy panelSoft">
          <div className="overline"><Command size={14} /> {app.brand}</div>
          <h1>Um cockpit bonito, responsivo e vivo para agentes conectados ao seu cérebro.</h1>
          <p>
            PunkRecords une memória, kanban, chat e MCP num painel premium em preto e branco — pronto para humano, TanIA e qualquer IA operar junto.
          </p>
          <div className="heroActions">
            <a className="primaryButton" href="#kanban">Abrir operação</a>
            <a className="secondaryButton" href={app.mcpUrl} target="_blank" rel="noreferrer">Endpoint MCP</a>
          </div>
          <div className="statusRail" aria-label="Status do sistema">
            <StatusPill icon={<CheckCircle2 />} text="Produção online" strong />
            <StatusPill icon={<ShieldCheck />} text="Banco saudável" />
            <StatusPill icon={<Cable />} text={app.mcpPath} />
          </div>
          {error && <div className="error">Banco ainda não respondeu: {error}</div>}
        </div>

        <div className="heroConsole panelSoft" aria-label="Resumo operacional">
          <div className="consoleHeader">
            <span className="dotGroup"><i/><i/><i/></span>
            <code>punkrecords.canhete.com</code>
          </div>
          <div className="signalCard">
            <span>Registros indexados</span>
            <strong>{formatNumber(data.stats?.records)}</strong>
            <small>{formatNumber(data.stats?.chunks)} chunks · {formatNumber(data.stats?.links)} links</small>
          </div>
          <div className="miniGrid">
            <MiniStat label="Agentes" value={data.stats?.agents ?? data.agents?.length} />
            <MiniStat label="MCP clients" value={data.stats?.mcp_clients} />
            <MiniStat label="Cards" value={data.stats?.cards} />
            <MiniStat label="Mensagens" value={data.stats?.messages} />
          </div>
        </div>
      </section>

      <section className="metricsDeck" aria-label="Métricas principais">
        <Metric icon={<Brain />} label="Registros" value={data.stats?.records} helper="memória total" />
        <Metric icon={<Sparkles />} label="Chunks" value={data.stats?.chunks} helper="fragmentos RAG" />
        <Metric icon={<Bot />} label="Agentes" value={data.stats?.agents ?? data.agents?.length} helper="operadores" />
        <Metric icon={<Cable />} label="Clientes MCP" value={data.stats?.mcp_clients} helper="integrações" />
        <Metric icon={<Library />} label="Biblioteca MCP" value={data.stats?.mcp_servers ?? data.mcpServers?.length} helper="servidores" />
        <Metric icon={<KanbanSquare />} label="Cards" value={data.stats?.cards} helper="em fluxo" />
        <Metric icon={<MessageSquare />} label="Mensagens" value={data.stats?.messages} helper="war room" />
      </section>

      <section className="mainGrid">
        <article id="graph" className="panel graphPanel">
          <SectionTitle icon={<Radio />} kicker="Mapa vivo" title="Grafo operacional" />
          <div className="graphCanvas">
            <svg className="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="50" y1="50" x2="18" y2="24" />
              <line x1="50" y1="50" x2="82" y2="20" />
              <line x1="50" y1="50" x2="18" y2="80" />
              <line x1="50" y1="50" x2="82" y2="78" />
              <line x1="50" y1="50" x2="50" y2="12" />
            </svg>
            {graphNodes.map((node) => (
              <div key={node.label} className={`node ${node.kind}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
                <span>{node.label}</span>
              </div>
            ))}
          </div>
        </article>

        <aside className="sideStack">
          <article className="panel agentsPanel">
            <SectionTitle icon={<Bot />} kicker="Equipe" title="Agentes conectados" />
            <div className="agentList">
              {(data.agents || []).map((agent) => <AgentRow key={agent.id} agent={agent} />)}
            </div>
          </article>

          <article className="panel mcpPanel">
            <SectionTitle icon={<Cable />} kicker="JSON-RPC" title="MCP ativo" />
            <div className="endpointBox">
              <code>POST {app.mcpPath}</code>
              <span>initialize · tools/list · tools/call · ping</span>
            </div>
            <div className="clientList">
              <strong>Clientes recentes</strong>
              {(data.mcpClients || []).length === 0 && <span>Nenhum cliente registrado ainda.</span>}
              {(data.mcpClients || []).map((client) => <span key={client.client_name}>{client.client_name}</span>)}
            </div>
          </article>
        </aside>
      </section>

      <section id="mcp-library" className="panel mcpLibraryPanel">
        <div className="sectionHead">
          <SectionTitle icon={<Library />} kicker="Catálogo" title="Biblioteca de MCPs" />
          <span className="libraryCount">{data.mcpServers?.length || 0} MCPs cadastrados</span>
        </div>
        <form onSubmit={createMcp} className="mcpForm">
          <input value={mcpForm.name} onChange={(e) => setMcpForm({ ...mcpForm, name: e.target.value })} placeholder="Nome do MCP" />
          <select value={mcpForm.transport} onChange={(e) => setMcpForm({ ...mcpForm, transport: e.target.value })}>
            <option value="http">HTTP remoto</option>
            <option value="stdio">stdio/local</option>
          </select>
          {mcpForm.transport === 'http' ? (
            <input value={mcpForm.url} onChange={(e) => setMcpForm({ ...mcpForm, url: e.target.value })} placeholder="https://servidor.com/mcp" />
          ) : (
            <input value={mcpForm.command} onChange={(e) => setMcpForm({ ...mcpForm, command: e.target.value })} placeholder="npx, uvx ou comando" />
          )}
          <input value={mcpForm.args} onChange={(e) => setMcpForm({ ...mcpForm, args: e.target.value })} placeholder="args: -y pacote-mcp" />
          <input value={mcpForm.category} onChange={(e) => setMcpForm({ ...mcpForm, category: e.target.value })} placeholder="categoria" />
          <input className="mcpDescriptionInput" value={mcpForm.description} onChange={(e) => setMcpForm({ ...mcpForm, description: e.target.value })} placeholder="descrição rápida" />
          <button className="primaryButton buttonReset"><Plus size={16} /> Adicionar MCP</button>
        </form>
        <div className="mcpLibraryGrid">
          {(data.mcpServers || []).map((server) => <McpServerCard key={server.id} server={server} onRemove={removeMcp} />)}
        </div>
      </section>

      <section id="kanban" className="panel kanbanPanel">
        <div className="sectionHead">
          <SectionTitle icon={<KanbanSquare />} kicker="Fluxo" title="Kanban dos agentes" />
          <form onSubmit={createCard} className="inlineForm">
            <input value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} placeholder="Novo card para os agentes…" />
            <button className="primaryButton buttonReset"><Plus size={16} /> Criar</button>
          </form>
        </div>
        <div className="kanban" aria-label="Quadro kanban">
          {(data.columns || []).map((column) => (
            <div className="column" key={column.column_id}>
              <div className="columnTitle"><span>{column.column_name}</span><b>{column.cards?.length || 0}</b></div>
              {(column.cards || []).map((card) => <Card key={card.id} card={card} />)}
              {(column.cards || []).length === 0 && <div className="emptySlot">Aguardando próximo movimento</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="bottomGrid">
        <article id="chat" className="panel chatPanel">
          <SectionTitle icon={<MessageSquare />} kicker="War room" title="Chat interno" />
          <div className="messages">
            {(data.messages || []).map((message) => <Message key={message.id} message={message} />)}
          </div>
          <form onSubmit={sendMessage} className="chatForm">
            <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Falar com os agentes…" />
            <button className="primaryButton buttonReset">Enviar</button>
          </form>
        </article>

        <article className="panel recordsPanel">
          <div className="sectionHead compact">
            <SectionTitle icon={<Brain />} kicker="Vault" title="Memória recente" />
            <label className="search"><Search size={15}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="filtrar" /></label>
          </div>
          <div className="recordList">
            {filteredRecords.map((record) => <Record key={record.path} record={record} />)}
          </div>
        </article>
      </section>

      <nav className="mobileDock glass" aria-label="Atalhos mobile">
        <a href="#top"><Command size={17} /> Início</a>
        <a href="#graph"><Radio size={17} /> Grafo</a>
        <a href="#kanban"><KanbanSquare size={17} /> Kanban</a>
        <a href="#chat"><MessageSquare size={17} /> Chat</a>
      </nav>
    </main>
  );
}

function SectionTitle({ icon, kicker, title }) {
  return <div className="sectionTitle"><span>{icon}</span><div><small>{kicker}</small><h2>{title}</h2></div></div>;
}

function StatusPill({ icon, text, strong }) {
  return <span className={strong ? 'statusPill strong' : 'statusPill'}>{icon}{text}</span>;
}

function Metric({ icon, label, value, helper }) {
  return <article className="metric">{icon}<span>{label}</span><strong>{formatNumber(value)}</strong><small>{helper}</small></article>;
}

function MiniStat({ label, value }) {
  return <div className="miniStat"><span>{label}</span><b>{formatNumber(value)}</b></div>;
}

function AgentRow({ agent }) {
  return (
    <div className="agent">
      <div className="agentAvatar">{agent.avatar === 'duck' ? '◖●◗' : agent.name?.[0]}</div>
      <div className="agentMain">
        <strong>{agent.name}</strong>
        <span>{agent.role} · {agent.model || 'local'}</span>
      </div>
      <em className={agent.status}>{agent.status || 'idle'}</em>
    </div>
  );
}

function McpServerCard({ server, onRemove }) {
  const isHttp = server.transport === 'http';
  const target = isHttp ? server.url : `${server.command || ''} ${(server.args || []).join(' ')}`.trim();
  return (
    <article className={`mcpServerCard status-${server.status}`}>
      <div className="mcpServerTop">
        <span className="mcpTransport">{isHttp ? <Globe2 size={15} /> : <Terminal size={15} />} {server.transport}</span>
        <span className={server.official ? 'mcpBadge official' : 'mcpBadge'}>{server.official ? 'oficial' : server.status}</span>
      </div>
      <strong>{server.name}</strong>
      <p>{server.description || 'MCP customizado sem descrição.'}</p>
      <code>{target || 'sem destino configurado'}</code>
      <div className="mcpServerFoot">
        <span>{server.category}</span>
        {!server.official && <button type="button" className="dangerButton" onClick={() => onRemove(server.id)}><Trash2 size={14} /> remover</button>}
      </div>
    </article>
  );
}

function Card({ card }) {
  return (
    <article className={`card priority-${card.priority}`}>
      <strong>{card.title}</strong>
      <p>{card.description}</p>
      <span><Clock3 size={12} /> {card.assignee || 'sem agente'} · {card.priority}</span>
    </article>
  );
}

function Message({ message }) {
  return <div className={`msg ${message.kind}`}><b>{message.author_name}</b><p>{message.body}</p></div>;
}

function Record({ record }) {
  return <article><strong>{record.title}</strong><code>{record.path}</code></article>;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
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
