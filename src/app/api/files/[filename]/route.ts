import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mime from 'mime';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;
  const filePath = path.join('/mnt/storage', filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const fileBuffer = await fs.promises.readFile(filePath);
  const contentType = mime.getType(filename) || 'application/octet-stream';

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: { 'Content-Type': contentType },
  });
}
