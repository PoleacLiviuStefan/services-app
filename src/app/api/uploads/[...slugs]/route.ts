// src/app/api/uploads/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Dacă vrei să citești variabila din process.env, poți:
// const FILE_ROUTE = process.env.FILE_ROUTE; // "/uploads"
// const STORAGE_PATH = process.env.STORAGE_PATH; // "/mnt/railway/uploads/avatars"


export async function GET(request: NextRequest) {
  // Extragem restul de path după /uploads
  // ex: GET /uploads/avatars/1748976910230.jpg
  // slugParts = ["avatars", "1748976910230.jpg"]
  const slugParts = request.nextUrl.pathname
    .slice(1)             // elimină slash-ul de la început
    .split('/')           // e.g. ["uploads", "avatars", "1748976910230.jpg"]
    .slice(1);            // vrem doar partea după "uploads", deci scădem index 0

  if (slugParts.length === 0) {
    return NextResponse.json({ error: 'Niciun fișier specificat.' }, { status: 400 });
  }

  // Construim calea completă către fișier
  // slugParts = ["avatars", "1748976910230.jpg"], vrem să mapăm la "/mnt/railway/uploads/avatars/1748976910230.jpg"
  const filePath = path.join(process.env.STORAGE_PATH, ...slugParts.slice(1)); 
  // Observație: dacă intenția e să ai doar fișiere direct în STORAGE_PATH (fără subfolder "avatars"),
  // atunci ai putea face path.join(STORAGE_PATH, ...slugParts). Ajustează după structura dorită.

  // De exemplu, dacă salvezi avatar direct în /mnt/railway/uploads/avatars/1748976910230.jpg 
  // și apelezi /uploads/1748976910230.jpg, atunci slugParts === ["1748976910230.jpg"] 
  // și filePath = path.join(STORAGE_PATH, "1748976910230.jpg").

  // Verifică existența:
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Fișierul nu a fost găsit.' }, { status: 404 });
  }

  // Detectăm mime type simplu după extensie
  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  if (ext === '.png') contentType = 'image/png';
  if (ext === '.gif') contentType = 'image/gif';
  // poți adăuga și altele, după nevoie

  const fileBuffer = await fs.promises.readFile(filePath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
