export interface EventWarningSettings {
  isEnabled: boolean;
  title: string;
  message: string;
}

export interface GuideNotesSettings {
  isEnabled: boolean;
  title: string;
  notes: string;
}

export interface EventConfigurationSettings {
  eventName: string;
  activeWeek: string;
  difficultyLevel: string;
  allianceNotes: string;
}
