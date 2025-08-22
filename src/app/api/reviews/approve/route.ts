import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const APPROVED_PATH = path.join(process.cwd(), 'src', 'data', 'approved.json');

function readApproved(): Record<string, boolean> {
  try {
    const raw = fs.readFileSync(APPROVED_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { id, approved } = body || {};
  if (typeof id !== 'number' || typeof approved !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body. Expected { id:number, approved:boolean }' }, { status: 400 });
  }
  const map = readApproved();
  map[String(id)] = approved;
  fs.writeFileSync(APPROVED_PATH, JSON.stringify(map, null, 2), 'utf-8');
  return NextResponse.json({ status: 'ok', id, approved });
}
