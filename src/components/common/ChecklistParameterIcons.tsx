import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Bau-bauan (Aroma / Scent / Nose with smell waves)
export const BauBauanIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="Bau-bauan"
  >
    {/* Head profile */}
    <path d="M12 2C8.5 2 6 4.5 6 8c0 1.5.5 3 1.2 4.1L6 14.5c-.3.4-.2 1 .2 1.3.4.3 1 .2 1.3-.2l1.2-1.6c1 .6 2.1 1 3.3 1 3.5 0 6-2.5 6-6 0-3.5-2.5-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
    {/* Smell aroma waves */}
    <path
      d="M17 6c1 .7 1.8 1.8 1.8 3.2s-.8 2.5-1.8 3.2M19.5 4.5C21 5.8 22 7.8 22 10s-1 4.2-2.5 5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

// 2. Lantai (Floor tiles isometric/grid pattern)
export const LantaiIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="Lantai"
  >
    {/* 4 tile blocks */}
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </svg>
);

// 3. Dinding (Brick wall texture)
export const DindingIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Dinding"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="3" y1="9.5" x2="21" y2="9.5" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="4" x2="9" y2="9.5" />
    <line x1="15" y1="4" x2="15" y2="9.5" />
    <line x1="6" y1="9.5" x2="6" y2="15" />
    <line x1="12" y1="9.5" x2="12" y2="15" />
    <line x1="18" y1="9.5" x2="18" y2="15" />
    <line x1="9" y1="15" x2="9" y2="20" />
    <line x1="15" y1="15" x2="15" y2="20" />
  </svg>
);

// 4. Kotak Sampah (Trash bin with stripes)
export const KotakSampahIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="Kotak Sampah"
  >
    <path d="M6 8l1.2 11.5c.1 1.2 1.1 2.5 2.3 2.5h5c1.2 0 2.2-1.3 2.3-2.5L18 8H6zm4 10H8.5l-.8-8h2.3v8zm3 0h-1.8V10h1.8v8zm3 0h-1.5V10h2.3l-.8 8z" />
    <path d="M19 5h-4V3.5C15 2.7 14.3 2 13.5 2h-3C9.7 2 9 2.7 9 3.5V5H5c-.6 0-1 .4-1 1s.4 1 1 1h14c.6 0 1-.4 1-1s-.4-1-1-1zM10.5 3.5h3V5h-3v-1.5z" />
  </svg>
);

// 5. Kaca (Mirror with reflection lines)
export const KacaIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Kaca"
  >
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <line x1="7" y1="17" x2="13" y2="11" />
    <line x1="11" y1="17" x2="17" y2="11" />
    <line x1="14" y1="9" x2="17" y2="6" />
  </svg>
);

// 6. Wastafel (Faucet with water dropping into sink)
export const WastafelIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Wastafel"
  >
    {/* Faucet */}
    <path d="M6 13V8a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v2" />
    <line x1="14" y1="10" x2="16" y2="10" />
    {/* Water drops */}
    <line x1="15" y1="12" x2="15" y2="13" strokeDasharray="1 1" />
    {/* Sink basin */}
    <path d="M4 14h16c-.5 4.5-4 7-8 7s-7.5-2.5-8-7z" fill="currentColor" fillOpacity="0.15" />
    <line x1="2" y1="14" x2="22" y2="14" />
  </svg>
);

// 7. Sabun Cuci Tangan (Soap dispenser bottle)
export const SabunCuciTanganIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Sabun Cuci Tangan"
  >
    {/* Pump top */}
    <path d="M12 7V3" />
    <path d="M9 3h6" />
    <path d="M9 3c-1.5 0-2 .8-2 1.8V7" />
    {/* Bottle body */}
    <rect x="6" y="7" width="12" height="14" rx="3" fill="currentColor" fillOpacity="0.1" />
    {/* Soap bubble / droplet */}
    <circle cx="12" cy="14" r="2" fill="currentColor" />
  </svg>
);

