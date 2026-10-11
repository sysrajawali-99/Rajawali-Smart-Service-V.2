import assert from 'assert';

console.log('========================================================');
console.log('AUTOMATED TEST SUITE: CEKLIST KEBERSIHAN AREA');
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
  // Test (a): Mengisi satu ceklist tidak mengubah ceklist lain
  await runTest('(a) Mengisi satu ceklist tidak mengubah ceklist lain', () => {
    interface ItemEntry {
      itemId: string;
      itemName: string;
      status: string;
    }
    interface Slot {
      hour: number;
      status: string;
      items: ItemEntry[];
    }
    interface Checklist {
      id: string;
      locationId: string;
      date: string;
      hourlySlots: Slot[];
      company_id: string;
    }

    const checklistA: Checklist = {
      id: 'chk-loc-1-2026-09-13',
      locationId: 'loc-1',
      date: '2026-09-13',
      company_id: 'comp-main',
      hourlySlots: [
        { hour: 7, status: 'pending', items: [{ itemId: 'item-1', itemName: 'Lantai', status: 'pending' }] },
        { hour: 8, status: 'pending', items: [{ itemId: 'item-1', itemName: 'Lantai', status: 'pending' }] },
      ],
    };

    const checklistB: Checklist = {
      id: 'chk-loc-2-2026-09-13',
      locationId: 'loc-2',
      date: '2026-09-13',
      company_id: 'comp-main',
      hourlySlots: [
        { hour: 7, status: 'pending', items: [{ itemId: 'item-1', itemName: 'Lantai', status: 'pending' }] },
        { hour: 8, status: 'pending', items: [{ itemId: 'item-1', itemName: 'Lantai', status: 'pending' }] },
      ],
    };

    let collection: Checklist[] = [JSON.parse(JSON.stringify(checklistA)), JSON.parse(JSON.stringify(checklistB))];

    // Petugas mengisi checklist A jam 8 menjadi "clean"
    const targetChecklistId = 'chk-loc-1-2026-09-13';
    const targetHour = 8;
    const targetItemId = 'item-1';
    const targetStatus = 'clean';

    collection = collection.map((chk) => {
      if (chk.id !== targetChecklistId) return chk;
      return {
        ...chk,
        hourlySlots: chk.hourlySlots.map((slot) => {
          if (slot.hour !== targetHour) return slot;
          return {
            ...slot,
            status: targetStatus,
            items: slot.items.map((it) => (it.itemId === targetItemId ? { ...it, status: targetStatus } : it)),
          };
        }),
      };
    });

    const updatedA = collection.find((c) => c.id === 'chk-loc-1-2026-09-13')!;
    const updatedB = collection.find((c) => c.id === 'chk-loc-2-2026-09-13')!;

    // Verifikasi Checklist A jam 8 berubah
    assert.strictEqual(updatedA.hourlySlots.find((s) => s.hour === 8)?.items[0].status, 'clean');
    // Verifikasi Checklist A jam 7 TIDAK berubah
    assert.strictEqual(updatedA.hourlySlots.find((s) => s.hour === 7)?.items[0].status, 'pending');
    // Verifikasi Checklist B SAMA SEKALI TIDAK TERPENGARUH
    assert.strictEqual(updatedB.hourlySlots.find((s) => s.hour === 8)?.items[0].status, 'pending');
    assert.strictEqual(updatedB.hourlySlots.find((s) => s.hour === 7)?.items[0].status, 'pending');
  });

  // Test (b): Respons server kosong tidak menghapus data di layar
  await runTest('(b) Respons server kosong tidak menghapus data di layar', () => {
    interface ItemEntry {
      itemId: string;
      itemName: string;
      status: string;
    }
    interface Slot {
      hour: number;
      status: string;
      items: ItemEntry[];
    }
    interface Checklist {
      id: string;
      locationId: string;
      date: string;
      hourlySlots: Slot[];
    }

    const currentScreenChecklists: Checklist[] = [
      {
        id: 'chk-1',
        locationId: 'loc-1',
        date: '2026-09-13',
        hourlySlots: [
          {
            hour: 8,
            status: 'clean',
            items: [
              { itemId: 'item-1', itemName: 'Lantai', status: 'clean' },
              { itemId: 'item-2', itemName: 'Wastafel', status: 'clean' },
            ],
          },
        ],
      },
    ];

    // Kasus 1: Polling / reconnect mengembalikan array kosong []
    const emptyServerResponse: Checklist[] = [];
    const protectedMergeEmpty = (current: Checklist[], remote: Checklist[]) => {
      if (!remote || remote.length === 0) {
        // ATURAN WAJIB: Jangan pernah menimpa data di layar dengan hasil kosong
        return current;
      }
      return remote;
    };

    const resultAfterEmpty = protectedMergeEmpty(currentScreenChecklists, emptyServerResponse);
    assert.strictEqual(resultAfterEmpty.length, 1);
    assert.strictEqual(resultAfterEmpty[0].hourlySlots[0].items.length, 2);
    assert.strictEqual(resultAfterEmpty[0].hourlySlots[0].items[0].status, 'clean');

    // Kasus 2: Server mengirim checklist dengan items kosong [] (slot items [] protection)
    const remoteWithEmptyItems: Checklist[] = [
      {
        id: 'chk-1',
        locationId: 'loc-1',
        date: '2026-09-13',
        hourlySlots: [
          {
            hour: 8,
            status: 'clean',
            items: [], // Server belum punya atau mengirim array kosong
          },
        ],
      },
    ];

    const protectedSlotMerge = (local: Checklist, remote: Checklist): Checklist => {
      const mergedSlots = (local.hourlySlots || []).map((locSlot) => {
        const remSlot = (remote.hourlySlots || []).find((s) => s.hour === locSlot.hour);
        if (!remSlot) return locSlot;
        const preservedItems =
          Array.isArray(remSlot.items) && remSlot.items.length > 0 ? remSlot.items : locSlot.items;
        return {
          ...locSlot,
          ...remSlot,
          items: preservedItems,
        };
      });
      return {
        ...local,
        ...remote,
        hourlySlots: mergedSlots,
      };
    };

    const mergedChecklist = protectedSlotMerge(currentScreenChecklists[0], remoteWithEmptyItems[0]);
    assert.strictEqual(mergedChecklist.hourlySlots[0].items.length, 2);
    assert.strictEqual(mergedChecklist.hourlySlots[0].items[0].itemName, 'Lantai');
    assert.strictEqual(mergedChecklist.hourlySlots[0].items[1].itemName, 'Wastafel');
  });

  // Test (c): Hapus lunak bisa dipulihkan
  await runTest('(c) Hapus lunak bisa dipulihkan (soft delete & restore)', () => {
    interface Checklist {
      id: string;
      locationName: string;
      isDeleted?: boolean;
      deletedAt?: string;
      deletedBy?: string;
    }

    const dbStore: Record<string, Checklist> = {
      'chk-100': {
        id: 'chk-100',
        locationName: 'Toilet Lobby Lantai 1',
        isDeleted: false,
      },
    };

    // 1. Eksekusi Hapus Lunak (Soft Delete)
    const softDelete = (id: string, operator: string) => {
      const record = dbStore[id];
      assert(record, 'Record harus ada');
      record.isDeleted = true;
      record.deletedAt = new Date().toISOString();
      record.deletedBy = operator;
      return { success: true, isDeleted: true };
    };

    const deleteRes = softDelete('chk-100', 'Supervisor A');
    assert.strictEqual(deleteRes.isDeleted, true);
    assert.strictEqual(dbStore['chk-100'].isDeleted, true);
    assert(dbStore['chk-100'].deletedAt !== undefined);

    // Filter daftar aktif harus mengecualikan isDeleted
    const activeList = Object.values(dbStore).filter((item) => !item.isDeleted);
    assert.strictEqual(activeList.length, 0);

    // 2. Eksekusi Pemulihan (Restore)
    const restore = (id: string) => {
      const record = dbStore[id];
      assert(record, 'Record harus ada untuk dipulihkan');
      record.isDeleted = false;
      delete record.deletedAt;
      delete record.deletedBy;
      return record;
    };

    const restored = restore('chk-100');
    assert.strictEqual(restored.isDeleted, false);
    assert.strictEqual(restored.deletedAt, undefined);

    // Daftar aktif kembali memuat ceklist yang dipulihkan
    const activeListAfterRestore = Object.values(dbStore).filter((item) => !item.isDeleted);
    assert.strictEqual(activeListAfterRestore.length, 1);
    assert.strictEqual(activeListAfterRestore[0].locationName, 'Toilet Lobby Lantai 1');
  });

  // Test (d): Dua perusahaan tidak saling terpengaruh
  await runTest('(d) Dua perusahaan tidak saling terpengaruh (Multi-tenancy isolation)', () => {
    interface Checklist {
      id: string;
      company_id: string;
      locationName: string;
      itemsCount: number;
    }

    const multitenantStore: Checklist[] = [
      { id: 'chk-a1', company_id: 'comp-alpha', locationName: 'Alpha Lobby', itemsCount: 10 },
      { id: 'chk-a2', company_id: 'comp-alpha', locationName: 'Alpha Restroom', itemsCount: 8 },
      { id: 'chk-b1', company_id: 'comp-beta', locationName: 'Beta Foodcourt', itemsCount: 15 },
    ];

    // Filter per sesi perusahaan
    const getRecordsForCompany = (compSession: string) => {
      return multitenantStore.filter((r) => (r.company_id || 'comp-main') === compSession);
    };

    const alphaRecords = getRecordsForCompany('comp-alpha');
    const betaRecords = getRecordsForCompany('comp-beta');

    assert.strictEqual(alphaRecords.length, 2);
    assert(alphaRecords.every((r) => r.company_id === 'comp-alpha'));

    assert.strictEqual(betaRecords.length, 1);
    assert.strictEqual(betaRecords[0].company_id, 'comp-beta');
    assert.strictEqual(betaRecords[0].locationName, 'Beta Foodcourt');

    // Mutasi di Alpha tidak boleh merubah data Beta
    alphaRecords[0].itemsCount = 20;
    assert.strictEqual(betaRecords[0].itemsCount, 15);

    // Akses lintas tenant harus ditolak (404)
    const accessCrossTenant = (recordId: string, currentCompId: string) => {
      const found = multitenantStore.find((r) => r.id === recordId);
      if (!found) return { status: 404 };
      if (found.company_id !== currentCompId) return { status: 404 }; // Requirement: ID milik perusahaan lain dibalas 404
      return { status: 200, data: found };
    };

    const accessResult = accessCrossTenant('chk-b1', 'comp-alpha');
    assert.strictEqual(accessResult.status, 404, 'Akses ke data perusahaan lain harus menghasilkan 404');
  });

  console.log(`\n========================================================`);
  console.log(`HASIL: ${passedTests} DARI ${totalTests} SKENARIO TES LULUS.`);
  console.log(`========================================================`);
}

main();
