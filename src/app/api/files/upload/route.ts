import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// dezactivează body parsing-ul intern
export const config = { api: { bodyParser: false } };

export async function POST(req: Request) {
  const form = formidable({
    uploadDir: '/mnt/storage',
    keepExtensions: true,
    multiples: false,
  });

  const { fields, files } = await new Promise<{
    fields: formidable.Fields;
    files: formidable.Files;
  }>((resolve, reject) =>
    form.parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    )
  );

  const file = Array.isArray(files.file)
    ? files.file[0]
    : files.file;

  const filename = path.basename(file.filepath);

  // Salvează în Postgres doar filename-ul
  await prisma.user.update({
    where: { id: fields.userId as string },
    data: { avatarPath: filename },
  });

  return NextResponse.json({ filename });
}
