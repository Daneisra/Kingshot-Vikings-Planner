export interface Registration {
  id: string;
  nickname: string;
  partnerName: string;
  troopCount: number;
  troopLevel: number;
  comment: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationPayload {
  nickname: string;
  partnerName: string;
  troopCount: number;
  troopLevel: number;
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
