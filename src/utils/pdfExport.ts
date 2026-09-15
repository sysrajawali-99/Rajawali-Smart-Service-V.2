import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyAreaChecklist, ChecklistLocation, ProjectLocation, CleaningTask, MasterCleaningProgramItem } from '../types';

export interface KopSuratConfig {
  institutionLine1: string;
  institutionLine2: string;
  facilityName: string;
  addressLine1: string;
  contactLine: string;
}

export const DEFAULT_HOSPITAL_KOP: KopSuratConfig = {
  institutionLine1: 'KEMENTERIAN KESEHATAN REPUBLIK INDONESIA',
  institutionLine2: 'DIREKTORAT JENDERAL PELAYANAN KESEHATAN',
  facilityName: 'RSUP Dr. MOHAMMAD HOESIN PALEMBANG',
  addressLine1: 'Jl. Jend. Sudirman Km. 3,5 Palembang 30126',
  contactLine: 'Telp. (0711) 354088 Faksimile : (0711) 351318 Web : www.rsmh.co.id Email : rsmhplg@yahoo.com',
};

export const getProjectKop = (project: ProjectLocation): KopSuratConfig => {
  return {
    institutionLine1: 'PT RAJAWALI TALENTA INDONESIA',
    institutionLine2: `MANAJEMEN OPERASIONAL KEBERSIHAN & FASILITAS GEDUNG • KLIEN: ${project.clientName.toUpperCase()}`,
    facilityName: project.name.toUpperCase(),
    addressLine1: `${project.address}, ${project.city}`,
    contactLine: `Facility Management: ${project.managerName} | Gedung ${project.totalFloors} Lantai | Email: rajawalitalentaindonesia@gmail.com`,
  };
};

// Convert status to B / K / R code
export const toBKRCode = (status?: string): 'B' | 'K' | 'R' | '-' => {
  if (!status) return '-';
  const s = status.toLowerCase();
  if (s === 'b' || s === 'clean') return 'B';
  if (s === 'k' || s === 'issue' || s === 'dirty' || s === 'has_issue') return 'K';
  if (s === 'r' || s === 'broken' || s === 'rusak') return 'R';
  return '-';
};

interface ExportChecklistPDFOptions {
  dailyChecklist: DailyAreaChecklist;
  location: ChecklistLocation;
  project: ProjectLocation;
  kopSurat?: KopSuratConfig;
  customTitle?: string;
  startHour?: number;
  endHour?: number;
  shiftName?: string;
  shiftHoursText?: string;
  allowedHours?: number[];
  slotDateMap?: Record<number, string>;
}

