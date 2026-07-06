import { getAudit } from '../../../../lib/db.js';

export async function GET(request, { params }) {
  const { id } = await params;
  const audit = getAudit(id);

  if (!audit) {
    return Response.json({ error: 'Audit not found' }, { status: 404 });
  }

  return Response.json({
    id: audit.id,
    url: audit.url,
    status: audit.status,
    currentTool: audit.current_tool,
    results: audit.results,
    error: audit.error,
    createdAt: audit.created_at,
    updatedAt: audit.updated_at,
  });
}
