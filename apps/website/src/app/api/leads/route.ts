import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json() as { name?: unknown; email?: unknown; company?: unknown; message?: unknown };
  const { name, email, company, message } = body;
  // Validate types and cap lengths to prevent log injection
  const sanitize = (v: unknown, max = 500): string =>
    typeof v === 'string' ? v.slice(0, max).trim() : '';

  const safeName = sanitize(name, 200);
  const safeEmail = sanitize(email, 320);
  const safeCompany = sanitize(company, 200);
  const safeMessage = sanitize(message, 2000);

  if (!safeName || !safeEmail) {
    return NextResponse.json({ error: 'name and email required' }, { status: 400 });
  }
  // In production: send to CRM / email service
  console.info('[lead]', { name: safeName, email: safeEmail, company: safeCompany, message: safeMessage, ts: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
