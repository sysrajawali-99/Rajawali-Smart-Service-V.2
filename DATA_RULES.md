# ATURAN DATA (DATA RULES)
> Data produksi di VPS tidak boleh hilang atau berubah secara tidak terkontrol.

Aturan ini wajib dipatuhi di **SETIAP** perubahan kode. Jika sebuah permintaan fitur bertentangan dengan aturan ini, komunikasikan dan minta konfirmasi kepada penanggung jawab sistem sebelum mengubah kode.

---

### 1. Perlindungan Data saat Server Start / Inisialisasi
- Jangan pernah menghapus, mengosongkan, atau menimpa data yang sudah ada di database saat server start atau saat aplikasi dibuka.
- **Dilarang keras** memakai query `DROP`, `TRUNCATE`, atau `DELETE` massal di dalam kode aplikasi.

---

### 2. Aturan Inisialisasi & Data Awal (Seed)
- Data awal (*seed*) hanya boleh dikirim ke server jika koleksi terkait benar-benar kosong (`totalRecords === 0`).
- Seed tidak boleh menimpa data yang sudah ada.

---

### 3. Integritas Koleksi & Penambahan Field
- Jangan mengganti nama koleksi (*collection key*) yang sudah ada. Fitur baru harus memakai koleksi baru.
- Menambah *field* baru diperbolehkan, namun kode harus tetap kompatibel (*backward-compatible*) dan dapat membaca data lama yang belum memiliki *field* tersebut (selalu sediakan nilai *default* / *fallback*).

---

### 4. Skrip Migrasi Eksplisit & Idempoten
- Dilarang mengubah skema atau bentuk data lama secara otomatis atau diam-diam di latar belakang.
- Apabila perubahan struktur data mutlak diperlukan, buat skrip migrasi terpisah yang aman dijalankan berulang (*idempotent*), dan konfirmasikan terlebih dahulu kepada pemilik sistem sebelum skrip dieksekusi.

---

### 5. Independensi Tampilan & Fitur Baru
- Perubahan komponen antarmuka pengguna (UI/UX) dan penambahan fitur baru tidak boleh memodifikasi, memformat ulang, atau menghapus data yang telah tersimpan di database.

---

### 6. Transparansi & Audit Perubahan
- Selalu cantumkan di akhir setiap perubahan kode penjelasan ringkas mengenai:
  1. Koleksi apa saja yang disentuh (jika ada).
  2. Apakah ada risiko terhadap data yang sudah ada.
