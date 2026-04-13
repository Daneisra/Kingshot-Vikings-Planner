import { RegistrationFilters, RegistrationRecord, TroopLoadoutEntry } from "../types/registration";

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
