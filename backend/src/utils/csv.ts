import {
  PlayerProfileSummary,
  RegistrationFilters,
  RegistrationRecord,
  TroopLoadoutEntry,
  WeeklyArchiveSummary
} from "../types/registration";
import type { FormationPreset, FormationSlot } from "../types/formations";

function escapeCell(value: string | number | boolean | null) {
  const rawValue = value === null ? "" : String(value);

  if (/[",\n\r]/.test(rawValue)) {
    return `"${rawValue.replace(/"/g, "\"\"")}"`;
  }

  return rawValue;
}

interface BuildCsvOptions {
  filters: RegistrationFilters;
  exportedAt?: Date;
}

export function buildRegistrationsCsv(
  registrations: RegistrationRecord[],
  { filters, exportedAt = new Date() }: BuildCsvOptions
) {
  const totalParticipants = registrations.length;
  const availableParticipants = registrations.filter((registration) => registration.isAvailable).length;
  const totalTroops = registrations.reduce((sum, registration) => sum + registration.troopCount, 0);
  const availableTroops = registrations.reduce(
    (sum, registration) => sum + (registration.isAvailable ? registration.troopCount : 0),
    0
  );

  const summaryRows = [
    ["Kingshot Vikings Planner Export"],
    ["Exported At (UTC)", exportedAt.toISOString()],
    ["Applied Filters", formatFilters(filters)],
    ["Participants", totalParticipants],
    ["Available Participants", availableParticipants],
    ["Total Troops", totalTroops],
    ["Available Troops", availableTroops],
    [""]
  ];

  const header = [
    "Nickname",
    "Partners",
    "Primary Tier",
    "Primary Infantry",
    "Primary Lancer",
    "Primary Marksman",
    "Secondary Tier",
    "Secondary Infantry",
    "Secondary Lancer",
    "Secondary Marksman",
    "Troop Count",
    "Highest Troop Tier",
    "Personal Score",
    "Availability",
    "Comment",
    "Created At",
    "Updated At"
  ];

  const rows = registrations.map((registration) => {
    const tierGroups = groupTroopLoadoutByTier(registration.troopLoadout);
    const primaryGroup = tierGroups[0];
    const secondaryGroup = tierGroups[1];

    return [
      registration.nickname,
      registration.partnerNames.join(" | "),
      formatTierGroupTier(primaryGroup),
      primaryGroup?.counts.infantry ?? "",
      primaryGroup?.counts.lancer ?? "",
      primaryGroup?.counts.marksman ?? "",
      formatTierGroupTier(secondaryGroup),
      secondaryGroup?.counts.infantry ?? "",
      secondaryGroup?.counts.lancer ?? "",
      secondaryGroup?.counts.marksman ?? "",
      registration.troopCount,
      registration.troopLevel ? `T${registration.troopLevel}` : "",
      registration.personalScore ?? "",
      registration.isAvailable ? "Available" : "Unavailable",
      registration.comment,
      registration.createdAt,
      registration.updatedAt
    ];
  });

  return `\ufeff${[...summaryRows, header, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell ?? null)).join(","))
    .join("\r\n")}`;
}

export function buildArchiveSummaryCsv(archives: WeeklyArchiveSummary[], exportedAt = new Date()) {
  const rows = [
    ["Kingshot Vikings Archive Summary Export"],
    ["Exported At (UTC)", exportedAt.toISOString()],
    ["Archived Weeks", archives.length],
    [""],
    [
      "Archived At",
      "Players",
      "Available Players",
      "Total Troops",
      "Alliance Score",
      "Difficulty Level",
      "Difficulty Note",
      "Manual Stats"
    ],
    ...archives.map((archive) => [
      archive.archivedAt,
      archive.registrationCount,
      archive.availableParticipants,
      archive.totalTroops,
      archive.allianceScore ?? "",
      archive.difficultyLevel ?? "",
      archive.difficultyNote ?? "",
      archive.manualStats.map((stat) => `${stat.label}: ${stat.value}`).join(" | ")
    ])
  ];

  return formatCsvRows(rows);
}

export function buildPersonalScoresCsv(profiles: PlayerProfileSummary[], exportedAt = new Date()) {
  const rows = [
    ["Kingshot Vikings Personal Scores Export"],
    ["Exported At (UTC)", exportedAt.toISOString()],
    ["Players", profiles.length],
    [""],
    [
      "Nickname",
      "Participation Count",
      "Available Count",
      "Latest Archived At",
      "First Archived At",
      "Latest Score",
      "Previous Score",
      "Score Delta",
      "Best Score",
      "Average Score",
      "Latest Troop Count",
      "Latest Troop Tier",
      "Latest Partners"
    ],
    ...profiles.map((profile) => [
      profile.nickname,
      profile.participationCount,
      profile.availableCount,
      profile.latestArchivedAt,
      profile.firstArchivedAt,
      profile.latestScore ?? "",
      profile.previousScore ?? "",
      profile.scoreDelta ?? "",
      profile.bestScore ?? "",
      profile.averageScore ?? "",
      profile.latestTroopCount,
      profile.latestTroopLevel ? `T${profile.latestTroopLevel}` : "",
      profile.latestPartners.join(" | ")
    ])
  ];

  return formatCsvRows(rows);
}

export function buildEventNotesCsv(archives: WeeklyArchiveSummary[], exportedAt = new Date()) {
  const rows = [
    ["Kingshot Vikings Event Notes Export"],
    ["Exported At (UTC)", exportedAt.toISOString()],
    ["Archived Weeks", archives.length],
    [""],
    [
      "Archived At",
      "Alliance Score",
      "Difficulty Level",
      "Difficulty Note",
      "Event Log",
      "Manual Stats"
    ],
    ...archives.map((archive) => [
      archive.archivedAt,
      archive.allianceScore ?? "",
      archive.difficultyLevel ?? "",
      archive.difficultyNote ?? "",
      archive.eventLog ?? "",
      archive.manualStats.map((stat) => `${stat.label}: ${stat.value}`).join(" | ")
    ])
  ];

  return formatCsvRows(rows);
}

export function buildFormationPresetCsv(preset: FormationPreset, exportedAt = new Date()) {
  const assigned = sumFormationSlots(preset.slots);
  const remaining = {
    infantry: preset.availableTroops.infantry - assigned.infantry,
    lancer: preset.availableTroops.lancer - assigned.lancer,
    marksman: preset.availableTroops.marksman - assigned.marksman
  };
  const rows = [
    ["Kingshot Troop Formation Export"],
    ["Exported At (UTC)", exportedAt.toISOString()],
    ["Event", preset.eventName],
    [""],
    ["Available", preset.availableTroops.infantry, preset.availableTroops.lancer, preset.availableTroops.marksman],
    ["Assigned", assigned.infantry, assigned.lancer, assigned.marksman],
    ["Remaining", remaining.infantry, remaining.lancer, remaining.marksman],
    [""],
    [
      "Name",
      "Hero",
      "Infantry",
      "Lancer",
      "Marksman",
      "Total",
      "Infantry Ratio",
      "Lancer Ratio",
      "Marksman Ratio",
      "Notes"
    ],
    ...preset.slots.map((slot) => {
      const total = slot.infantry + slot.lancer + slot.marksman;

      return [
        slot.name,
        slot.hero,
        slot.infantry,
        slot.lancer,
        slot.marksman,
        total,
        formatRatio(slot.infantry, total),
        formatRatio(slot.lancer, total),
        formatRatio(slot.marksman, total),
        slot.notes
      ];
    }),
    [
      "Remainder",
      "No hero",
      remaining.infantry,
      remaining.lancer,
      remaining.marksman,
      remaining.infantry + remaining.lancer + remaining.marksman,
      "",
      "",
      "",
      "Calculated automatically"
    ]
  ];

  return formatCsvRows(rows);
}

function formatCsvRows(rows: Array<Array<string | number | boolean | null>>) {
  return `\ufeff${rows.map((row) => row.map((cell) => escapeCell(cell ?? null)).join(",")).join("\r\n")}`;
}

function sumFormationSlots(slots: FormationSlot[]) {
  return slots.reduce(
    (totals, slot) => ({
      infantry: totals.infantry + slot.infantry,
      lancer: totals.lancer + slot.lancer,
      marksman: totals.marksman + slot.marksman
    }),
    {
      infantry: 0,
      lancer: 0,
      marksman: 0
    }
  );
}

function formatRatio(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function formatFilters(filters: RegistrationFilters) {
  const appliedFilters: string[] = [];

  if (filters.search?.trim()) {
    appliedFilters.push(`search=${filters.search.trim()}`);
  }

  if (filters.partner?.trim()) {
    appliedFilters.push(`partner=${filters.partner.trim()}`);
  }

  if (typeof filters.available === "boolean") {
    appliedFilters.push(`availability=${filters.available ? "available" : "unavailable"}`);
  }

  return appliedFilters.length > 0 ? appliedFilters.join("; ") : "none";
}

function groupTroopLoadoutByTier(troopLoadout: TroopLoadoutEntry[]) {
  const grouped = new Map<number, { infantry: number; lancer: number; marksman: number }>();

  for (const entry of troopLoadout) {
    const currentGroup = grouped.get(entry.tier) ?? { infantry: 0, lancer: 0, marksman: 0 };
    currentGroup[entry.type] += entry.count;
    grouped.set(entry.tier, currentGroup);
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[0] - left[0])
    .slice(0, 2)
    .map(([tier, counts]) => ({
      tier,
      counts
    }));
}

function formatTierGroupTier(group: { tier: number } | undefined) {
  return group ? `T${group.tier}` : "";
}
