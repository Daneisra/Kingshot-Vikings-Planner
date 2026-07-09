export type FormationEventKey = "bear-trap" | "vikings" | "battle";

export interface FormationTroopCounts {
  infantry: number;
  lancer: number;
  marksman: number;
}

export interface FormationSlot {
  id: string;
  name: string;
  hero: string;
  infantry: number;
  lancer: number;
  marksman: number;
  notes: string;
  sortOrder: number;
}

export interface FormationPreset {
  eventKey: FormationEventKey;
  eventName: string;
  availableTroops: FormationTroopCounts;
  slots: FormationSlot[];
  updatedAt: string;
}

export interface FormationPresetSummary {
  eventKey: FormationEventKey;
  eventName: string;
  slotCount: number;
  updatedAt: string;
}
