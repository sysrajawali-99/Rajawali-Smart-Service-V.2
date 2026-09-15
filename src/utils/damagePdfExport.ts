import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FacilityDamageReport, ProjectLocation } from '../types';
import { getProjectKop, DEFAULT_HOSPITAL_KOP, KopSuratConfig } from './pdfExport';

// Helper to convert an image url to base64 data URL
export const loadImageAsDataUrl = async (url: string, timeoutMs: number = 3000): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 400;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
};

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'sanitair':
      return 'Sanitair & Plumbing';
    case 'elektrikal':
      return 'Elektrikal & Penerangan';
    case 'mekanikal':
      return 'Mekanikal & Tata Udara';
    case 'sipil_arsitektur':
      return 'Sipil & Arsitektur (Kaca/Lantai/Pintu)';
    case 'furniture_interior':
      return 'Furniture & Interior';
    case 'eskalator_lift':
      return 'Eskalator & Lift (VT)';
    case 'alat_kerja':
      return 'Peralatan & Mesin Cleaning';
    default:
      return 'Fasilitas Umum / Lainnya';
  }
};

const getSeverityLabel = (sev: string): string => {
  switch (sev) {
    case 'kritis':
      return 'KRITIS (Bahaya Langsung)';
    case 'berat':
      return 'BERAT (Fungsi Terhenti)';
    case 'sedang':
      return 'SEDANG (Terganggu)';
    case 'ringan':
      return 'RINGAN (Estetika/Minor)';
    default:
      return sev;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'dilaporkan':
      return 'Dilaporkan';
    case 'dalam_penanganan':
      return 'Dalam Penanganan';
    case 'menunggu_sparepart':
      return 'Menunggu Sparepart';
    case 'selesai':
      return 'Selesai Diperbaiki';
    case 'ditolak':
      return 'Ditolak / Dibatalkan';
    default:
      return status;
  }
};

