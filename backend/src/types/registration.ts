export type TroopType = "infantry" | "lancer" | "marksman";

export interface TroopLoadoutEntry {
  type: TroopType;
  tier: number;
  count: number;
}

export interface RegistrationRecord {
  id: string;
  nickname: string;
  partnerName: string;
  troopCount: number;
  troopLevel: number;
  troopLoadout: TroopLoadoutEntry[];
  comment: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationInput {
  nickname: string;
  partnerName: string;
  troopLoadout: TroopLoadoutEntry[];
  comment: string | null;
  isAvailable: boolean;
}

export interface RegistrationFilters {
  search?: string;
  partner?: string;
  available?: boolean;
}

export interface RegistrationStats {
  totalParticipants: number;
  availableParticipants: number;
  totalTroops: number;
  availableTroops: number;
  averageTroopLevel: number;
  topPartners: Array<{
    partnerName: string;
    count: number;
    totalTroops: number;
    availableTroops: number;
  }>;
}
