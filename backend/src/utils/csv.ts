import { RegistrationRecord } from "../types/registration";

function escapeCell(value: string | number | boolean | null) {
  const rawValue = value === null ? "" : String(value);

  if (/[",\n]/.test(rawValue)) {
    return `"${rawValue.replace(/"/g, "\"\"")}"`;
  }

  return rawValue;
}

export function buildRegistrationsCsv(registrations: RegistrationRecord[]) {
  const header = [
    "Nickname",
    "Partner",
    "Troop Count",
    "Troop Level",
    "Available This Week",
    "Comment",
    "Created At",
    "Updated At"
  ];

  const rows = registrations.map((registration) => [
    registration.nickname,
    registration.partnerName,
    registration.troopCount,
    registration.troopLevel,
    registration.isAvailable ? "Yes" : "No",
    registration.comment,
    registration.createdAt,
    registration.updatedAt
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell ?? null)).join(","))
    .join("\n");
}
