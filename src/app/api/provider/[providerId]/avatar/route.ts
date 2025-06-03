// src/app/api/provider/[providerId]/avatar/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";
export const config = { api: { bodyParser: false } };

async function putHandler(
  req: Request,
  context: { params: { providerId: string } }
) {
  const { providerId } = context.params;

  // 1) Obținem FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Request-ul nu conține form-data validă" },
      { status: 400 }
    );
  }

  // 2) Luăm câmpul "avatar"
  const fileField = formData.get("avatar");

  // Verificăm că există și că este un Blob (Next.js folosește Blob/ReadableStream pentru fișiere)
  if (!fileField || !(fileField instanceof Blob)) {
    return NextResponse.json(
      { error: "Nu a fost furnizată nicio imagine validă" },
      { status: 400 }
    );
  }

  // 3) Conversie în Buffer
  let buffer: Buffer;
  try {
    const arrayBuffer = await fileField.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("Eroare la conversia Blob în Buffer:", err);
    return NextResponse.json(
      { error: "Eroare la procesarea imaginii" },
      { status: 500 }
    );
  }

  // 4) Determinăm STORAGE_PATH (din .env) și subfolderul avatars
  const baseDir = process.env.STORAGE_PATH;
  if (!baseDir) {
    console.error("STORAGE_PATH nu este definit în mediu");
    return NextResponse.json(
      { error: "Server misconfiguration: STORAGE_PATH lipsă" },
      { status: 500 }
    );
  }
  const uploadDir = path.join(baseDir, "avatars");

  try {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    console.error("Eroare la crearea folderului avatars:", err);
    return NextResponse.json(
      { error: "Eroare la pregătirea spațiului de stocare" },
      { status: 500 }
    );
  }

  // 5) Construim nume de fișier unic + extensie
  const originalName = (fileField as any).name || ""; // În Node, Blob-ul poate să nu aibă `.name`, dar Next.js păstrează `name`
  const ext = path.extname(originalName) || "";
  const fileName = `${Date.now()}${ext}`;
  const destPath = path.join(uploadDir, fileName);

  // 6) Scriem fișierul pe disc
  try {
    await fs.promises.writeFile(destPath, buffer);
  } catch (err) {
    console.error("Eroare la salvarea fișierului:", err);
    return NextResponse.json(
      { error: "Eroare la salvarea imaginii" },
      { status: 500 }
    );
  }

  // 7) Generăm URL-ul public (ex: /files/avatars/<fileName>)
  const fileRoute = process.env.FILE_ROUTE;
  if (!fileRoute) {
    console.error("FILE_ROUTE nu este definit în mediu");
    return NextResponse.json(
      { error: "Server misconfiguration: FILE_ROUTE lipsă" },
      { status: 500 }
    );
  }
  const imageUrl = `${fileRoute}/avatars/${fileName}`;

  // 8) Găsim provider pentru a extrage userId
  let providerRecord;
  try {
    providerRecord = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });
  } catch (err) {
    console.error("Eroare la query prisma.provider.findUnique:", err);
    return NextResponse.json(
      { error: "Eroare internă la găsirea providerului" },
      { status: 500 }
    );
  }

  if (!providerRecord) {
    return NextResponse.json(
      { error: "Provider not found" },
      { status: 404 }
    );
  }

  // 9) Actualizăm câmpul User.image în baza de date
  try {
    await prisma.user.update({
      where: { id: providerRecord.userId },
      data: { image: imageUrl },
    });
  } catch (err) {
    console.error("Eroare la prisma.user.update:", err);
    return NextResponse.json(
      { error: "Eroare la actualizarea bazei de date" },
      { status: 500 }
    );
  }

  // 10) Răspundem cu URL-ul imaginii
  return NextResponse.json({ imageUrl });
}

export const PUT = withProviderAuth(putHandler);