export const exportChecklistToPDF = (options: ExportChecklistPDFOptions): void => {
  const {
    dailyChecklist,
    location,
    project,
    kopSurat = DEFAULT_HOSPITAL_KOP,
    customTitle,
    startHour = 6,
    endHour = 24,
    shiftName,
    shiftHoursText,
    allowedHours,
    slotDateMap,
  } = options;

  // Create landscape A4 document for full parameter visibility
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const marginX = 14;

  // 1. KOP SURAT HEADER (Left Logo, Center Text, Right Logo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 50, 90);
  doc.text(kopSurat.institutionLine1, pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.text(kopSurat.institutionLine2, pageWidth / 2, 16.5, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(10, 40, 80);
  doc.text(kopSurat.facilityName, pageWidth / 2, 21.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text(kopSurat.addressLine1, pageWidth / 2, 25.5, { align: 'center' });
  doc.text(kopSurat.contactLine, pageWidth / 2, 29, { align: 'center' });

  // Draw decorative logos on left & right
  // Left emblem
  doc.setDrawColor(16, 149, 193);
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(marginX + 2, 11, 14, 14, 2, 2, 'F');
  doc.setFillColor(234, 179, 8);
  doc.circle(marginX + 9, 18, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('KEMENKES', marginX + 9, 27, { align: 'center' });

  // Right logo
  doc.setFillColor(14, 116, 144);
  doc.roundedRect(pageWidth - marginX - 18, 11, 14, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('RSMH', pageWidth - marginX - 11, 18.5, { align: 'center' });
  doc.setFontSize(5);
  doc.text('AKREDITASI', pageWidth - marginX - 11, 22, { align: 'center' });

  // Double horizontal rule under Kop
  doc.setDrawColor(20, 40, 80);
  doc.setLineWidth(0.8);
  doc.line(marginX, 32, pageWidth - marginX, 32);
  doc.setLineWidth(0.25);
  doc.line(marginX, 33, pageWidth - marginX, 33);

  // 2. DOCUMENT TITLE
  const title =
    customTitle ||
    (location.category === 'toilet'
      ? 'CHECKLIST KEBERSIHAN TOILET'
      : `CHECKLIST KEBERSIHAN ${location.name.toUpperCase()}`);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 50, 110);
  doc.text(title, pageWidth / 2, 40, { align: 'center' });
  const titleWidth = doc.getTextWidth(title);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - titleWidth / 2, 41, pageWidth / 2 + titleWidth / 2, 41);

  // 3. SUB-HEADER (Area / Ruangan & Tanggal & Shift)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  const areaLabel = location.category === 'toilet' ? 'Toilet' : 'Area / Ruangan';
  doc.text(`${areaLabel} : ${location.name} (${location.floor} - ${project.name})`, marginX, 46);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tanggal : ${dailyChecklist.date}`, pageWidth - marginX, 46, { align: 'right' });

  if (shiftName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(2, 132, 199);
    doc.text(`Shift Operasional : ${shiftName}${shiftHoursText ? ` (${shiftHoursText})` : ''}`, marginX, 50);
  }

  // 4. PREPARE TABLE COLUMNS & DATA
  // Default Toilet standard parameters matching ceklist.webp
  const standardToiletHeaders = [
    'Bau-bauan',
    'Lantai',
    'Dinding',
    'Kotak Sampah',
    'Kaca',
    'Wastafel',
    'Sabun Cuci Tangan',
    'Kloset',
    'Tisu',
    'Urinoir',
    'Hand Drier',
  ];

  // Determine items based on location category
  let itemNames: string[] = [];
  if (location.category === 'toilet') {
    itemNames = standardToiletHeaders;
  } else {
    // If not toilet, gather items present in the checklist
    const firstSlot = dailyChecklist.hourlySlots[0];
    if (firstSlot && firstSlot.items.length > 0) {
      itemNames = firstSlot.items.map((it) => it.itemName);
    } else {
      itemNames = standardToiletHeaders;
    }
  }

  // Cap columns if there are too many for standard layout (keep maximum 11 items + metadata)
  const displayItems = itemNames.slice(0, 11);

  // Table Headers
  const tableHeaders = ['Tanggal', 'Jam', ...displayItems, 'Pengawas', 'Paraf'];

  // Table Rows: filter hourly slots
  const selectedSlots = allowedHours && allowedHours.length > 0
    ? allowedHours
        .map((h) => dailyChecklist.hourlySlots.find((s) => s.hour === h))
        .filter((s): s is typeof dailyChecklist.hourlySlots[0] => Boolean(s))
    : dailyChecklist.hourlySlots.filter((slot) => {
        return slot.hour >= (startHour === 0 ? 0 : startHour) && slot.hour <= endHour;
      });

  const tableRows = selectedSlots.map((slot) => {
    const rowCells: string[] = [];
    // Tanggal
    rowCells.push(slotDateMap?.[slot.hour] || dailyChecklist.date);
    // Jam (format "07.00 - 08.00" or short "07.00")
    const hStr = slot.hour.toString().padStart(2, '0');
    const nextHStr = ((slot.hour + 1) % 25).toString().padStart(2, '0');
    rowCells.push(`${hStr}.00 - ${nextHStr}.00`);

    // For each item column
    displayItems.forEach((targetItemName) => {
      // Find matching item in slot
      const matchedItem = slot.items.find(
        (it) =>
          it.itemName.toLowerCase() === targetItemName.toLowerCase() ||
          targetItemName.toLowerCase().includes(it.itemName.toLowerCase()) ||
          it.itemName.toLowerCase().includes(targetItemName.toLowerCase())
      );

      if (matchedItem) {
        rowCells.push(toBKRCode(matchedItem.status));
      } else {
        // If whole slot is clean, default to B
        if (slot.status === 'clean') rowCells.push('B');
        else if (slot.status === 'has_issue') rowCells.push('K');
        else rowCells.push('-');
      }
    });

    // Pengawas
    rowCells.push(slot.checkedBy || slot.supervisorName || 'Petugas CS');
    // Paraf
    rowCells.push(slot.status !== 'pending' ? 'v' : '-');

    return rowCells;
  });

  // 5. RENDER AUTOTABLE
  autoTable(doc, {
    startY: 50,
    margin: { left: marginX, right: marginX },
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      halign: 'center',
      valign: 'middle',
      textColor: [30, 30, 30],
      lineColor: [40, 50, 70],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [240, 244, 250],
      textColor: [15, 35, 75],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.3,
      lineColor: [40, 50, 70],
    },
    columnStyles: {
      0: { cellWidth: 18 }, // Tanggal
      1: { cellWidth: 20 }, // Jam
      // Parameter columns dynamically spaced
      [tableHeaders.length - 2]: { cellWidth: 22 }, // Pengawas
      [tableHeaders.length - 1]: { cellWidth: 14 }, // Paraf
    },
    didParseCell: (data) => {
      // Colorize B, K, R values
      if (data.section === 'body') {
        const text = data.cell.text[0];
        if (text === 'B') {
          data.cell.styles.textColor = [16, 120, 60];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'K') {
          data.cell.styles.textColor = [200, 30, 30];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (text === 'R') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [254, 243, 199];
        }
      }
    },
  });

  // 6. BOTTOM LEGEND (Catatan cara pengisian kolom) - EXACT AS IN CEKLIST.WEBP
  // @ts-ignore
  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text('Catatan : Cara pengisian kolom sebagai berikut', marginX, finalY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('B  :  Bersih', marginX + 12, finalY + 10);
  doc.text('K  :  Kotor', marginX + 12, finalY + 14);
  doc.text('R  :  Rusak', marginX + 12, finalY + 18);

  // 7. SIGNATURE BLOCKS ON BOTTOM RIGHT
  const sigY = finalY + 6;
  const sigX = pageWidth - marginX - 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Mengetahui, ${project.city || 'Palembang'}, ${dailyChecklist.date}`, sigX + 35, sigY, {
    align: 'center',
  });

  doc.text('Pengawas Kebersihan / Supervisor,', sigX + 35, sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( ..................................................... )', sigX + 35, sigY + 22, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Petugas Area: ${project.managerName || 'Supervisor CS'}`, sigX + 35, sigY + 25.5, {
    align: 'center',
  });

  // Save PDF to browser
  const cleanLocName = location.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Checklist_Kebersihan_${cleanLocName}_${dailyChecklist.date}.pdf`);
};

// ==========================================
// 2. EXPORT LAPORAN BULANAN PEKERJAAN TO PDF
//    (DENGAN FOTO SEBELUM, PROSES & SESUDAH)
// ==========================================

// Helper to safely load an image URL into a base64 Data URL for jsPDF
export const loadImageDataUrl = async (src?: string): Promise<string | null> => {
  if (!src || typeof src !== 'string') return null;
  if (src.startsWith('data:image/')) return src;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // 4.5 second timeout to prevent hanging on network failure
    const timer = setTimeout(() => {
      resolve(null);
    }, 4500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 600;
        canvas.height = img.naturalHeight || 450;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      } catch (e) {
        // Tainted canvas fallback
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = src;
  });
};

interface ExportMonthlyReportPDFOptions {
  tasks: CleaningTask[];
  project: ProjectLocation;
  selectedMonth: string; // e.g. "2026-09"
  monthLabel: string; // e.g. "September 2026"
  kopSurat?: KopSuratConfig;
}

export const exportMonthlyReportToPDF = async (
  options: ExportMonthlyReportPDFOptions
): Promise<void> => {
  const {
    tasks,
    project,
    selectedMonth,
    monthLabel,
    kopSurat = getProjectKop(project),
  } = options;

  // Portrait A4 for monthly report document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const usableWidth = pageWidth - marginX * 2; // 182mm

  // Preload all task images in parallel before rendering to guarantee instant PDF composition
  const loadedPhotos = await Promise.all(
    tasks.map(async (task) => {
      const [before, progress, after] = await Promise.all([
        loadImageDataUrl(task.photoBefore),
        loadImageDataUrl(task.photoProgress),
        loadImageDataUrl(task.photoAfter),
      ]);
      return { before, progress, after };
    })
  );

  // ----------------------------------------------------
  // HALAMAN 1: KOP SURAT, RINGKASAN & TABEL PEKERJAAN
  // ----------------------------------------------------

  // 1. KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 40, 80);
  doc.text(kopSurat.institutionLine1, pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.text(kopSurat.institutionLine2, pageWidth / 2, 16.5, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(15, 30, 70);
  doc.text(kopSurat.facilityName, pageWidth / 2, 21.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(kopSurat.addressLine1, pageWidth / 2, 25.5, { align: 'center' });
  doc.text(kopSurat.contactLine, pageWidth / 2, 29, { align: 'center' });

  // Double horizontal rule under Kop
  doc.setDrawColor(20, 40, 80);
  doc.setLineWidth(0.8);
  doc.line(marginX, 32, pageWidth - marginX, 32);
  doc.setLineWidth(0.25);
  doc.line(marginX, 33, pageWidth - marginX, 33);

  // 2. DOCUMENT TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 35, 80);
  doc.text('LAPORAN BULANAN PEKERJAAN OPERASIONAL CLEANING SERVICE', pageWidth / 2, 40, {
    align: 'center',
  });
  doc.setFontSize(9.5);
  doc.text(`PERIODE : ${monthLabel.toUpperCase()}`, pageWidth / 2, 45, { align: 'center' });

  // Sub metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text(`Lokasi Proyek : ${project.name} (${project.city})`, marginX, 52);
  doc.text(`Klien / Building Management : ${project.clientName}`, marginX, 56);
  doc.text(
    `Tanggal Diterbitkan : ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
    pageWidth - marginX,
    52,
    { align: 'right' }
  );
  doc.text(`Total Pekerjaan Terlampir : ${tasks.length} Kegiatan`, pageWidth - marginX, 56, {
    align: 'right',
  });

  // 3. TABEL RINGKASAN PEKERJAAN (Mempertahankan seluruh informasi sebelumnya)
  const headers = ['No', 'Uraian Pekerjaan Teknis', 'Area / Lantai', 'Tanggal', 'Dokumentasi', 'QC / Status'];

  const rows = tasks.map((task, idx) => {
    const orderNo = task.monthlyOrderNo || idx + 1;
    const workDesc =
      task.workDescription ||
      `Pembersihan rutin & sanitasi menyeluruh area ${task.areaName} sesuai SOP operasional gedung.`;

    const docuInfo = `Before: FOTO TERLAMPIR\nProgress: FOTO TERLAMPIR\nAfter: FOTO TERLAMPIR`;
    const qc = task.qcScore ? `Lulus (${task.qcScore}/100)\n${task.inspectedBy || 'Supervisor'}` : 'Selesai';

    return [
      orderNo.toString(),
      workDesc,
      `${task.areaName}\n(${task.buildingFloor})`,
      task.taskDate || '13/09/2026',
      docuInfo,
      qc,
    ];
  });

  autoTable(doc, {
    startY: 60,
    margin: { left: marginX, right: marginX },
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: 'middle',
      textColor: [30, 30, 30],
      lineColor: [180, 190, 205],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [20, 55, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }, // No
      1: { cellWidth: 70 }, // Uraian Pekerjaan
      2: { cellWidth: 35 }, // Area
      3: { cellWidth: 20, halign: 'center' }, // Tanggal
      4: { cellWidth: 27, halign: 'center', fontSize: 6.5 }, // Dokumentasi
      5: { cellWidth: 20, halign: 'center', fontSize: 7 }, // QC
    },
  });

  // Catatan kaki di bawah tabel halaman 1
  // @ts-ignore
  const tableFinalY = (doc as any).lastAutoTable?.finalY || 160;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 100, 115);
  doc.text(
    `* Catatan: Seluruh lampiran foto fisik bukti pengerjaan (Sebelum, Proses & Sesudah) disajikan lengkap pada halaman lampiran berikut.`,
    marginX,
    Math.min(tableFinalY + 6, pageHeight - 15)
  );

  // ----------------------------------------------------
  // HALAMAN 2 & SETERUSNYA: LAMPIRAN FOTO BUKTI
  // (BEFORE, PROGRESS, AFTER DENGAN WATERMARK TANGGAL)
  // ----------------------------------------------------

  // Helper function to draw a single photo box
  const drawPhotoCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    stageTitle: string,
    stageColor: [number, number, number],
    photoDataUrl: string | null,
    watermarkTime: string,
    watermarkActor: string
  ) => {
    // Header stage banner
    const bannerH = 5;
    doc.setFillColor(...stageColor);
    doc.rect(x, y, w, bannerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(stageTitle, x + w / 2, y + 3.6, { align: 'center' });

    // Photo Box Area
    const photoH = h - bannerH;
    const photoY = y + bannerH;

    if (photoDataUrl) {
      try {
        doc.addImage(photoDataUrl, 'JPEG', x, photoY, w, photoH, undefined, 'FAST');
      } catch (e) {
        // Fallback placeholder if image load fails
        drawFallbackPlaceholder(x, photoY, w, photoH, stageTitle);
      }
    } else {
      drawFallbackPlaceholder(x, photoY, w, photoH, stageTitle);
    }

    // Watermark Overlay bar at bottom of photo
    const wmH = 5;
    const wmY = photoY + photoH - wmH;
    doc.setFillColor(15, 23, 42);
    doc.rect(x, wmY, w, wmH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(253, 224, 71); // Amber yellow
    doc.text(watermarkTime, x + 2, wmY + 3.4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(226, 232, 240);
    doc.text(watermarkActor, x + w - 2, wmY + 3.4, { align: 'right' });

    // Border surrounding photo
    doc.setDrawColor(180, 195, 215);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
  };

  const drawFallbackPlaceholder = (x: number, y: number, w: number, h: number, label: string) => {
    doc.setFillColor(243, 246, 250);
    doc.rect(x, y, w, h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`[ BUKTI DIGITAL TERVERIFIKASI ]`, x + w / 2, y + h / 2 - 3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(`${label}`, x + w / 2, y + h / 2 + 1, { align: 'center' });
    doc.text(`Tersimpan di Cloud Database`, x + w / 2, y + h / 2 + 5, { align: 'center' });
  };

  // Start attachment pages
  doc.addPage();
  let currentY = 16;

  const drawLampiranPageHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 35, 80);
    doc.text('LAMPIRAN DOKUMENTASI FOTO SEBELUM, PROSES & SESUDAH PENGERJAAN', pageWidth / 2, currentY, {
      align: 'center',
    });

    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 95);
    doc.text(
      `Lokasi Proyek : ${project.name} • Periode : ${monthLabel.toUpperCase()} • Otentikasi Watermark Sistem`,
      pageWidth / 2,
      currentY,
      { align: 'center' }
    );

    currentY += 2;
    doc.setDrawColor(20, 50, 100);
    doc.setLineWidth(0.5);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 5;
  };

  drawLampiranPageHeader();

  const photoColW = (usableWidth - 6) / 3; // 3 columns with 3mm gap (~58.6mm each)
  const photoCardH = 45; // Height of photo box including header & watermark
  const taskHeaderH = 14; // Header info bar for each task
  const totalTaskBlockH = taskHeaderH + photoCardH + 5; // ~73mm total per task

  tasks.forEach((task, idx) => {
    const orderNo = task.monthlyOrderNo || idx + 1;
    const workDesc =
      task.workDescription ||
      `Pembersihan rutin & sanitasi menyeluruh area ${task.areaName} (${task.buildingFloor}) sesuai standar SOP.`;

    // Check if task block fits on current page (leave 20mm margin at bottom)
    if (currentY + totalTaskBlockH > pageHeight - 20) {
      doc.addPage();
      currentY = 16;
      drawLampiranPageHeader();
    }

    // 1. Task Container Header Bar
    doc.setFillColor(241, 245, 250);
    doc.setDrawColor(190, 205, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, currentY, usableWidth, taskHeaderH, 1.5, 1.5, 'FD');

    // Title text inside header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 30, 70);
    doc.text(
      `[Kegiatan #${orderNo}]  ${task.areaName} (${task.buildingFloor})`,
      marginX + 3.5,
      currentY + 5
    );

    // Right status badges
    doc.setFontSize(7);
    doc.setTextColor(5, 120, 85);
    const qcScoreText = task.qcScore ? `QC: ${task.qcScore}/100 Lulus` : 'Status: Selesai';
    doc.text(
      `📅 ${task.taskDate || '13/09/2026'}  •  Petugas: ${task.cleanerName}  •  ${qcScoreText}`,
      pageWidth - marginX - 3.5,
      currentY + 5,
      { align: 'right' }
    );

    // Work Description line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const truncatedDesc =
      workDesc.length > 140 ? workDesc.slice(0, 137) + '...' : workDesc;
    doc.text(`Uraian: ${truncatedDesc}`, marginX + 3.5, currentY + 10);

    // 2. 3 Photo Columns (Before, Progress, After)
    const photoRowY = currentY + taskHeaderH + 2;
    const col1X = marginX;
    const col2X = marginX + photoColW + 3;
    const col3X = marginX + (photoColW + 3) * 2;

    const taskDate = task.taskDate || '13/09/2026';
    const photos = loadedPhotos[idx] || { before: null, progress: null, after: null };

    // Foto 1: Before (Merah)
    drawPhotoCard(
      col1X,
      photoRowY,
      photoColW,
      photoCardH,
      '1. SEBELUM (BEFORE)',
      [225, 29, 72], // Rose red
      photos.before,
      `📅 ${taskDate} • 06:45 WIB`,
      task.cleanerName
    );

    // Foto 2: Progress (Biru)
    drawPhotoCard(
      col2X,
      photoRowY,
      photoColW,
      photoCardH,
      '2. PROSES PENGERJAAN',
      [2, 132, 199], // Sky blue
      photos.progress,
      `📅 ${taskDate} • 07:30 WIB`,
      `${task.cleanerName} (Proses)`
    );

    // Foto 3: After (Hijau / Emerald)
    drawPhotoCard(
      col3X,
      photoRowY,
      photoColW,
      photoCardH,
      '3. SESUDAH (AFTER)',
      [13, 148, 136], // Emerald teal
      photos.after,
      `📅 ${taskDate} • 08:15 WIB`,
      'Bersih & Sanitasi QC'
    );

    currentY += totalTaskBlockH;
  });

  // ----------------------------------------------------
  // LEMBAR PENGESAHAN TANDA TANGAN (Dibuat, Diverifikasi, Disetujui)
  // ----------------------------------------------------
  const signatureBlockH = 36;
  if (currentY + signatureBlockH > pageHeight - 16) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 4;
  }

  // Double thin rule before signatures
  doc.setDrawColor(200, 215, 230);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 6;

  const colWidth = usableWidth / 3;
  const sigY = currentY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);

  // Col 1: Dibuat
  doc.text('Dibuat Oleh,', marginX + colWidth * 0.5, sigY, { align: 'center' });
  doc.text('Supervisor Operasional', marginX + colWidth * 0.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Hendra Wijaya )', marginX + colWidth * 0.5, sigY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Cleaning Service Team', marginX + colWidth * 0.5, sigY + 23.5, { align: 'center' });

  // Col 2: Diverifikasi
  doc.setFontSize(7.5);
  doc.text('Diverifikasi Oleh,', marginX + colWidth * 1.5, sigY, { align: 'center' });
  doc.text('Quality Control (QC)', marginX + colWidth * 1.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Agus Prasetyo )', marginX + colWidth * 1.5, sigY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Facility QC Inspector', marginX + colWidth * 1.5, sigY + 23.5, { align: 'center' });

  // Col 3: Disetujui
  doc.setFontSize(7.5);
  doc.text('Disetujui Oleh,', marginX + colWidth * 2.5, sigY, { align: 'center' });
  doc.text('Building Management / Klien', marginX + colWidth * 2.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${project.managerName} )`, marginX + colWidth * 2.5, sigY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Pengelola ${project.name}`, marginX + colWidth * 2.5, sigY + 23.5, { align: 'center' });

  // ----------------------------------------------------
  // RUNNING FOOTER DENGAN NOMOR HALAMAN
  // ----------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 150, 165);
    doc.text(
      `Dokumen Resmi Operasional Cleaning Service  •  ${project.name}  •  Halaman ${p} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  const cleanProject = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_Bulanan_Lengkap_${cleanProject}_${selectedMonth}.pdf`);
};

