import { getAudit } from '@/lib/db.js';
import AuditView from './audit-view.js';

export default async function AuditPage({ params }) {
  const { id } = await params;
  const audit = getAudit(id);

  const initialData = audit ? {
    id: audit.id,
    url: audit.url,
    status: audit.status,
    currentTool: audit.current_tool,
    error: audit.error,
    results: audit.results,
  } : null;

  return <AuditView initialData={initialData} />;
}
