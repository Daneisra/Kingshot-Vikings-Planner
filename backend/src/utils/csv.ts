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
    "Partner",
    "Primary Troop Type",
    "Primary Troop Tier",
    "Primary Troop Count",
    "Secondary Troop Type",
    "Secondary Troop Tier",
    "Secondary Troop Count",
    "Troop Count",
    "Highest Troop Tier",
    "Availability",
    "Comment",
    "Created At",
    "Updated At"
  ];

  const rows = registrations.map((registration) => [
    registration.nickname,
    registration.partnerName,
    formatTroopType(registration.troopLoadout[0]?.type),
    formatTroopTier(registration.troopLoadout[0]),
    registration.troopLoadout[0]?.count ?? "",
    formatTroopType(registration.troopLoadout[1]?.type),
    formatTroopTier(registration.troopLoadout[1]),
    registration.troopLoadout[1]?.count ?? "",
    registration.troopCount,
    registration.troopLevel ? `T${registration.troopLevel}` : "",
    registration.isAvailable ? "Available" : "Unavailable",
    registration.comment,
    registration.createdAt,
    registration.updatedAt
  ]);

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

function formatTroopType(type: TroopLoadoutEntry["type"] | undefined) {
  if (!type) {
    return "";
  }

  if (type === "marksman") {
    return "Marksman";
  }

  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function formatTroopTier(entry: TroopLoadoutEntry | undefined) {
  return entry ? `T${entry.tier}` : "";
}