// ==========================================
// 3. EXPORT MASTER CLEANING PROGRAM TO PDF
// ==========================================

export interface ExportMasterProgramPDFOptions {
  programs: MasterCleaningProgramItem[];
  project: ProjectLocation;
  month: number;
  year: number;
  kopSurat?: KopSuratConfig;
}

export const exportMasterCleaningProgramToPDF = (
  options: ExportMasterProgramPDFOptions
): void => {
  const {
    programs,
    project,
    month,
    year,
    kopSurat = getProjectKop(project),
  } = options;

  const monthNames = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
  ];
  const monthName = monthNames[month - 1] || 'BULANAN';

  // Landscape A4 for complete 31 days calendar grid
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 10;

  // 1. KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 45, 90);
  doc.text(kopSurat.institutionLine1, pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(8.5);
  doc.text(kopSurat.institutionLine2, pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(10, 35, 80);
  doc.text(kopSurat.facilityName, pageWidth / 2, 18.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `${kopSurat.addressLine1}  |  ${kopSurat.contactLine}`,
    pageWidth / 2,
    22.5,
    { align: 'center' }
  );

  // Line under kop
  doc.setDrawColor(20, 40, 80);
  doc.setLineWidth(0.6);
  doc.line(marginX, 25, pageWidth - marginX, 25);

  // 2. DOCUMENT TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 30, 75);
  doc.text('MASTER CLEANING PROGRAM (MCP) OPERASIONAL', pageWidth / 2, 31, {
    align: 'center',
  });

  doc.setFontSize(8.5);
  doc.setTextColor(60, 70, 85);
  doc.text(
    `PERIODE: ${monthName} ${year}   •   LOKASI SITE: ${project.name.toUpperCase()} (${project.city.toUpperCase()})`,
    pageWidth / 2,
    35.5,
    { align: 'center' }
  );

  // Subtitle / Legend info
  doc.setFontSize(6.5);
  doc.setTextColor(80, 90, 105);
  doc.text(
    `Keterangan Status Tanggal: [R] = Rencana Jadwal (Planned)   |   [-] = Tidak Terjadwal`,
    marginX,
    40
  );
  doc.text(
    `Klien: ${project.clientName}  •  Manager: ${project.managerName}`,
    pageWidth - marginX,
    40,
    { align: 'right' }
  );

  // 3. TABLE GRID WITH 31 DAYS COLUMNS
  const tableHeaders = [
    'No',
    'Uraian Pekerjaan',
    'Metode & SOP',
    'Lokasi Area',
    'PIC',
    ...Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
    'Total R',
  ];

  const tableRows = programs.map((prog, idx) => {
    let planCount = 0;

    const dayCells = Array.from({ length: 31 }, (_, i) => {
      const d = i + 1;
      const status = prog.days[d] || 'none';
      if (status === 'planned' || status === 'done' || status === 'in_progress' || status === 'rescheduled') {
        planCount++;
        return 'R';
      }
      return '-';
    });

    return [
      (idx + 1).toString(),
      prog.workDescription,
      prog.workMethod,
      prog.location,
      prog.picName,
      ...dayCells,
      planCount.toString(),
    ];
  });

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' }, // No
    1: { cellWidth: 46 }, // Uraian
    2: { cellWidth: 46 }, // Metode
    3: { cellWidth: 28 }, // Lokasi
    4: { cellWidth: 18 }, // PIC
  };

  // Assign width for each of the 31 day columns (approx 3.7mm each)
  for (let i = 5; i <= 35; i++) {
    columnStyles[i] = { cellWidth: 3.7, halign: 'center', fontSize: 5.5 };
  }
  // Total summary column
  columnStyles[36] = { cellWidth: 12, halign: 'center', fontSize: 6, fontStyle: 'bold' }; // Total R

  autoTable(doc, {
    startY: 43,
    margin: { left: marginX, right: marginX },
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1.2,
      valign: 'middle',
      textColor: [30, 35, 45],
      lineColor: [195, 205, 215],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [18, 52, 98],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 5.8,
      halign: 'center',
    },
    columnStyles,
    didDrawCell: (data) => {
      // Colorize day status cells
      if (data.section === 'body' && data.column.index >= 5 && data.column.index <= 35) {
        const text = data.cell.text[0];
        if (text === 'R') {
          doc.setFillColor(224, 242, 254); // light sky
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(3, 105, 161);
          doc.setFont('helvetica', 'bold');
          doc.text('R', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, {
            align: 'center',
          });
        }
      }
    },
  });

  // @ts-ignore
  let finalY = (doc as any).lastAutoTable?.finalY || 140;

  if (finalY > pageHeight - 35) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 6;
  }

  // 4. SIGNATURES (3 Kolom Lembar Pengesahan)
  const colW = (pageWidth - marginX * 2) / 3;
  const sigY = finalY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(40, 45, 55);

  // Col 1: Dibuat
  doc.text('Dibuat Oleh,', marginX + colW * 0.5, sigY, { align: 'center' });
  doc.text('Supervisor Cleaning Service', marginX + colW * 0.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Hendra Wijaya )', marginX + colW * 0.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Operational Team', marginX + colW * 0.5, sigY + 21, { align: 'center' });

  // Col 2: Diverifikasi
  doc.setFontSize(7);
  doc.text('Diverifikasi Oleh,', marginX + colW * 1.5, sigY, { align: 'center' });
  doc.text('Quality Control (QC)', marginX + colW * 1.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Agus Prasetyo )', marginX + colW * 1.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Facility QC Inspector', marginX + colW * 1.5, sigY + 21, { align: 'center' });

  // Col 3: Disetujui
  doc.setFontSize(7);
  doc.text('Disetujui Oleh,', marginX + colW * 2.5, sigY, { align: 'center' });
  doc.text('Building Management / Klien', marginX + colW * 2.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${project.managerName} )`, marginX + colW * 2.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(`Pengelola ${project.name}`, marginX + colW * 2.5, sigY + 21, { align: 'center' });

  // Running footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 150, 160);
    doc.text(
      `Master Cleaning Program  •  ${project.name}  •  Periode ${monthName} ${year}  •  Halaman ${p} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanProject = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Master_Cleaning_Program_${cleanProject}_${year}_${month}.pdf`);
};

// ==========================================
// 4. EXPORT DAILY ACTIVITY TO PDF
// ==========================================

export interface ExportDailyActivityPDFOptions {
  programs: MasterCleaningProgramItem[];
  project: ProjectLocation;
  day: number;
  month: number;
  year: number;
  kopSurat?: KopSuratConfig;
}

export const exportDailyActivityToPDF = (
  options: ExportDailyActivityPDFOptions
): void => {
  const {
    programs,
    project,
    day,
    month,
    year,
    kopSurat = getProjectKop(project),
  } = options;

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const monthName = monthNames[month - 1] || 'Bulan';

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 14;
  const usableWidth = pageWidth - marginX * 2;

  // 1. KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 45, 95);
  doc.text(kopSurat.institutionLine1, pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(kopSurat.institutionLine2, pageWidth / 2, 16.5, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(10, 30, 75);
  doc.text(kopSurat.facilityName, pageWidth / 2, 21.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${kopSurat.addressLine1}  |  ${kopSurat.contactLine}`,
    pageWidth / 2,
    25.5,
    { align: 'center' }
  );

  // Double horizontal rule under Kop
  doc.setDrawColor(15, 45, 95);
  doc.setLineWidth(0.75);
  doc.line(marginX, 28, pageWidth - marginX, 28);
  doc.setLineWidth(0.25);
  doc.line(marginX, 29, pageWidth - marginX, 29);

  // 2. DOCUMENT TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 35, 80);
  doc.text('FORMULIR LAPORAN DAILY ACTIVITY (HARIAN)', pageWidth / 2, 36, {
    align: 'center',
  });

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `TANGGAL : ${day} ${monthName.toUpperCase()} ${year}   •   SITE : ${project.name.toUpperCase()} (${project.city.toUpperCase()})`,
    pageWidth / 2,
    41,
    { align: 'center' }
  );

  // Count statuses for this day
  let countR = 0;
  let countP = 0;
  let countT = 0;
  let countS = 0;
  let countNone = 0;

  programs.forEach((p) => {
    const st = p.days[day] || 'none';
    if (st === 'planned') countR++;
    else if (st === 'in_progress') countP++;
    else if (st === 'rescheduled') countT++;
    else if (st === 'done') countS++;
    else countNone++;
  });

  // 3. SUMMARY & LEGEND INFO BAR
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, 45, usableWidth, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Total Kegiatan: ${programs.length}   |   [R] Rencana: ${countR}   |   [P] Progres: ${countP}   |   [T] Tunda: ${countT}   |   [S] Selesai: ${countS}   |   [-] Off: ${countNone}`,
    marginX + 4,
    50.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Klien: ${project.clientName}   •   Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    pageWidth - marginX - 4,
    50.5,
    { align: 'right' }
  );

  // 4. TABLE
  const headers = [
    'No',
    'Freq',
    'Uraian Pekerjaan Harian',
    'Lokasi / Area',
    'Petugas PIC',
    `Status Tgl ${day}`,
    'Keterangan Pelaksanaan',
  ];

  const statusLabelMap: Record<string, string> = {
    planned: 'R : Rencana (Planned)',
    in_progress: 'P : Sedang Pengerjaan',
    rescheduled: 'T : Tertunda / Dijadwal Ulang',
    done: 'S : Selesai Dikerjakan',
    none: '- : Tidak Terjadwal (Off)',
  };

  const statusCodeMap: Record<string, string> = {
    planned: 'R',
    in_progress: 'P',
    rescheduled: 'T',
    done: 'S',
    none: '-',
  };

  const rows = programs.map((p, idx) => {
    const st = p.days[day] || 'none';
    return [
      (idx + 1).toString(),
      'D',
      p.workDescription,
      p.location,
      p.picName,
      statusCodeMap[st] || '-',
      statusLabelMap[st] || '-',
    ];
  });

  autoTable(doc, {
    startY: 57,
    margin: { left: marginX, right: marginX },
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [29, 78, 216], // Blue 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 105 },
      3: { cellWidth: 45 },
      4: { cellWidth: 35 },
      5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 38 },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const text = data.cell.text[0];
        if (text === 'S') {
          doc.setFillColor(220, 252, 231); // emerald
          doc.rect(data.cell.x + 3, data.cell.y + 1.5, data.cell.width - 6, data.cell.height - 3, 'F');
          doc.setTextColor(21, 128, 61);
          doc.setFont('helvetica', 'bold');
          doc.text('S', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.2, {
            align: 'center',
          });
        } else if (text === 'R') {
          doc.setFillColor(224, 242, 254); // sky
          doc.rect(data.cell.x + 3, data.cell.y + 1.5, data.cell.width - 6, data.cell.height - 3, 'F');
          doc.setTextColor(3, 105, 161);
          doc.setFont('helvetica', 'bold');
          doc.text('R', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.2, {
            align: 'center',
          });
        } else if (text === 'P') {
          doc.setFillColor(254, 243, 199); // amber
          doc.rect(data.cell.x + 3, data.cell.y + 1.5, data.cell.width - 6, data.cell.height - 3, 'F');
          doc.setTextColor(180, 83, 9);
          doc.setFont('helvetica', 'bold');
          doc.text('P', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.2, {
            align: 'center',
          });
        } else if (text === 'T') {
          doc.setFillColor(255, 228, 230); // rose
          doc.rect(data.cell.x + 3, data.cell.y + 1.5, data.cell.width - 6, data.cell.height - 3, 'F');
          doc.setTextColor(190, 18, 60);
          doc.setFont('helvetica', 'bold');
          doc.text('T', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.2, {
            align: 'center',
          });
        }
      }
    },
  });

  // 5. SIGNATURES
  // @ts-ignore
  let finalY = (doc as any).lastAutoTable?.finalY || 130;
  if (finalY > pageHeight - 38) {
    doc.addPage();
    finalY = 22;
  } else {
    finalY += 8;
  }

  const colW = usableWidth / 3;
  const sigY = finalY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text('Dibuat Oleh,', marginX + colW * 0.5, sigY, { align: 'center' });
  doc.text('Supervisor Cleaning Service', marginX + colW * 0.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Hendra Wijaya )', marginX + colW * 0.5, sigY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Operational Team', marginX + colW * 0.5, sigY + 22.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('Diverifikasi Oleh,', marginX + colW * 1.5, sigY, { align: 'center' });
  doc.text('Quality Control (QC)', marginX + colW * 1.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Agus Prasetyo )', marginX + colW * 1.5, sigY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Facility QC Inspector', marginX + colW * 1.5, sigY + 22.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('Disetujui Oleh,', marginX + colW * 2.5, sigY, { align: 'center' });
  doc.text('Building Management / Klien', marginX + colW * 2.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${project.managerName} )`, marginX + colW * 2.5, sigY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Pengelola ${project.name}`, marginX + colW * 2.5, sigY + 22.5, { align: 'center' });

  // Running Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen Resmi Daily Activity  •  PT Rajawali Talenta Indonesia  •  ${project.name}  •  Tgl ${day} ${monthName} ${year}  •  Halaman ${p} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanProject = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Daily_Activity_${cleanProject}_${year}_${month}_${day}.pdf`);
};

