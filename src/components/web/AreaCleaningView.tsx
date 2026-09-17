import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Building2,
  Layers,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  X,
  Check,
  Sparkles,
  ArrowUpDown,
  Footprints,
  DoorOpen,
  Maximize2,
  Wrench,
  Info,
  Tag,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { Area } from '../../types';

// Preset suggestions for quick material selection
const POPULAR_MATERIALS_BY_CATEGORY: {
  category: string;
  items: string[];
}[] = [
  {
    category: 'Eskalator & Lift',
    items: [
      'Trap Besi',
      'Bordes Stainless',
      'Karet Railing',
      'Kaca',
      'Kaca Balustrade',
      'Dinding Stainless Hairline Checker',
      'Stainless Mirror',
      'Cermin Lift',
      'Tombol COP Panel',
      'Lantai Plat Besi Bordes',
    ],
  },
  {
    category: 'Lantai & Penutup',
    items: [
      'Lantai Granit / Marmer',
      'Homogeneous Tile',
      'Keramik Kasar Anti-Slip',
      'Keramik 60x60',
      'Epoxy Floor',
      'Vinyl Tile',
      'Karpet Tile / Komersial',
      'Parquet / Kayu',
      'Lantai Semen Polished',
    ],
  },
  {
    category: 'Dinding, Kaca & Plafond',
    items: [
      'Pintu Kaca Tempered',
      'Kaca Jendela Frameless',
      'Dinding Keramik',
      'Dinding Partisi HPL',
      'Dinding Cat Semigloss',
      'Travertine / Marmer Dinding',
      'Plafond Gypsum',
      'Aluminium Composite (ACP)',
      'Skirting PVC / Kayu',
    ],
  },
  {
    category: 'Sanitair & Perlengkapan Toilet',
    items: [
      'Urinoir Porselen',
      'Kloset Porselen',
      'Kaca Cermin',
      'Wastafel Keramik',
      'Partisi Phenolic',
      'Kran Stainless Chrome',
      'Floor Drain Stainless',
    ],
  },
  {
    category: 'Furniture & Fasilitas Komunal',
    items: [
      'Meja Resepsionis HPL',
      'Bench Duduk Kayu & Stainless',
      'Void Atrium Kaca',
      'Kolom Marmer',
      'Standing Asbak Stainless',
      'Railing Tangga Stainless',
    ],
  },
];

