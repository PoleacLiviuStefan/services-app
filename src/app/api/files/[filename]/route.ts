import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mime from "mime";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { file: string[] } }
) {
  // params.file este un array de segmente: de ex ["avatars","1234.jpg"]
  const segments = params.file;
  const filePath = path.join(process.env.STORAGE_PATH, ...segments);


  // Verificăm dacă există fișierul
  if (!fs.existsSync(filePath)) {
    return new NextResponse(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Determinăm MIME-type pe baza extensiei
  const contentType = mime.getType(filePath) || "application/octet-stream";

  // Citim fișierul ca Buffer
  const buffer = await fs.promises.readFile(filePath);

  // Returnăm buffer-ul cu headerul corespunzător
  return new NextResponse(buffer, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}
