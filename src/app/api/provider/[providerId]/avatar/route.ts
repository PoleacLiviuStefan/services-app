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

  // 1) Obținem form-data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Request-ul nu conține form-data validă" },
      { status: 400 }
    );
  }

  // 2) Extragem câmpul "avatar" (este un Blob pe Node)
  const fileField = formData.get("avatar");
  if (!fileField || !(fileField instanceof Blob)) {
    return NextResponse.json(
      { error: "Nu a fost furnizată nicio imagine validă" },
      { status: 400 }
    );
  }

  // 3) Transformăm Blob → Buffer
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

  // 4) Determinăm baza de upload din mediul de producție
  //    În .env ai definit: STORAGE_PATH="/mnt/railway/uploads/avatars"
  const uploadDir = process.env.STORAGE_PATH;
  console.log("STORAGE_PATH:", uploadDir);
  if (!uploadDir) {
    console.error("STORAGE_PATH nu este definit în mediu");
    return NextResponse.json(
      { error: "Server misconfiguration: STORAGE_PATH lipsă" },
      { status: 500 }
    );
  }

  // 5) Creăm directorul dacă nu există
  try {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    console.error("Eroare la crearea folderului de upload:", err);
    return NextResponse.json(
      { error: "Eroare la pregătirea spațiului de stocare" },
      { status: 500 }
    );
  }

  // 6) Generăm un nume unic + extensie
  const originalName = (fileField as any).name || "";
  const ext = path.extname(originalName) || "";
  const fileName = `${Date.now()}${ext}`;
  const destPath = path.join(uploadDir, fileName);

  // 7) Scriem fișierul pe disc
  try {
    await fs.promises.writeFile(destPath, buffer);
  } catch (err) {
    console.error("Eroare la salvarea fișierului:", err);
    return NextResponse.json(
      { error: "Eroare la salvarea imaginii" },
      { status: 500 }
    );
  }

  // 8) Construim URL-ul public cu FILE_ROUTE
  //    În .env ai definit: FILE_ROUTE="/uploads"
  const fileRoute = process.env.FILE_ROUTE;
  if (!fileRoute) {
    console.error("FILE_ROUTE nu este definit în mediu");
    return NextResponse.json(
      { error: "Server misconfiguration: FILE_ROUTE lipsă" },
      { status: 500 }
    );
  }
  // Deoarece STORAGE_PATH deja conține "uploads/avatars", nu mai adăugăm "avatars" în URL.
  // Imaginea va fi accesibilă la GET /uploads/<fileName>
  const imageUrl = `${fileRoute}/${fileName}`; 
  // ex: "/uploads/1748969086963.jpg"

  // 9) Găsim provider pentru a afla userId
  let providerRecord;
  try {
    providerRecord = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });
  } catch (err) {
    console.error("Eroare la prisma.provider.findUnique:", err);
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

  // 10) Actualizăm user.image în baza de date
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

  // 11) Răspundem cu URL-ul imaginii
  return NextResponse.json({ imageUrl });
}

export const PUT = withProviderAuth(putHandler);
