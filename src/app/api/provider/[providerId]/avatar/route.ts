// app/api/provider/[providerId]/avatar/route.ts

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
  const { providerId } = await context.params;

  // 1) obținem FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Request-ul nu conține form-data validă" },
      { status: 400 }
    );
  }

  // 2) luăm câmpul "avatar"
  const fileField = formData.get("avatar");
  if (!fileField || !(fileField instanceof File)) {
    return NextResponse.json(
      { error: "Nu a fost furnizată nicio imagine" },
      { status: 400 }
    );
  }

  // 3) conversie în Buffer
  const arrayBuffer = await fileField.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 4) determini STORAGE_PATH (din .env) și avatare sub acel folder
  //    default local: "./public/uploads", în producție "/mnt/railway"
  const baseDir = process.env.STORAGE_PATH!;
  const uploadDir = path.join(baseDir, "avatars");
  await fs.promises.mkdir(uploadDir, { recursive: true });

  // 5) creezi nume unic + extensie
  const originalName = fileField.name;
  const ext = path.extname(originalName) || "";
  const fileName = `${Date.now()}${ext}`;
  const destPath = path.join(uploadDir, fileName);

  // 6) scrii fișierul pe disc
  try {
    await fs.promises.writeFile(destPath, buffer);
  } catch (err) {
    console.error("Eroare la salvarea fișierului:", err);
    return NextResponse.json(
      { error: "Eroare la salvarea imaginii" },
      { status: 500 }
    );
  }

  // 7) generezi URL-ul public: /files/avatars/<fileName>
  const imageUrl = `${process.env.FILE_ROUTE}/avatars/${fileName}`;

  // 8) găsești provider + userId
  const providerRecord = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { userId: true },
  });
  if (!providerRecord) {
    return NextResponse.json(
      { error: "Provider not found" },
      { status: 404 }
    );
  }

  // 9) actualizezi User.image
  await prisma.user.update({
    where: { id: providerRecord.userId },
    data: { image: imageUrl },
  });

  // 10) răspunzi cu URL-ul imaginii
  return NextResponse.json({ imageUrl });
}

export const PUT = withProviderAuth(putHandler);
