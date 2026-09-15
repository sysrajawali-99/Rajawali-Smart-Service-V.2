import { HourlyCheckItemEntry, HourlyCheckItemStatus, ChecklistLocationCategory, ChecklistTemplateItem } from '../types';
import { toBKRCode } from './pdfExport';

export interface StandardToiletParameter {
  id: string;
  key: string;
  name: string;
  aliases: string[];
}

export const STANDARD_TOILET_PARAMETERS: StandardToiletParameter[] = [
  { id: 'tpl-tlt-1', key: 'bau', name: 'Bau-bauan', aliases: ['bau', 'bau-bauan', 'aroma', 'pengharum'] },
  { id: 'tpl-tlt-2', key: 'lantai', name: 'Lantai', aliases: ['lantai', 'floor', 'keramik lantai'] },
  { id: 'tpl-tlt-3', key: 'dinding', name: 'Dinding', aliases: ['dinding', 'wall', 'partisi', 'kubikal'] },
  { id: 'tpl-tlt-4', key: 'sampah', name: 'Kotak Sampah', aliases: ['kotak sampah', 'tempat sampah', 'sampah', 'trash'] },
  { id: 'tpl-tlt-5', key: 'kaca', name: 'Kaca', aliases: ['kaca', 'cermin', 'mirror', 'kaca wastafel'] },
  { id: 'tpl-tlt-6', key: 'wastafel', name: 'Wastafel', aliases: ['wastafel', 'sink', 'wastafel & keran', 'keran'] },
  { id: 'tpl-tlt-7', key: 'sabun', name: 'Sabun Cuci Tangan', aliases: ['sabun', 'sabun cuci tangan', 'hand soap', 'soap'] },
  { id: 'tpl-tlt-8', key: 'kloset', name: 'Kloset', aliases: ['kloset', 'closet', 'kloset duduk/jongkok', 'toilet bowl'] },
  { id: 'tpl-tlt-9', key: 'tisu', name: 'Tisu', aliases: ['tisu', 'tissue', 'hand towel', 'tisu toilet'] },
  { id: 'tpl-tlt-10', key: 'urinoir', name: 'Urinoir', aliases: ['urinoir', 'urinal', 'urinal pria'] },
  { id: 'tpl-tlt-11', key: 'drier', name: 'Hand Drier', aliases: ['hand drier', 'hand dryer', 'drier', 'pengering', 'pengering tangan'] },
];

/**
 * Deterministically find an item inside slot.items matching a parameter or column key
 */
export function findMatchingSlotItem(
  items: HourlyCheckItemEntry[],
  identifier: string
): HourlyCheckItemEntry | undefined {
  if (!items || items.length === 0) return undefined;
  const idLower = identifier.trim().toLowerCase();

  // 1. Direct match by itemId
  const directIdMatch = items.find((it) => it.itemId.toLowerCase() === idLower);
  if (directIdMatch) return directIdMatch;

  // 2. Direct exact match by itemName
  const directNameMatch = items.find((it) => it.itemName.trim().toLowerCase() === idLower);
  if (directNameMatch) return directNameMatch;

  // 3. Find if identifier corresponds to a standard toilet parameter
  const stdParam = STANDARD_TOILET_PARAMETERS.find(
    (p) => p.key === idLower || p.id === idLower || p.name.toLowerCase() === idLower
  );

  if (stdParam) {
    // Match by standard param ID
    const byParamId = items.find((it) => it.itemId === stdParam.id);
    if (byParamId) return byParamId;

    // Match by standard param exact name
    const byParamName = items.find(
      (it) => it.itemName.trim().toLowerCase() === stdParam.name.toLowerCase()
    );
    if (byParamName) return byParamName;

    // Match by standard aliases
    for (const alias of stdParam.aliases) {
      const byAlias = items.find((it) => {
        const itNameLower = it.itemName.toLowerCase();
        return itNameLower === alias || itNameLower.startsWith(alias);
      });
      if (byAlias) return byAlias;
    }
  }

  // 4. Exact prefix match as fallback
  return items.find((it) => {
    const itName = it.itemName.trim().toLowerCase();
    return itName.startsWith(idLower) || idLower.startsWith(itName);
  });
}

/**
 * Cycle through checklist status:
 * '-' (not_checked) -> 'B' (clean) -> 'K' (dirty) -> 'R' (broken) -> '-' (not_checked)
 */
export function getNextChecklistStatus(currentStatus?: HourlyCheckItemStatus | string): HourlyCheckItemStatus {
  const code = toBKRCode(currentStatus);
  switch (code) {
    case 'B':
      return 'dirty'; // 'K'
    case 'K':
      return 'broken'; // 'R'
    case 'R':
      return 'not_checked'; // '-'
    case '-':
    default:
      return 'clean'; // 'B'
  }
}

/**
 * Ensure that a slot has all required items for its category without losing existing entries.
 */
export function ensureCompleteSlotItems(
  existingItems: HourlyCheckItemEntry[],
  category: ChecklistLocationCategory,
  templates: ChecklistTemplateItem[]
): HourlyCheckItemEntry[] {
  const current = [...(existingItems || [])];

  if (category === 'toilet') {
    return STANDARD_TOILET_PARAMETERS.map((param) => {
      const matched = findMatchingSlotItem(current, param.key);
      if (matched) {
        return {
          ...matched,
          itemId: param.id, // Normalize to standard id
          itemName: param.name, // Normalize to standard name
        };
      }
      return {
        itemId: param.id,
        itemName: param.name,
        status: 'not_checked' as HourlyCheckItemStatus,
      };
    });
  }

  // Non-toilet category: use category templates
  const categoryTemplates = templates.filter((t) => t.category === category);
  if (categoryTemplates.length === 0) return current;

  return categoryTemplates.map((tpl) => {
    const matched = current.find(
      (it) => it.itemId === tpl.id || it.itemName.toLowerCase() === tpl.name.toLowerCase()
    );
    if (matched) {
      return {
        ...matched,
        itemId: tpl.id,
        itemName: tpl.name,
      };
    }
    return {
      itemId: tpl.id,
      itemName: tpl.name,
      status: 'not_checked' as HourlyCheckItemStatus,
    };
  });
}