// 8. Kloset (Toilet Commode)
export const KlosetIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Kloset"
  >
    {/* Tank */}
    <rect x="5" y="3" width="6" height="10" rx="1" fill="currentColor" fillOpacity="0.15" />
    {/* Bowl & Seat */}
    <path d="M11 9h8c1.5 0 2.5 1.5 2 3l-1.5 3.5c-.8 2-2.7 3.5-5 3.5h-3.5" />
    {/* Pedestal Base */}
    <path d="M11 15v5h6v-2" />
  </svg>
);

// 9. Tisu (Toilet Paper Roll)
export const TisuIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Tisu"
  >
    {/* Cylinder top */}
    <ellipse cx="12" cy="7" rx="6" ry="3" fill="currentColor" fillOpacity="0.2" />
    {/* Center hole */}
    <ellipse cx="12" cy="7" rx="2" ry="1" fill="currentColor" />
    {/* Roll body */}
    <path d="M6 7v8c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
    {/* Hanging paper sheet */}
    <path d="M18 10v9c0 1-1 2-2 2h-4" />
  </svg>
);

// 10. Urinoir (Urinal)
export const UrinoirIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Urinoir"
  >
    {/* Flush pipe */}
    <line x1="12" y1="2" x2="12" y2="6" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    {/* Urinal bowl */}
    <path
      d="M7 6h10v6c0 4.4-2.5 9-5 9s-5-4.6-5-9V6z"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <path d="M9 10c0 2 1.3 4 3 4s3-2 3-4" />
  </svg>
);

// 11. Hand Drier (Hand dryer blowing hot air waves)
export const HandDrierIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-label="Hand Drier"
  >
    {/* Dryer unit casing */}
    <path
      d="M6 4h12c1.1 0 2 .9 2 2v5c0 1.5-1 2.5-2.5 3H6.5C5 14 4 13 4 11V6c0-1.1.9-2 2-2z"
      fill="currentColor"
      fillOpacity="0.15"
    />
    {/* Air outlet nozzle */}
    <path d="M9 14v1.5h6V14" />
    {/* Air waves blowing downwards */}
    <path d="M10 18v3" strokeDasharray="1.5 1.5" />
    <path d="M12 17v4" strokeDasharray="1.5 1.5" />
    <path d="M14 18v3" strokeDasharray="1.5 1.5" />
  </svg>
);

// Icon selector helper based on column name
export const renderParameterIcon = (name: string, size = 20, className = 'text-sky-700'): React.ReactNode => {
  const n = name.toLowerCase();

  if (n.includes('bau') || n.includes('aroma') || n.includes('udara')) {
    return <BauBauanIcon size={size} className={className} />;
  }
  if (n.includes('lantai') || n.includes('keramik') || n.includes('floor')) {
    return <LantaiIcon size={size} className={className} />;
  }
  if (n.includes('dinding') || n.includes('tembok') || n.includes('wall') || n.includes('partisi')) {
    return <DindingIcon size={size} className={className} />;
  }
  if (n.includes('sampah') || n.includes('trash') || n.includes('kotak')) {
    return <KotakSampahIcon size={size} className={className} />;
  }
  if (n.includes('kaca') || n.includes('cermin') || n.includes('mirror') || n.includes('jendela')) {
    return <KacaIcon size={size} className={className} />;
  }
  if (n.includes('wastafel') || n.includes('sink') || n.includes('kran') || n.includes('keran')) {
    return <WastafelIcon size={size} className={className} />;
  }
  if (n.includes('sabun') || n.includes('soap') || n.includes('hand soap')) {
    return <SabunCuciTanganIcon size={size} className={className} />;
  }
  if (n.includes('kloset') || n.includes('closet') || n.includes('toilet') || n.includes('wc')) {
    return <KlosetIcon size={size} className={className} />;
  }
  if (n.includes('tisu') || n.includes('tissue') || n.includes('towel')) {
    return <TisuIcon size={size} className={className} />;
  }
  if (n.includes('urinoir') || n.includes('urinal')) {
    return <UrinoirIcon size={size} className={className} />;
  }
  if (n.includes('drier') || n.includes('dryer') || n.includes('pengering')) {
    return <HandDrierIcon size={size} className={className} />;
  }

  // Fallback generic icon
  return (
    <div className={`flex items-center justify-center font-bold text-[10px] w-5 h-5 rounded-md bg-sky-100 ${className}`}>
      ✓
    </div>
  );
};
