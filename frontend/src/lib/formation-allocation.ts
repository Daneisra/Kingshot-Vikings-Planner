import type { FormationSlot, FormationTroopCounts } from "../types/formations";

export type TroopType = keyof FormationTroopCounts;
export type TroopTier = 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
export type TierInventory = Partial<Record<TroopTier, number>>;
export type FormationTierInventory = Record<TroopType, TierInventory>;

export interface TroopAllocationEntry {
  tier: TroopTier;
  count: number;
}

export type SlotTroopAllocation = Record<TroopType, TroopAllocationEntry[]>;
export type SlotShortage = Record<TroopType, number>;

export interface AllocationResult {
  slots: Record<string, SlotTroopAllocation>;
  shortages: Record<string, SlotShortage>;
  remainingByTier: FormationTierInventory;
}

const troopTypeKeys: TroopType[] = ["infantry", "lancer", "marksman"];

export const troopTiers: TroopTier[] = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6];

export function createEmptyTierInventory(): FormationTierInventory {
  return {
    infantry: {},
    lancer: {},
    marksman: {}
  };
}

export function cloneTierInventory(inventory: FormationTierInventory): FormationTierInventory {
  return troopTypeKeys.reduce((nextInventory, troopType) => {
    nextInventory[troopType] = {};

    for (const tier of troopTiers) {
      const count = normalizeCount(inventory[troopType]?.[tier] ?? 0);

      if (count > 0) {
        nextInventory[troopType][tier] = count;
      }
    }

    return nextInventory;
  }, {} as FormationTierInventory);
}

export function sumTierInventory(inventory: FormationTierInventory): FormationTroopCounts {
  return troopTypeKeys.reduce(
    (totals, troopType) => {
      totals[troopType] = troopTiers.reduce(
        (total, tier) => total + normalizeCount(inventory[troopType]?.[tier] ?? 0),
        0
      );
      return totals;
    },
    { infantry: 0, lancer: 0, marksman: 0 } as FormationTroopCounts
  );
}

export function allocateSlotsByTier(
  availableByTier: FormationTierInventory,
  slots: FormationSlot[]
): AllocationResult {
  const remainingByTier = cloneTierInventory(availableByTier);
  const slotAllocations: Record<string, SlotTroopAllocation> = {};
  const slotShortages: Record<string, SlotShortage> = {};

  for (const slot of slots) {
    const allocation = createEmptySlotAllocation();
    const shortage = createEmptySlotShortage();

    for (const troopType of troopTypeKeys) {
      let requestedCount = normalizeCount(slot[troopType]);

      for (const tier of troopTiers) {
        if (requestedCount <= 0) {
          break;
        }

        const availableCount = normalizeCount(remainingByTier[troopType][tier] ?? 0);
        const allocatedCount = Math.min(availableCount, requestedCount);

        if (allocatedCount > 0) {
          allocation[troopType].push({ tier, count: allocatedCount });
          const nextCount = availableCount - allocatedCount;

          if (nextCount > 0) {
            remainingByTier[troopType][tier] = nextCount;
          } else {
            delete remainingByTier[troopType][tier];
          }

          requestedCount -= allocatedCount;
        }
      }

      shortage[troopType] = requestedCount;
    }

    slotAllocations[slot.id] = allocation;
    slotShortages[slot.id] = shortage;
  }

  return {
    slots: slotAllocations,
    shortages: slotShortages,
    remainingByTier
  };
}

export function normalizeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function createEmptySlotAllocation(): SlotTroopAllocation {
  return troopTypeKeys.reduce((allocation, troopType) => {
    allocation[troopType] = [];
    return allocation;
  }, {} as SlotTroopAllocation);
}

function createEmptySlotShortage(): SlotShortage {
  return troopTypeKeys.reduce((shortage, troopType) => {
    shortage[troopType] = 0;
    return shortage;
  }, {} as SlotShortage);
}
