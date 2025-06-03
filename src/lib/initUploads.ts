// src/lib/initUploads.ts
import fs from 'fs';

export function ensureUploadDir() {
  const uploadDir = '/mnt/railway/uploads/avatars';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`✓ Created persistent upload folder: ${uploadDir}`);
  }
}