// Helper: draw official Kop Surat header
const drawOfficialKop = (
  doc: jsPDF,
  kop: KopSuratConfig,
  pageWidth: number,
  marginX: number
): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 50, 90);
  doc.text(kop.institutionLine1, pageWidth / 2, 11, { align: 'center' });

  doc.setFontSize(8.5);
  doc.text(kop.institutionLine2, pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(10, 40, 80);
  doc.text(kop.facilityName, pageWidth / 2, 19.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text(kop.addressLine1, pageWidth / 2, 23.5, { align: 'center' });
  doc.text(kop.contactLine, pageWidth / 2, 27, { align: 'center' });

  // Double horizontal rule under Kop
  doc.setDrawColor(20, 40, 80);
  doc.setLineWidth(0.7);
  doc.line(marginX, 30, pageWidth - marginX, 30);
  doc.setLineWidth(0.2);
  doc.line(marginX, 31, pageWidth - marginX, 31);

  return 34; // Next Y coordinate
};

// =========================================================================
// 1. EXPORT REKAPITULASI LAPORAN KERUSAKAN FASILITAS (LANDSCAPE A4)
// =========================================================================
export interface ExportDamageSummaryOptions {
  reports: FacilityDamageReport[];
  project: ProjectLocation;
  kopSurat?: KopSuratConfig;
  filterPeriod?: string;
  filterStatus?: string;
  filterCategory?: string;
  filterFloor?: string;
}

export const exportDamageSummaryToPDF = (options: ExportDamageSummaryOptions): void => {
  const {
    reports,
    project,
    kopSurat = getProjectKop(project) || DEFAULT_HOSPITAL_KOP,
    filterPeriod,
    filterStatus,
    filterCategory,
    filterFloor,
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 12;

  // 1. Kop Surat
  const startY = drawOfficialKop(doc, kopSurat, pageWidth, marginX);

  // 2. Judul Dokumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 35, 75);
  doc.text('REKAPITULASI LAPORAN KERUSAKAN BARANG & FASILITAS GEDUNG', pageWidth / 2, startY + 3, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 105);
  const periodText = filterPeriod ? `Periode: ${filterPeriod}` : `Semua Periode • Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  doc.text(`Lokasi: ${project.name} (${project.address})  |  ${periodText}`, pageWidth / 2, startY + 7.5, { align: 'center' });

  // 3. Mini KPI Summary Cards on Top
  const totalReports = reports.length;
  const completedCount = reports.filter((r) => r.status === 'selesai').length;
  const inProgressCount = reports.filter((r) => r.status === 'dalam_penanganan' || r.status === 'menunggu_sparepart').length;
  const openCount = reports.filter((r) => r.status === 'dilaporkan').length;
  const criticalCount = reports.filter((r) => r.damageLevel === 'kritis' || r.damageLevel === 'berat').length;
  const totalCost = reports.reduce((acc, curr) => acc + (curr.costEstimate || 0), 0);

  const kpiY = startY + 11;
  const kpiCardWidth = (pageWidth - marginX * 2 - 16) / 5;
  const kpiH = 13;

  const kpis = [
    { label: 'Total Laporan', value: `${totalReports} Tiket`, color: [30, 58, 138] },
    { label: 'Selesai Diperbaiki', value: `${completedCount} Kasus`, color: [16, 149, 100] },
    { label: 'Sedang Ditangani', value: `${inProgressCount} Kasus`, color: [217, 119, 6] },
    { label: 'Prioritas Kritis/Berat', value: `${criticalCount} Kasus`, color: [220, 38, 38] },
    {
      label: 'Estimasi Biaya Total',
      value: `Rp ${totalCost.toLocaleString('id-ID')}`,
      color: [79, 70, 229],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = marginX + idx * (kpiCardWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kpiX, kpiY, kpiCardWidth, kpiH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label.toUpperCase(), kpiX + kpiCardWidth / 2, kpiY + 4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, kpiX + kpiCardWidth / 2, kpiY + 9.5, { align: 'center' });
  });

  // 4. Data Table with AutoTable
  const tableHead = [
    [
      'No',
      'No. Tiket',
      'Tgl & Jam',
      'Nama Barang / Fasilitas',
      'Lokasi & Lantai',
      'Kategori & Tingkat',
      'Uraian Kerusakan & Dugaan',
      'Tindakan Awal Petugas',
      'Status',
      'Dept / Teknisi',
      'Estimasi Biaya',
    ],
  ];

  const tableBody = reports.map((r, idx) => {
    const costText = r.costEstimate ? `Rp ${r.costEstimate.toLocaleString('id-ID')}` : '-';
    return [
      idx + 1,
      r.ticketNo,
      `${r.reportDate}\n${r.reportTime || ''}`,
      r.itemName,
      `${r.locationName}\n(${r.floor}${r.zone ? ` - ${r.zone}` : ''})`,
      `${getCategoryLabel(r.category)}\n[${getSeverityLabel(r.damageLevel).toUpperCase()}]`,
      r.chronology + (r.impact ? `\n(Dampak: ${r.impact})` : ''),
      r.actionTaken || '-',
      getStatusLabel(r.status).toUpperCase(),
      `${r.targetDepartment}\nPIC: ${r.technicianName || 'Belum ditugaskan'}`,
      `${costText}\n${r.repairedDate ? `Selesai: ${r.repairedDate}` : ''}`,
    ];
  });

  autoTable(doc, {
    startY: kpiY + kpiH + 3.5,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.6,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 32, fontStyle: 'bold' },
      4: { cellWidth: 26 },
      5: { cellWidth: 28 },
      6: { cellWidth: 46 },
      7: { cellWidth: 32 },
      8: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: 28 },
      10: { cellWidth: 20, halign: 'right' },
    },
    didParseCell: (data) => {
      // Color code status column (index 8)
      if (data.section === 'body' && data.column.index === 8) {
        const text = String(data.cell.raw).toLowerCase();
        if (text.includes('selesai')) {
          data.cell.styles.textColor = [16, 149, 100];
        } else if (text.includes('dalam penanganan') || text.includes('sparepart')) {
          data.cell.styles.textColor = [194, 65, 12];
        } else if (text.includes('dilaporkan')) {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    },
  });

  // 5. Verification Signatures (3 Columns)
  let finalY = (doc as any).lastAutoTable?.finalY || 160;
  if (finalY > pageHeight - 38) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 6;
  }

  const usableWidth = pageWidth - marginX * 2;
  const colW = usableWidth / 3;
  const sigY = finalY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 45, 55);

  doc.text('Dilaporkan & Dibuat Oleh,', marginX + colW * 0.5, sigY, { align: 'center' });
  doc.text('Supervisor Cleaning / Operasional', marginX + colW * 0.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Hendra Wijaya )', marginX + colW * 0.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('PT Rajawali Talenta Indonesia', marginX + colW * 0.5, sigY + 21, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('Ditindaklanjuti & Diperiksa Oleh,', marginX + colW * 1.5, sigY, { align: 'center' });
  doc.text('Head of Engineering / MEP / Teknisi', marginX + colW * 1.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('( Bambang Irawan / Tim MEP )', marginX + colW * 1.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Maintenance & Engineering Dept', marginX + colW * 1.5, sigY + 21, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('Diketahui & Disetujui Oleh,', marginX + colW * 2.5, sigY, { align: 'center' });
  doc.text('Building Manager / Pengelola Gedung', marginX + colW * 2.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${project.managerName} )`, marginX + colW * 2.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Pengelola ${project.name}`, marginX + colW * 2.5, sigY + 21, { align: 'center' });

  // Running footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 150, 160);
    doc.text(
      `Dokumen Rekapitulasi Kerusakan Barang / Fasilitas  •  ${project.name}  •  Dicetak: ${new Date().toLocaleString('id-ID')}  •  Halaman ${p} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const cleanProject = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_Kerusakan_${cleanProject}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// =========================================================================
// 2. EXPORT BERITA ACARA KERUSAKAN & SURAT PERINTAH KERJA (PORTRAIT A4)
// =========================================================================
export interface ExportDamageWorkOrderOptions {
  report: FacilityDamageReport;
  project: ProjectLocation;
  kopSurat?: KopSuratConfig;
}

export const exportDamageWorkOrderToPDF = async (options: ExportDamageWorkOrderOptions): Promise<void> => {
  const {
    report,
    project,
    kopSurat = getProjectKop(project) || DEFAULT_HOSPITAL_KOP,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;

  // 1. Kop Surat
  const startY = drawOfficialKop(doc, kopSurat, pageWidth, marginX);

  // 2. Judul Dokumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 35, 75);
  doc.text('BERITA ACARA & FORM LAPORAN KERUSAKAN FASILITAS', pageWidth / 2, startY + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 95);
  doc.text(`SURAT PERINTAH PENANGANAN / WORK ORDER PERBAIKAN  •  NO. TIKET: ${report.ticketNo}`, pageWidth / 2, startY + 7.5, { align: 'center' });

  // 3. Status Ribbon
  const ribbonY = startY + 10.5;
  const statusColor =
    report.status === 'selesai'
      ? [16, 149, 100]
      : report.status === 'dalam_penanganan' || report.status === 'menunggu_sparepart'
      ? [217, 119, 6]
      : [220, 38, 38];

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(marginX, ribbonY, pageWidth - marginX * 2, 6.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `STATUS: ${getStatusLabel(report.status).toUpperCase()}   |   TINGKAT KERUSAKAN: ${getSeverityLabel(report.damageLevel).toUpperCase()}   |   PRIORITAS: ${report.priority.toUpperCase()}`,
    pageWidth / 2,
    ribbonY + 4.4,
    { align: 'center' }
  );

  // 4. Section 1: Data Identitas Tiket & Lokasi (Table Grid)
  const detailGridY = ribbonY + 8.5;

  autoTable(doc, {
    startY: detailGridY,
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 53 },
      2: { cellWidth: 38, fontStyle: 'bold', fillColor: [248, 250, 252] },
      3: { cellWidth: 53 },
    },
    body: [
      ['Nomor Tiket Laporan', report.ticketNo, 'Tanggal & Jam Lapor', `${report.reportDate} - ${report.reportTime || '-'}`],
      ['Nama Fasilitas / Objek', report.itemName, 'Kategori Fasilitas', getCategoryLabel(report.category)],
      ['Lokasi / Ruangan', report.locationName, 'Lantai & Gedung', `${report.floor} - ${project.name}`],
      ['Zona Area', report.zone || '-', 'Departemen Tujuan', report.targetDepartment],
      ['Nama Pelapor', `${report.reporterName} (${report.reporterRole || 'Petugas'})`, 'Kontak Pelapor', report.reporterPhone || '-'],
    ],
  });

  let currentY = (doc as any).lastAutoTable?.finalY + 4;

  // 5. Section 2: Kronologi, Dampak, & Tindakan Awal (Descriptive Box)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 50, 90);
  doc.text('I. RINCIAN KRONOLOGI & INDIKASI KERUSAKAN', marginX, currentY);

  autoTable(doc, {
    startY: currentY + 1.5,
    theme: 'plain',
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      fillColor: [248, 250, 252],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 140 },
    },
    body: [
      ['Kronologi Kejadian', report.chronology],
      ['Dampak Operasional', report.impact || 'Tidak mengganggu langsung, namun memerlukan tindakan sebelum bertambah parah.'],
      ['Tindakan Mitigasi Awal', report.actionTaken || 'Telah diamankan oleh petugas cleaning di lapangan.'],
    ],
  });

  currentY = (doc as any).lastAutoTable?.finalY + 4.5;

  // 6. Section 3: Dokumentasi Foto (Sebelum & Sesudah)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 50, 90);
  doc.text('II. DOKUMENTASI FISIK LAPANGAN (BEFORE & AFTER)', marginX, currentY);

  const photoBoxW = (pageWidth - marginX * 2 - 8) / 2;
  const photoBoxH = 46;
  const photoY = currentY + 2;

  // Load photos asynchronously
  let beforeDataUrl: string | null = null;
  let afterDataUrl: string | null = null;

  if (report.photoBefore) {
    beforeDataUrl = await loadImageAsDataUrl(report.photoBefore);
  }
  if (report.photoAfter) {
    afterDataUrl = await loadImageAsDataUrl(report.photoAfter);
  }

  // Draw Before Card
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(252, 165, 165);
  doc.roundedRect(marginX, photoY, photoBoxW, photoBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(220, 38, 38);
  doc.rect(marginX, photoY, photoBoxW, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FOTO BUKTI KERUSAKAN (SAAT DILAPORKAN)', marginX + photoBoxW / 2, photoY + 3.5, { align: 'center' });

  if (beforeDataUrl) {
    try {
      doc.addImage(beforeDataUrl, 'JPEG', marginX + 2, photoY + 6, photoBoxW - 4, photoBoxH - 12);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(150, 50, 50);
      doc.text('[ Lampiran Foto Kerusakan ]', marginX + photoBoxW / 2, photoY + photoBoxH / 2, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(150, 50, 50);
    doc.text('[ Lampiran Foto Kerusakan ]', marginX + photoBoxW / 2, photoY + photoBoxH / 2, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`Waktu Lapor: ${report.reportDate} ${report.reportTime || ''}`, marginX + photoBoxW / 2, photoY + photoBoxH - 2, { align: 'center' });

  // Draw After Card
  const afterX = marginX + photoBoxW + 8;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(afterX, photoY, photoBoxW, photoBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(16, 149, 100);
  doc.rect(afterX, photoY, photoBoxW, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FOTO BUKTI SETELAH SELESAI DIPERBAIKI', afterX + photoBoxW / 2, photoY + 3.5, { align: 'center' });

  if (afterDataUrl) {
    try {
      doc.addImage(afterDataUrl, 'JPEG', afterX + 2, photoY + 6, photoBoxW - 4, photoBoxH - 12);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(50, 120, 70);
      doc.text(
        report.status === 'selesai' ? '[ Foto Perbaikan Selesai ]' : '[ Dalam Proses Penanganan / Belum Selesai ]',
        afterX + photoBoxW / 2,
        photoY + photoBoxH / 2,
        { align: 'center' }
      );
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(70, 120, 80);
    doc.text(
      report.status === 'selesai' ? '[ Foto Perbaikan Selesai ]' : '[ Dalam Proses Penanganan / Belum Selesai ]',
      afterX + photoBoxW / 2,
      photoY + photoBoxH / 2,
      { align: 'center' }
    );
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(
    report.repairedDate ? `Selesai: ${report.repairedDate} ${report.repairedTime || ''}` : 'Status: Belum Rampung',
    afterX + photoBoxW / 2,
    photoY + photoBoxH - 2,
    { align: 'center' }
  );

  currentY = photoY + photoBoxH + 4;

  // 7. Section 4: Hasil Tindakan Teknisi & Engineering
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 50, 90);
  doc.text('III. HASIL TINDAKAN PERBAIKAN & USULAN TEKNIS', marginX, currentY);

  autoTable(doc, {
    startY: currentY + 1.5,
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 140 },
    },
    body: [
      ['Teknisi PIC / Pelaksana', report.technicianName || 'Tim Maintenance & Engineering Standby'],
      ['Tindakan Perbaikan / Catatan', report.technicianNotes || 'Pemeriksaan awal di lokasi, penggantian komponen atau pengencangan struktur.'],
      ['Estimasi / Realisasi Biaya', report.costEstimate ? `Rp ${report.costEstimate.toLocaleString('id-ID')}` : 'Ditanggung pemeliharaan rutin internal gedung'],
      ['Tanggal & Jam Penyelesaian', report.repairedDate ? `${report.repairedDate} ${report.repairedTime || ''}` : 'Masih dalam proses pengerjaan'],
    ],
  });

  currentY = (doc as any).lastAutoTable?.finalY + 6;

  // 8. Section 5: Lembar Tanda Tangan & Serah Terima Hasil Pekerjaan
  if (currentY > pageHeight - 38) {
    doc.addPage();
    currentY = 20;
  }

  const usableWidth = pageWidth - marginX * 2;
  const colW = usableWidth / 3;
  const sigY = currentY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 45, 55);

  doc.text('Pelapor (Cleaning Service),', marginX + colW * 0.5, sigY, { align: 'center' });
  doc.text('Petugas / Supervisor', marginX + colW * 0.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${report.reporterName} )`, marginX + colW * 0.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(report.reporterRole || 'Tim Kebersihan', marginX + colW * 0.5, sigY + 21, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('Pelaksana Perbaikan,', marginX + colW * 1.5, sigY, { align: 'center' });
  doc.text('Teknisi / Vendor Rekanan', marginX + colW * 1.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${report.technicianName || 'Bambang Irawan'} )`, marginX + colW * 1.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(report.targetDepartment, marginX + colW * 1.5, sigY + 21, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('Mengetahui & Verifikasi,', marginX + colW * 2.5, sigY, { align: 'center' });
  doc.text('Facility / Building Manager', marginX + colW * 2.5, sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${project.managerName} )`, marginX + colW * 2.5, sigY + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Pengelola ${project.name}`, marginX + colW * 2.5, sigY + 21, { align: 'center' });

  // Running Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140, 150, 160);
    doc.text(
      `Dokumen Resmi Berita Acara Kerusakan Fasilitas • No. Tiket: ${report.ticketNo} • ${project.name} • Halaman ${p} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanTicket = report.ticketNo.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Berita_Acara_Kerusakan_${cleanTicket}.pdf`);
};
