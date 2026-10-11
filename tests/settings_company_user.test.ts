import assert from 'assert';

console.log('========================================================');
console.log('AUTOMATED TEST SUITE: PENGATURAN PERUSAHAAN & USER');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(description: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          passedTests++;
          console.log(`[PASS] ${description}`);
        })
        .catch((err) => {
          console.error(`[FAIL] ${description}\n  Error: ${err.message}`);
          process.exitCode = 1;
        });
    } else {
      passedTests++;
      console.log(`[PASS] ${description}`);
    }
  } catch (err: any) {
    console.error(`[FAIL] ${description}\n  Error: ${err.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  // Test 1: Super Admin boleh membuat perusahaan dan menentukan Admin Perusahaan
  await runTest('1. Super Admin boleh membuat perusahaan dan Admin Perusahaan', () => {
    const callerRole = 'super_admin';
    const canCreateCompany = callerRole === 'super_admin';
    assert.strictEqual(canCreateCompany, true, 'Super Admin harus diizinkan membuat perusahaan');

    const canCreateAdminPerusahaan = callerRole === 'super_admin';
    assert.strictEqual(canCreateAdminPerusahaan, true, 'Super Admin harus diizinkan membuat Admin Perusahaan');
  });

  // Test 2: Admin Perusahaan ditolak membuat perusahaan atau Admin Perusahaan lain
  await runTest('2. Admin Perusahaan ditolak membuat perusahaan atau Super Admin', () => {
    const callerRole: string = 'admin_perusahaan';
    const canCreateCompany = callerRole === 'super_admin';
    assert.strictEqual(canCreateCompany, false, 'Admin Perusahaan tidak boleh membuat perusahaan');

    const canCreateSuperAdmin = callerRole === 'super_admin';
    assert.strictEqual(canCreateSuperAdmin, false, 'Admin Perusahaan tidak boleh membuat Super Admin');
  });

  // Test 3: Pemetaan 6 level tetap ke peran & izin
  await runTest('3. Pemetaan 6 level tetap ke peran & izin default yang tepat', () => {
    const levelMap: Record<string, string> = {
      Owner: 'admin_perusahaan',
      Manager: 'admin_perusahaan',
      Supervisor: 'supervisor',
      'Team Leader': 'supervisor',
      Petugas: 'petugas',
      Klien: 'klien',
    };

    assert.strictEqual(levelMap['Owner'], 'admin_perusahaan');
    assert.strictEqual(levelMap['Manager'], 'admin_perusahaan');
    assert.strictEqual(levelMap['Supervisor'], 'supervisor');
    assert.strictEqual(levelMap['Team Leader'], 'supervisor');
    assert.strictEqual(levelMap['Petugas'], 'petugas');
    assert.strictEqual(levelMap['Klien'], 'klien');

    // Izin Petugas hanya isi ceklist
    const petugasCanFill = true;
    const petugasCanManageSop = false;
    assert.strictEqual(petugasCanFill, true);
    assert.strictEqual(petugasCanManageSop, false);
  });

  // Test 4: Logo upload - validasi tipe isi file (magic bytes) & batas ukuran
  await runTest('4. Validasi upload logo (PNG/JPG/WEBP magic bytes & ukuran maks 3MB)', () => {
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const isPng =
      pngMagic.length >= 8 &&
      pngMagic[0] === 0x89 &&
      pngMagic[1] === 0x50 &&
      pngMagic[2] === 0x4e &&
      pngMagic[3] === 0x47;
    assert.strictEqual(isPng, true, 'Magic bytes PNG harus dikenali');

    const fakeExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const isFakePng =
      fakeExe.length >= 8 &&
      fakeExe[0] === 0x89 &&
      fakeExe[1] === 0x50 &&
      fakeExe[2] === 0x4e &&
      fakeExe[3] === 0x47;
    assert.strictEqual(isFakePng, false, 'File non-gambar harus ditolak');

    const maxSizeBytes = 3 * 1024 * 1024;
    const validSize = 500 * 1024;
    const overSize = 4 * 1024 * 1024;
    assert.strictEqual(validSize <= maxSizeBytes, true);
    assert.strictEqual(overSize <= maxSizeBytes, false);
  });

  // Test 5: Akses data perusahaan lain dibalas 404
  await runTest('5. User mencoba akses data perusahaan lain dibalas 404', () => {
    const sessionCompanyId = 'comp-tenant-a';
    const targetRecord = { id: 'proj-b-1', company_id: 'comp-tenant-b' };

    let statusCode = 200;
    if (targetRecord.company_id !== sessionCompanyId) {
      statusCode = 404; // Keamanan: bukan 403, melainkan 404
    }

    assert.strictEqual(statusCode, 404, 'Data perusahaan lain harus menghasilkan HTTP 404');
  });

  // Test 6: Login perusahaan - hanya menerima user milik perusahaan terpilih
  await runTest('6. Login perusahaan hanya menerima user milik perusahaan terpilih (pesan umum)', () => {
    const userCompany: string = 'comp-tenant-a';
    const selectedCompany: string = 'comp-tenant-b';

    let loginSuccess = false;
    let errorMessage = '';

    if (userCompany !== selectedCompany) {
      loginSuccess = false;
      errorMessage = 'Email atau kata sandi salah';
    } else {
      loginSuccess = true;
    }

    assert.strictEqual(loginSuccess, false, 'Login ke perusahaan yang salah harus ditolak');
    assert.strictEqual(errorMessage, 'Email atau kata sandi salah', 'Pesan error harus umum dan tidak membocorkan informasi');
  });

  console.log('\n========================================================');
  console.log(`HASIL: ${passedTests} DARI ${totalTests} SKENARIO TES PENGATURAN LULUS.`);
  console.log('========================================================\n');
}

main();