export const AreaCleaningView: React.FC = () => {
  const { areas, cleaners, addArea, updateArea, deleteArea, activeProject } = useCleaning();

  // Search and Filter State
  const [search, setSearch] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeAreaForMaterial, setActiveAreaForMaterial] = useState<Area | null>(null);
  const [activeAreaForEdit, setActiveAreaForEdit] = useState<Area | null>(null);

  // Material Editor Form State
  const [currentMaterials, setCurrentMaterials] = useState<string[]>([]);
  const [newMaterialInput, setNewMaterialInput] = useState('');
  const [materialNotesInput, setMaterialNotesInput] = useState('');

  // Add Area Form State
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaFloor, setNewAreaFloor] = useState('Lantai GF');
  const [customFloorInput, setCustomFloorInput] = useState('');
  const [isCustomFloor, setIsCustomFloor] = useState(false);
  const [newAreaZone, setNewAreaZone] = useState('Zona A Sirkulasi');
  const [newAreaType, setNewAreaType] = useState<Area['type']>('lobby');
  const [newAreaCode, setNewAreaCode] = useState('');
  const [newAreaMaterials, setNewAreaMaterials] = useState<string[]>([]);
  const [newAreaMaterialText, setNewAreaMaterialText] = useState('');
  const [newAreaDescription, setNewAreaDescription] = useState('');
  const [newAreaCleanerId, setNewAreaCleanerId] = useState(cleaners[0]?.id || '');

  // Edit Area Form State
  const [editName, setEditName] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editZone, setEditZone] = useState('');
  const [editType, setEditType] = useState<Area['type']>('lobby');
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Keyboard shortcut: Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMaterialModal(false);
        setShowAddModal(false);
        setShowEditModal(false);
      }
    };
    if (showMaterialModal || showAddModal || showEditModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showMaterialModal, showAddModal, showEditModal]);

  // Distinct Floor List derived from areas
  const existingFloors = useMemo(() => {
    const set = new Set<string>();
    // Make sure 'Lantai GF' is prioritized at the front if it exists
    areas.forEach((a) => {
      if (a.floor) set.add(a.floor);
    });
    const list = Array.from(set);
    list.sort((a, b) => {
      if (a.includes('GF')) return -1;
      if (b.includes('GF')) return 1;
      return a.localeCompare(b);
    });
    return list;
  }, [areas]);

  // Filtered areas based on search, floor, and type
  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        area.name.toLowerCase().includes(q) ||
        area.code.toLowerCase().includes(q) ||
        (area.zone && area.zone.toLowerCase().includes(q)) ||
        (area.floor && area.floor.toLowerCase().includes(q)) ||
        (area.description && area.description.toLowerCase().includes(q)) ||
        (area.materials && area.materials.some((m) => m.toLowerCase().includes(q)));

      const matchFloor = selectedFloor === 'all' || area.floor === selectedFloor;
      const matchType = selectedType === 'all' || area.type === selectedType;

      return matchSearch && matchFloor && matchType;
    });
  }, [areas, search, selectedFloor, selectedType]);

  // Group areas by floor
  const areasByFloor = useMemo(() => {
    const grouped: Record<string, Area[]> = {};
    filteredAreas.forEach((area) => {
      const fl = area.floor || 'Lainnya';
      if (!grouped[fl]) grouped[fl] = [];
      grouped[fl].push(area);
    });
    return grouped;
  }, [filteredAreas]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalLocations = areas.length;
    const floorCount = existingFloors.length;
    let totalMaterialCount = 0;
    areas.forEach((a) => {
      totalMaterialCount += a.materials?.length || 0;
    });
    const avgMaterial = totalLocations > 0 ? (totalMaterialCount / totalLocations).toFixed(1) : '0';
    return {
      totalLocations,
      floorCount,
      totalMaterialCount,
      avgMaterial,
    };
  }, [areas, existingFloors]);

  // Open Material Modal
  const handleOpenMaterialModal = (area: Area) => {
    setActiveAreaForMaterial(area);
    setCurrentMaterials(area.materials ? [...area.materials] : []);
    setMaterialNotesInput(area.materialNotes || '');
    setNewMaterialInput('');
    setShowMaterialModal(true);
  };

  // Add Material in Modal
  const handleAddMaterialToCurrent = (matName: string) => {
    const cleanName = matName.trim();
    if (!cleanName) return;
    if (currentMaterials.some((m) => m.toLowerCase() === cleanName.toLowerCase())) {
      return; // already exists
    }
    setCurrentMaterials((prev) => [...prev, cleanName]);
    setNewMaterialInput('');
  };

  // Remove Material in Modal
  const handleRemoveMaterial = (matName: string) => {
    setCurrentMaterials((prev) => prev.filter((m) => m !== matName));
  };

  // Save Material updates
  const handleSaveMaterials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAreaForMaterial) return;

    updateArea(activeAreaForMaterial.id, {
      materials: currentMaterials,
      materialNotes: materialNotesInput.trim(),
    });

    showToast(`Material untuk "${activeAreaForMaterial.name}" berhasil diperbarui!`);
    setShowMaterialModal(false);
  };

  // Open Edit Area Modal
  const handleOpenEditModal = (area: Area) => {
    setActiveAreaForEdit(area);
    setEditName(area.name);
    setEditFloor(area.floor);
    setEditZone(area.zone || '');
    setEditType(area.type);
    setEditCode(area.code);
    setEditDescription(area.description || '');
    setShowEditModal(true);
  };

  // Save Edit Area
  const handleSaveEditArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAreaForEdit || !editName.trim()) return;

    updateArea(activeAreaForEdit.id, {
      name: editName.trim(),
      floor: editFloor.trim(),
      zone: editZone.trim(),
      type: editType,
      code: editCode.trim(),
      description: editDescription.trim(),
    });

    showToast(`Informasi area "${editName}" berhasil diperbarui.`);
    setShowEditModal(false);
  };

  // Handle Delete Area
  const handleDeleteAreaConfirm = (area: Area) => {
    deleteArea(area.id);
    showToast(`Lokasi kerja "${area.name}" (${area.floor}) telah berhasil dihapus.`);
  };

  // Handle Add Area Form Submit
  const handleCreateArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) {
      alert('Mohon masukkan Nama Lokasi Kerja');
      return;
    }

    const finalFloor = isCustomFloor ? customFloorInput.trim() : newAreaFloor.trim();
    if (!finalFloor) {
      alert('Mohon tentukan Lantai untuk lokasi ini');
      return;
    }

    // Combine picked materials and manual comma-separated text
    const extraMats = newAreaMaterialText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const mergedMaterials = Array.from(new Set([...newAreaMaterials, ...extraMats]));

    // Auto code if not set
    const finalCode =
      newAreaCode.trim() ||
      `${finalFloor.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${newAreaName.slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;

    const assignedCleaner = cleaners.find((c) => c.id === newAreaCleanerId);

    addArea({
      name: newAreaName.trim(),
      code: finalCode,
      building: activeProject?.name || 'Gedung Operasional Utama',
      floor: finalFloor,
      zone: newAreaZone.trim() || 'Zona Umum',
      type: newAreaType,
      status: 'clean',
      cleanerId: newAreaCleanerId,
      cleanerName: assignedCleaner?.name || 'Petugas Standby',
      targetDurationMinutes: 30,
      materials: mergedMaterials,
      description: newAreaDescription.trim(),
    });

    showToast(`Lokasi kerja baru "${newAreaName}" berhasil ditambahkan ke ${finalFloor}!`);

    // Reset Form
    setNewAreaName('');
    setNewAreaCode('');
    setNewAreaMaterials([]);
    setNewAreaMaterialText('');
    setNewAreaDescription('');
    setShowAddModal(false);
  };

  // Render location type badge & icon
  const renderTypeIcon = (type: Area['type']) => {
    switch (type) {
      case 'escalator':
        return <ArrowUpDown className="w-4 h-4 text-amber-600" />;
      case 'lift':
        return <Building2 className="w-4 h-4 text-indigo-600" />;
      case 'lobby':
        return <DoorOpen className="w-4 h-4 text-emerald-600" />;
      case 'toilet':
        return <Sparkles className="w-4 h-4 text-cyan-600" />;
      case 'corridor':
        return <Footprints className="w-4 h-4 text-slate-600" />;
      case 'atrium':
        return <Maximize2 className="w-4 h-4 text-purple-600" />;
      default:
        return <MapPin className="w-4 h-4 text-sky-600" />;
    }
  };

  const getTypeNameLabel = (type: Area['type']) => {
    switch (type) {
      case 'escalator':
        return 'Eskalator';
      case 'lift':
        return 'Lift / Elevator';
      case 'lobby':
        return 'Lobby';
      case 'toilet':
        return 'Toilet';
      case 'corridor':
        return 'Koridor';
      case 'atrium':
        return 'Area Tengah / Atrium';
      case 'office':
        return 'Ruang Kantor';
      case 'pantry':
        return 'Pantry';
      case 'outdoor':
        return 'Outdoor / Parkir';
      default:
        return 'Area Kerja';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              Master Data Lokasi Kerja
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {activeProject?.name || 'Gedung Operasional Utama'}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Pemetaan Lokasi Kerja & Material Cleaning
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Rincian lokasi kerja per lantai (misalnya Lantai GF yang terdiri dari Lobby Utama, Koridor, Toilet Pria/Wanita, Area Tengah, Eskalator, dan Lift), lengkap dengan inventarisasi material permukaan untuk penentuan standar chemical & alat kerja.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              // Pre-select floor if filtered
              if (selectedFloor !== 'all') {
                setNewAreaFloor(selectedFloor);
              } else {
                setNewAreaFloor('Lantai GF');
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Lokasi / Area</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500">Total Lokasi Kerja</p>
            <MapPin className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalLocations}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Titik Area Terdaftar</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500">Total Lantai / Level</p>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.floorCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Hierarki Gedung Aktif</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500">Material Terdata</p>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">{stats.totalMaterialCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Spesifikasi Permukaan</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500">Rata-rata Material</p>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.avgMaterial}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Jenis Bahan / Lokasi</p>
        </div>
      </div>

      {/* Filter, Search, and Floor Selector Tabs */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3.5">
        {/* Search & Type Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari lokasi kerja (misal: Lobby utama, Eskalator, Lift, Toilet) atau nama material (trap besi, stainless, granit)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 w-full sm:w-auto"
            >
              <option value="all">Semua Tipe Lokasi</option>
              <option value="lobby">Lobby</option>
              <option value="corridor">Koridor</option>
              <option value="toilet">Toilet</option>
              <option value="escalator">Eskalator</option>
              <option value="lift">Lift / Elevator</option>
              <option value="atrium">Area Tengah / Atrium</option>
              <option value="office">Ruang Kantor</option>
              <option value="pantry">Pantry</option>
              <option value="outdoor">Outdoor / Parkir</option>
            </select>
          </div>
        </div>

        {/* Floor Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-3">
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            Pilih Lantai:
          </span>

          <button
            type="button"
            onClick={() => setSelectedFloor('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedFloor === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Lantai ({areas.length})
          </button>

          {existingFloors.map((floor) => {
            const countInFloor = areas.filter((a) => a.floor === floor).length;
            const isGF = floor.toLowerCase().includes('gf');
            return (
              <button
                key={floor}
                type="button"
                onClick={() => setSelectedFloor(floor)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedFloor === floor
                    ? 'bg-sky-600 text-white shadow-xs'
                    : isGF
                    ? 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{floor}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedFloor === floor
                      ? 'bg-sky-800 text-white'
                      : isGF
                      ? 'bg-sky-200 text-sky-900'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {countInFloor}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Grouped by Floor */}
      {Object.keys(areasByFloor).length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak ada lokasi kerja yang sesuai</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Coba sesuaikan kata kunci pencarian atau ganti filter lantai. Anda juga dapat menambahkan lokasi kerja baru ke lantai ini.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedFloor('all');
              setSelectedType('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(areasByFloor) as [string, Area[]][]).map(([floorName, floorAreas]) => {
            const isGF = floorName.toLowerCase().includes('gf');
            return (
              <div
                key={floorName}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                {/* Floor Header Bar */}
                <div
                  className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                    isGF
                      ? 'bg-linear-to-r from-sky-50 via-white to-slate-50 border-sky-100'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isGF ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-800 text-white'
                      }`}
                    >
                      {isGF ? 'GF' : floorName.replace(/[^0-9]/g, '') || 'FL'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900">{floorName}</h3>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-700">
                          {floorAreas.length} Lokasi Kerja
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isGF
                          ? 'Ground Floor / Lantai Utama: Lobby utama, Koridor, Toilet, Area Tengah, Eskalator, dan Lift'
                          : `Daftar titik lokasi kerja dan spesifikasi material di ${floorName}`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewAreaFloor(floorName);
                      setIsCustomFloor(false);
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:border-sky-500 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 text-xs font-semibold transition-all self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Lokasi di {floorName}</span>
                  </button>
                </div>

                {/* Locations Grid */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {floorAreas.map((area, idx) => {
                    const materialList = area.materials || [];
                    return (
                      <div
                        key={area.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-sky-300 hover:shadow-md transition-all p-4 flex flex-col justify-between"
                      >
                        <div>
                          {/* Top row: Type Icon, Code, and Edit Menu */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                                {renderTypeIcon(area.type)}
                              </div>
                              <div>
                                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {area.code}
                                </span>
                                <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                                  #{idx + 1}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(area)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                title="Edit info lokasi"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAreaConfirm(area)}
                                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Hapus lokasi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Area Name & Category */}
                          <div className="mt-2.5">
                            <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                              {area.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                              <span>{getTypeNameLabel(area.type)}</span>
                              <span>•</span>
                              <span>{area.zone || 'Zona Umum'}</span>
                            </div>
                            {area.description && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 italic">
                                "{area.description}"
                              </p>
                            )}
                          </div>

                          {/* Material Section */}
                          <div className="mt-3.5 pt-3 border-t border-slate-200/80">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5 text-sky-600" />
                                Material yang Digunakan:
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {materialList.length} Material
                              </span>
                            </div>

                            {materialList.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {materialList.map((mat, mIdx) => (
                                  <span
                                    key={mIdx}
                                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-white border border-slate-200/90 text-slate-700 shadow-2xs flex items-center gap-1"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                    {mat}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Belum ada material. Klik tombol di bawah untuk mengisi.</span>
                              </div>
                            )}

                            {area.materialNotes && (
                              <div className="mt-2 p-2 rounded-lg bg-sky-50/60 border border-sky-100 text-[10px] text-sky-900">
                                <span className="font-bold">Instruksi Perawatan:</span> {area.materialNotes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Update Material Action */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleOpenMaterialModal(area)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold transition-colors shadow-2xs"
                          >
                            <Wrench className="w-3.5 h-3.5 text-sky-600" />
                            <span>Update Material yang Digunakan</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: UPDATE MATERIAL YANG DIGUNAKAN */}
      {showMaterialModal && activeAreaForMaterial && (
        <div
          id="area-material-modal-backdrop"
          onClick={() => setShowMaterialModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="area-material-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-xl w-full max-h-[92dvh] overflow-y-auto border border-slate-200 shadow-2xl overscroll-contain my-auto"
          >
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                    Update Material — {activeAreaForMaterial.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {activeAreaForMaterial.floor} • {activeAreaForMaterial.zone || 'Zona Umum'} ({activeAreaForMaterial.code})
                  </p>
                </div>
              </div>

              <button
                id="close-material-modal-btn"
                type="button"
                onClick={() => setShowMaterialModal(false)}
                aria-label="Tutup Jendela Material"
                className="text-slate-400 hover:text-slate-700 active:text-slate-900 p-2 rounded-full hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterials} className="mt-4 space-y-4 text-xs">
              {/* Context Explanation */}
              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-sky-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p>
                  Tentukan jenis material dan permukaan pada <strong>{activeAreaForMaterial.name}</strong> (misal eskalator: trap besi, bordes stainless, karet railing, kaca) untuk panduan pemilihan alat cleaning & chemical SOP.
                </p>
              </div>

              {/* Current Active Materials */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Daftar Material Terpasang Saat Ini ({currentMaterials.length}):
                </label>
                {currentMaterials.length === 0 ? (
                  <div className="p-3 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    Belum ada material yang terdaftar. Tambahkan material di bawah ini.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    {currentMaterials.map((mat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs"
                      >
                        <span>{mat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterial(mat)}
                          className="w-4 h-4 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title={`Hapus ${mat}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Material Input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Tambah Material Baru Secara Manual:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: trap besi, bordes stainless, karet railing, kaca..."
                    value={newMaterialInput}
                    onChange={(e) => setNewMaterialInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMaterialToCurrent(newMaterialInput);
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddMaterialToCurrent(newMaterialInput)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 cursor-pointer min-h-[44px]"
                  >
                    + Tambah
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Tekan tombol Enter atau klik "+ Tambah" untuk memasukkan material.
                </p>
              </div>

              {/* Quick Suggestion Chips categorized */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Pilihan Cepat Material Populer (Klik untuk menambahkan):
                </label>

                <div className="space-y-2.5 max-h-48 overflow-y-auto p-2 bg-slate-50/70 rounded-2xl border border-slate-200">
                  {POPULAR_MATERIALS_BY_CATEGORY.map((cat, cIdx) => (
                    <div key={cIdx}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        {cat.category}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.map((item, iIdx) => {
                          const isAlreadyAdded = currentMaterials.some(
                            (m) => m.toLowerCase() === item.toLowerCase()
                          );
                          return (
                            <button
                              key={iIdx}
                              type="button"
                              onClick={() => {
                                if (isAlreadyAdded) {
                                  handleRemoveMaterial(item);
                                } else {
                                  handleAddMaterialToCurrent(item);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer min-h-[32px] ${
                                isAlreadyAdded
                                  ? 'bg-sky-600 text-white font-bold shadow-2xs'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-sky-400 hover:bg-sky-50'
                              }`}
                            >
                              {isAlreadyAdded ? `✓ ${item}` : `+ ${item}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes for Materials */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Catatan / Instruksi Khusus Perawatan Material (Opsional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Polishing bordes stainless steel dengan metal polish; Karet railing jangan menggunakan chemical beralkohol keras; Trap besi vakum sela-selanya."
                  value={materialNotesInput}
                  onChange={(e) => setMaterialNotesInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  id="cancel-material-modal-btn"
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-semibold text-xs min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  Simpan Perubahan Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH AREA / LOKASI KERJA BARU SECARA MANUAL */}
      {showAddModal && (
        <div
          id="add-area-modal-backdrop"
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="add-area-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-lg w-full max-h-[92dvh] overflow-y-auto border border-slate-200 shadow-2xl overscroll-contain my-auto"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                    Tambah Lokasi Kerja Baru
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Masukkan detail lokasi kerja dan material permukaan
                  </p>
                </div>
              </div>
              <button
                id="close-add-area-modal-btn"
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Tutup Jendela Tambah Lokasi"
                className="text-slate-400 hover:text-slate-700 active:text-slate-900 p-2 rounded-full hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateArea} className="mt-4 space-y-3.5 text-xs">
              {/* Area Name */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Nama Lokasi Kerja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: Lobby utama, Eskalator A, Lift Service, Toilet Pria, dsb."
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
                  required
                />
              </div>

              {/* Floor Selection (Existing or Custom) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-800">
                      Lantai / Level <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomFloor(!isCustomFloor)}
                      className="text-[10px] text-sky-600 hover:underline font-semibold cursor-pointer"
                    >
                      {isCustomFloor ? 'Pilih dari List' : '+ Ketik Baru'}
                    </button>
                  </div>

                  {isCustomFloor ? (
                    <input
                      type="text"
                      placeholder="Misal: Lantai GF, Lantai 5, Basement B2"
                      value={customFloorInput}
                      onChange={(e) => setCustomFloorInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      required
                    />
                  ) : (
                    <select
                      value={newAreaFloor}
                      onChange={(e) => setNewAreaFloor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-medium"
                    >
                      <option value="Lantai GF">Lantai GF (Ground Floor)</option>
                      {existingFloors
                        .filter((f) => f !== 'Lantai GF')
                        .map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      <option value="Lantai 1">Lantai 1</option>
                      <option value="Lantai 2">Lantai 2</option>
                      <option value="Lantai 3">Lantai 3</option>
                      <option value="Lantai LG">Lantai LG</option>
                      <option value="Basement B1">Basement B1</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Tipe / Kategori Lokasi
                  </label>
                  <select
                    value={newAreaType}
                    onChange={(e) => setNewAreaType(e.target.value as Area['type'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-medium"
                  >
                    <option value="lobby">Lobby Utama / Entitas</option>
                    <option value="corridor">Koridor</option>
                    <option value="toilet">Toilet</option>
                    <option value="escalator">Eskalator</option>
                    <option value="lift">Lift / Elevator</option>
                    <option value="atrium">Area Tengah / Atrium</option>
                    <option value="office">Ruang Kantor</option>
                    <option value="pantry">Pantry / Kantin</option>
                    <option value="outdoor">Outdoor / Parkir</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Zone and Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Zona / Sub-Area</label>
                  <input
                    type="text"
                    placeholder="Misal: Zona A, Sirkulasi Vertikal"
                    value={newAreaZone}
                    onChange={(e) => setNewAreaZone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Kode Area (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto generated jika kosong"
                    value={newAreaCode}
                    onChange={(e) => setNewAreaCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase"
                  />
                </div>
              </div>

              {/* Initial Materials */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Material yang Digunakan (Dapat diisi sekarang atau diupdate nanti):
                </label>
                <input
                  type="text"
                  placeholder="Ketik material dipisah koma (misal: trap besi, bordes stainless, karet railing, kaca)"
                  value={newAreaMaterialText}
                  onChange={(e) => setNewAreaMaterialText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Contoh untuk Eskalator: <em>trap besi, bordes stainless, karet railing, kaca</em>
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Keterangan / Spesifikasi Lokasi (Opsional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Eskalator penghubung Lantai GF ke Lantai 1 sisi utara."
                  value={newAreaDescription}
                  onChange={(e) => setNewAreaDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              {/* Assigned Cleaner */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Petugas Penanggung Jawab
                </label>
                <select
                  value={newAreaCleanerId}
                  onChange={(e) => setNewAreaCleanerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800"
                >
                  {cleaners.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.shiftName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  id="cancel-add-area-modal-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-semibold text-xs min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  Simpan Lokasi Kerja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT AREA INFO */}
      {showEditModal && activeAreaForEdit && (
        <div
          id="edit-area-modal-backdrop"
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="edit-area-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-md w-full max-h-[92dvh] overflow-y-auto border border-slate-200 shadow-2xl overscroll-contain my-auto"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                Edit Lokasi Kerja — {activeAreaForEdit.name}
              </h3>
              <button
                id="close-edit-area-modal-btn"
                type="button"
                onClick={() => setShowEditModal(false)}
                aria-label="Tutup Edit Lokasi"
                className="text-slate-400 hover:text-slate-700 active:text-slate-900 p-2 rounded-full hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditArea} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Nama Lokasi Kerja</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Lantai</label>
                  <input
                    type="text"
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Tipe</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as Area['type'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="lobby">Lobby</option>
                    <option value="corridor">Koridor</option>
                    <option value="toilet">Toilet</option>
                    <option value="escalator">Eskalator</option>
                    <option value="lift">Lift</option>
                    <option value="atrium">Area Tengah / Atrium</option>
                    <option value="office">Ruang Kantor</option>
                    <option value="pantry">Pantry</option>
                    <option value="outdoor">Outdoor / Parkir</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Zona</label>
                  <input
                    type="text"
                    value={editZone}
                    onChange={(e) => setEditZone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Kode Area</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Keterangan Lokasi</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  id="cancel-edit-area-modal-btn"
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-semibold text-xs min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
