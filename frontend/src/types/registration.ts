export type TroopType = "infantry" | "lancer" | "marksman";

export interface TroopLoadoutEntry {
  type: TroopType;
  tier: number;
  count: number;
}

export interface Registration {
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

export interface RegistrationPayload {
  nickname: string;
  partnerNames: string[];
  troopLoadout: TroopLoadoutEntry[];
  personalScore?: number | null;
  comment?: string;
  isAvailable: boolean;
}

export interface RegistrationFilters {
  search: string;
  partner: string;
  available: "all" | "true" | "false";
}

export interface StatsResponse {
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

export interface ManualArchiveStat {
  label: string;
  value: number;
}

export interface WeeklyArchiveSummary {
  id: string;
  archivedAt: string;
  registrationCount: number;
  totalTroops: number;
  availableParticipants: number;
  allianceScore: number | null;
  difficultyLevel: string | null;
  difficultyNote: string | null;
  eventLog: string | null;
  manualStats: ManualArchiveStat[];
}

export interface PersonalScoreTrend {
  nickname: string;
  currentScore: number;
  previousScore: number;
  scoreDelta: number;
  currentArchivedAt: string;
  previousArchivedAt: string;
}
