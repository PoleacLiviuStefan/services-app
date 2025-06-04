// src/app/api/provider/[providerId]/avatar/route.ts

import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";

export const runtime = "nodejs";
export const config = { api: { bodyParser: false } };

// 1) Construim endpoint-ul corect pentru MinIO (adăugăm https:// dacă lipsește)
const rawEndpoint = process.env.MINIO_ENDPOINT || "";
const MINIO_ENDPOINT = rawEndpoint.match(/^https?:\/\//)
  ? rawEndpoint
  : `https://${rawEndpoint}`;

// 2) Inițializăm clientul S3 (MinIO)
//    - forcePathStyle: true este obligatoriu pentru S3-compatibile precum MinIO
//    - folosește region arbitrariu (ex.: "us-east-1")
const s3 = new S3Client({
  endpoint: MINIO_ENDPOINT,
  forcePathStyle: true,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
});

// 3) Handler-ul real care va fi apelat de Next.js pentru metoda PUT
async function handler(
  req: Request,
  { params }: { params: { providerId: string } }
) {
  const { providerId } = params;

  // 3.1) Extragem form-data; dacă nu există, răspundem cu 400 Bad Request
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Request-ul nu conține form-data validă" },
      { status: 400 }
    );
  }

  // 3.2) Obținem Blob-ul din câmpul "avatar"
  const fileField = formData.get("avatar");
  if (!fileField || !(fileField instanceof Blob)) {
    return NextResponse.json(
      { error: "Nu a fost furnizată nicio imagine validă" },
      { status: 400 }
    );
  }

  // 3.3) Transformăm Blob în Buffer (pentru upload către S3)
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

  // 3.4) Generăm un key unic pentru obiect, păstrând extensia originală
  const originalName = (fileField as any).name || "";
  const ext = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf("."))
    : "";
  const timestamp = Date.now();
  const key = `avatars/${timestamp}${ext}`; // ex: "avatars/1681234567890.png"

  // 3.5) Upload către MinIO (S3)
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: fileField.type, // ex: "image/png"
        ACL: "public-read",          // dacă bucket-ul este configurat public
      })
    );
  } catch (err) {
    console.error("Eroare la upload către MinIO:", err);
    return NextResponse.json(
      { error: "Eroare la salvarea imaginii în storage" },
      { status: 500 }
    );
  }

  // 3.6) Construim URL-ul public (presupunem bucket public)
  //      Format: https://<MINIO_ENDPOINT>/<BUCKET>/<key>
  const imageUrl = `${MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${key}`;

  // 3.7) Găsim userId-ul asociat providerId prin Prisma
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

  // 3.8) Actualizăm câmpul `image` în tabela `user`
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

  // 3.9) Returnăm URL-ul imaginii
  return NextResponse.json({ imageUrl });
}

// 4) Exportăm metoda PUT cu middleware-ul de autentificare aplicat
export const PUT = withProviderAuth(handler);
