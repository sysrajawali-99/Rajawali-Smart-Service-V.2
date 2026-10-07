import fs from 'fs';
import path from 'path';

/**
 * Migration Script: Migrate uploaded files to tenant-scoped folder structure
 * - Creates uploads/comp-main if not present
 * - Moves any legacy root files in uploads/ into uploads/comp-main/
 * - Idempotent: can be executed multiple times safely
 */
export function migrateUploadsToTenants(): { movedCount: number; message: string } {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const defaultTenantDir = path.join(uploadsDir, 'comp-main');
  if (!fs.existsSync(defaultTenantDir)) {
    fs.mkdirSync(defaultTenantDir, { recursive: true });
  }

  const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
  let movedCount = 0;

  for (const entry of entries) {
    if (entry.isFile()) {
      const oldPath = path.join(uploadsDir, entry.name);
      const newPath = path.join(defaultTenantDir, entry.name);
      try {
        if (!fs.existsSync(newPath)) {
          fs.renameSync(oldPath, newPath);
          movedCount++;
        }
      } catch (err) {
        console.warn(`[MigrateUploads] Warning moving file ${entry.name}:`, err);
      }
    }
  }

  return {
    movedCount,
    message: `Migrasi file unggahan selesai: ${movedCount} file lama dipindahkan ke folder tenant uploads/comp-main/`,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = migrateUploadsToTenants();
  console.log(result.message);
}
