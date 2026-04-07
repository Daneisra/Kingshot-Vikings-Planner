export interface RegistrationRecord {
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

export interface RegistrationInput {
  nickname: string;
  partnerName: string;
  troopCount: number;
  troopLevel: number;
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
  totalTroops: number;
  averageTroopLevel: number;
  topPartners: Array<{
    partnerName: string;
    count: number;
  }>;
}