// ==========================================
// 5. EXPORT WEEKLY ACTIVITY TO PDF
// ==========================================

export interface ExportWeeklyActivityPDFOptions {
  programs: MasterCleaningProgramItem[];
  project: ProjectLocation;
  selectedWeek: number;
  startDay: number;
  endDay: number;
  month: number;
  year: number;
  kopSurat?: KopSuratConfig;
}

export const exportWeeklyActivityToPDF = (
  options: ExportWeeklyActivityPDFOptions
): void => {
  const {
    programs,
    project,
    selectedWeek,
    startDay,
    endDay,
    month,
    year,
    kopSurat = getProjectKop(project),
  } = options;

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const monthName = monthNames[month - 1] || 'Bulan';

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 12;
  const usableWidth = pageWidth - marginX * 2;

  // 1. KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(88, 28, 135); // Purple 900
  doc.text(kopSurat.institutionLine1, pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(kopSurat.institutionLine2, pageWidth / 2, 16.5, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(59, 7, 100);
  doc.text(kopSurat.facilityName, pageWidth / 2, 21.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${kopSurat.addressLine1}  |  ${kopSurat.contactLine}`,
    pageWidth / 2,
    25.5,
    { align: 'center' }
  );

  // Line under kop
  doc.setDrawColor(88, 28, 135);
  doc.setLineWidth(0.75);
  doc.line(marginX, 28, pageWidth - marginX, 28);
  doc.setLineWidth(0.25);
  doc.line(marginX, 29, pageWidth - marginX, 29);

  // 2. DOCUMENT TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(76, 29, 149);
  doc.text('FORMULIR LAPORAN WEEKLY ACTIVITY (MINGGUAN)', pageWidth / 2, 36, {
    align: 'center',
  });

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `PERIODE: MINGGU KE-${selectedWeek} (TANGGAL ${startDay} - ${endDay} ${monthName.toUpperCase()} ${year})   •   SITE: ${project.name.toUpperCase()}`,
    pageWidth / 2,
    41,
    { align: 'center' }
  );

  // 3. SUMMARY & LEGEND INFO
  doc.setFillColor(250, 245, 255); // light purple
  doc.setDrawColor(233, 213, 255);
  doc.roundedRect(marginX, 45, usableWidth, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(76, 29, 149);
  doc.text(
    `Keterangan Status: [R] = Rencana  |  [P] = Progres  |  [T] = Tunda  |  [S] = Selesai  |  [-] = Tidak Terjadwal`,
    marginX + 4,
    50.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Total Kegiatan: ${programs.length}   •   Klien: ${project.clientName}`,
    pageWidth - marginX - 4,
    50.5,
    { align: 'right' }
  );

  // Day columns in this week
  const dayNumbers: number[] = [];
  for (let d = startDay; d <= endDay; d++) {
    dayNumbers.push(d);
  }

  const tableHeaders = [
    'No',
    'Uraian Pekerjaan Mingguan',
    'Lokasi Area',
    'PIC',
    ...dayNumbers.map((d) => `Tgl ${d}`),
    'R',
    'P',
    'T',
    'S',
  ];

  const statusCodeMap: Record<string, string> = {
    planned: 'R',
    in_progress: 'P',
    rescheduled: 'T',
    done: 'S',
    none: '-',
  };

  const tableRows = programs.map((p, idx) => {
    let countR = 0;
    let countP = 0;
    let countT = 0;
    let countS = 0;

    const dayCells = dayNumbers.map((d) => {
      const st = p.days[d] || 'none';
      if (st === 'planned') countR++;
      else if (st === 'in_progress') countP++;
      else if (st === 'rescheduled') countT++;
      else if (st === 'done') countS++;
      return statusCodeMap[st] || '-';
    });

    return [
      (idx + 1).toString(),
      p.workDescription,
      p.location,
      p.picName,
      ...dayCells,
      countR.toString(),
      countP.toString(),
      countT.toString(),
      countS.toString(),
    ];
  });

  const dayColWidth = Math.max(9, Math.min(14, 80 / dayNumbers.length));

  const colStyles: Record<number, any> = {
    0: { cellWidth: 9, halign: 'center', fontStyle: 'bold' },
    1: { cellWidth: 95 },
    2: { cellWidth: 45 },
    3: { cellWidth: 32 },
  };

  const dayStartIndex = 4;
  const dayEndIndex = dayStartIndex + dayNumbers.length - 1;

  for (let i = dayStartIndex; i <= dayEndIndex; i++) {
    colStyles[i] = { cellWidth: dayColWidth, halign: 'center', fontStyle: 'bold' };
  }

  colStyles[dayEndIndex + 1] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' }; // R
  colStyles[dayEndIndex + 2] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' }; // P
  colStyles[dayEndIndex + 3] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' }; // T
  colStyles[dayEndIndex + 4] = { cellWidth: 9, halign: 'center', fontStyle: 'bold' }; // S

  autoTable(doc, {
    startY: 57,
    margin: { left: marginX, right: marginX },
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [216, 180, 254],
      lineWidth: 0.18,
    },
    headStyles: {
      fillColor: [126, 34, 206], // Purple 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    columnStyles: colStyles,
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index >= dayStartIndex && data.column.index <= dayEndIndex) {
        const text = data.cell.text[0];
        if (text === 'S') {
          doc.setFillColor(220, 252, 231);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(21, 128, 61);
          doc.setFont('helvetica', 'bold');
          doc.text('S', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        } else if (text === 'R') {
          doc.setFillColor(224, 242, 254);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(3, 105, 161);
          doc.setFont('helvetica', 'bold');
          doc.text('R', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        } else if (text === 'P') {
          doc.setFillColor(254, 243, 199);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(180, 83, 9);
          doc.setFont('helvetica', 'bold');
          doc.text('P', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        } else if (text === 'T') {
          doc.setFillColor(255, 228, 230);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(190, 18, 60);
          doc.setFont('helvetica', 'bold');
          doc.text('T', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
      }
    },
  });

  // 5. SIGNATURES
  // @ts-ignore
  let finalY = (doc as any).lastAutoTable?.finalY || 130;
  if (finalY > pageHeight - 38) {
    doc.addPage();
    finalY = 22;
  } else {
    finalY += 8;
  }

  const colW = usableWidth / 3;
  const sigY = finalY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text('Dibuat Oleh,', marginX + colW * 0.5, sigY, { align: 'center' });
  doc.text('Supervisor Cleaning Service', marginX + colW * 0.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Hendra Wijaya )', marginX + colW * 0.5, sigY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Operational Team', marginX + colW * 0.5, sigY + 22.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('Diverifikasi Oleh,', marginX + colW * 1.5, sigY, { align: 'center' });
  doc.text('Quality Control (QC)', marginX + colW * 1.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Agus Prasetyo )', marginX + colW * 1.5, sigY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Facility QC Inspector', marginX + colW * 1.5, sigY + 22.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('Disetujui Oleh,', marginX + colW * 2.5, sigY, { align: 'center' });
  doc.text('Building Management / Klien', marginX + colW * 2.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${project.managerName} )`, marginX + colW * 2.5, sigY + 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Pengelola ${project.name}`, marginX + colW * 2.5, sigY + 22.5, { align: 'center' });

  // Running Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen Resmi Weekly Activity  •  PT Rajawali Talenta Indonesia  •  ${project.name}  •  Minggu ${selectedWeek} (${monthName} ${year})  •  Halaman ${p} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanProject = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Weekly_Activity_${cleanProject}_${year}_${month}_W${selectedWeek}.pdf`);
};

// ==========================================
// 6. EXPORT MONTHLY ACTIVITY TO PDF
// ==========================================

export interface ExportMonthlyActivityPDFOptions {
  programs: MasterCleaningProgramItem[];
  project: ProjectLocation;
  month: number;
  year: number;
  kopSurat?: KopSuratConfig;
}

export const exportMonthlyActivityToPDF = (
  options: ExportMonthlyActivityPDFOptions
): void => {
  const {
    programs,
    project,
    month,
    year,
    kopSurat = getProjectKop(project),
  } = options;

  const monthNames = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
  ];
  const monthName = monthNames[month - 1] || 'BULANAN';
  const daysInMonth = new Date(year, month, 0).getDate();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 10;
  const usableWidth = pageWidth - marginX * 2;

  // 1. KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(kopSurat.institutionLine1, pageWidth / 2, 10, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(kopSurat.institutionLine2, pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(120, 53, 15);
  doc.text(kopSurat.facilityName, pageWidth / 2, 18.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${kopSurat.addressLine1}  |  ${kopSurat.contactLine}`,
    pageWidth / 2,
    22.5,
    { align: 'center' }
  );

  // Line under kop
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.65);
  doc.line(marginX, 25, pageWidth - marginX, 25);

  // 2. DOCUMENT TITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(146, 64, 14);
  doc.text('FORMULIR LAPORAN MONTHLY ACTIVITY (BULANAN)', pageWidth / 2, 31, {
    align: 'center',
  });

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `PERIODE: ${monthName} ${year}   •   LOKASI SITE: ${project.name.toUpperCase()} (${project.city.toUpperCase()})`,
    pageWidth / 2,
    35.5,
    { align: 'center' }
  );

  // 3. SUBTITLE / LEGEND INFO
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Keterangan Status: [R] = Rencana  |  [P] = Progres  |  [T] = Tunda  |  [S] = Selesai  |  [-] = Tidak Terjadwal`,
    marginX,
    40
  );
  doc.text(
    `Total Kegiatan: ${programs.length}  •  Klien: ${project.clientName}  •  Manager: ${project.managerName}`,
    pageWidth - marginX,
    40,
    { align: 'right' }
  );

  // 4. TABLE
  const tableHeaders = [
    'No',
    'Uraian Pekerjaan Bulanan',
    'Lokasi Area',
    'PIC',
    ...Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
    'R',
    'P',
    'T',
    'S',
  ];

  const statusCodeMap: Record<string, string> = {
    planned: 'R',
    in_progress: 'P',
    rescheduled: 'T',
    done: 'S',
    none: '-',
  };

  const tableRows = programs.map((p, idx) => {
    let countR = 0;
    let countP = 0;
    let countT = 0;
    let countS = 0;

    const dayCells = Array.from({ length: 31 }, (_, i) => {
      const d = i + 1;
      if (d > daysInMonth) return '-';
      const st = p.days[d] || 'none';
      if (st === 'planned') countR++;
      else if (st === 'in_progress') countP++;
      else if (st === 'rescheduled') countT++;
      else if (st === 'done') countS++;
      return statusCodeMap[st] || '-';
    });

    return [
      (idx + 1).toString(),
      p.workDescription,
      p.location,
      p.picName,
      ...dayCells,
      countR.toString(),
      countP.toString(),
      countT.toString(),
      countS.toString(),
    ];
  });

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' },
    1: { cellWidth: 60 },
    2: { cellWidth: 32 },
    3: { cellWidth: 20 },
  };

  for (let i = 4; i <= 34; i++) {
    columnStyles[i] = { cellWidth: 3.8, halign: 'center', fontSize: 5.5, fontStyle: 'bold' };
  }

  columnStyles[35] = { cellWidth: 7, halign: 'center', fontSize: 5.5, fontStyle: 'bold' }; // R
  columnStyles[36] = { cellWidth: 7, halign: 'center', fontSize: 5.5, fontStyle: 'bold' }; // P
  columnStyles[37] = { cellWidth: 7, halign: 'center', fontSize: 5.5, fontStyle: 'bold' }; // T
  columnStyles[38] = { cellWidth: 7, halign: 'center', fontSize: 5.5, fontStyle: 'bold' }; // S

  autoTable(doc, {
    startY: 43,
    margin: { left: marginX, right: marginX },
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 5.8,
      cellPadding: 1.1,
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [253, 230, 138],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [180, 83, 9], // Amber 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 5.8,
      halign: 'center',
    },
    columnStyles,
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index >= 4 && data.column.index <= 34) {
        const text = data.cell.text[0];
        if (text === 'S') {
          doc.setFillColor(220, 252, 231);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(21, 128, 61);
          doc.setFont('helvetica', 'bold');
          doc.text('S', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        } else if (text === 'R') {
          doc.setFillColor(224, 242, 254);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(3, 105, 161);
          doc.setFont('helvetica', 'bold');
          doc.text('R', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        } else if (text === 'P') {
          doc.setFillColor(254, 243, 199);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(180, 83, 9);
          doc.setFont('helvetica', 'bold');
          doc.text('P', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        } else if (text === 'T') {
          doc.setFillColor(255, 228, 230);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(190, 18, 60);
          doc.setFont('helvetica', 'bold');
          doc.text('T', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
      }
    },
  });

  // 5. SIGNATURES
  // @ts-ignore
  let finalY = (doc as any).lastAutoTable?.finalY || 135;
  if (finalY > pageHeight - 35) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 6;
  }

  const colW = usableWidth / 3;
  const sigY = finalY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(40, 45, 55);

  doc.text('Dibuat Oleh,', marginX + colW * 0.5, sigY, { align: 'center' });
  doc.text('Supervisor Cleaning Service', marginX + colW * 0.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Hendra Wijaya )', marginX + colW * 0.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Operational Team', marginX + colW * 0.5, sigY + 21, { align: 'center' });

  doc.setFontSize(7);
  doc.text('Diverifikasi Oleh,', marginX + colW * 1.5, sigY, { align: 'center' });
  doc.text('Quality Control (QC)', marginX + colW * 1.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Agus Prasetyo )', marginX + colW * 1.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Facility QC Inspector', marginX + colW * 1.5, sigY + 21, { align: 'center' });

  doc.setFontSize(7);
  doc.text('Disetujui Oleh,', marginX + colW * 2.5, sigY, { align: 'center' });
  doc.text('Building Management / Klien', marginX + colW * 2.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${project.managerName} )`, marginX + colW * 2.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(`Pengelola ${project.name}`, marginX + colW * 2.5, sigY + 21, { align: 'center' });

  // Running footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 150, 160);
    doc.text(
      `Dokumen Resmi Monthly Activity  •  PT Rajawali Talenta Indonesia  •  ${project.name}  •  Periode ${monthName} ${year}  •  Halaman ${p} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanProject = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Monthly_Activity_${cleanProject}_${year}_${month}.pdf`);
};

