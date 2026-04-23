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
  partnerNames: string[];
  troopCount: number;
  troopLevel: number;
  troopLoadout: TroopLoadoutEntry[];
  personalScore: number | null;
  comment: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationInput {
  nickname: string;
  partnerNames: string[];
  troopLoadout: TroopLoadoutEntry[];
  personalScore: number | null;
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

export interface WeeklyArchiveSummary {
  id: string;
  archivedAt: string;
  registrationCount: number;
  totalTroops: number;
  availableParticipants: number;
}

export interface WeeklyArchiveDetail extends WeeklyArchiveSummary {
  registrations: RegistrationRecord[];
}
