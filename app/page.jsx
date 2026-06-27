
import Dashboard from '../components/Dashboard';
import { getDashboardData } from '../lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let data;
  let error = null;
  try {
    data = await getDashboardData();
  } catch (err) {
    error = err.message;
    data = { stats: {}, agents: [], columns: [], messages: [], recentRecords: [] };
  }
  return <Dashboard initialData={data} error={error} />;
}
