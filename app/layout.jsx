
import './globals.css';

export const metadata = {
  title: 'PunkRecords — Super Cérebro SaaS',
  description: 'Kanban, chat e MCP para agentes conectados ao Super Cérebro.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
