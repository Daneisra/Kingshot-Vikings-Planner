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
    "Pseudo",
    "Partenaire",
    "Nombre de troupes",
    "Niveau de troupes",
    "Disponible cette semaine",
    "Commentaire",
    "Cree le",
    "Mis a jour le"
  ];

  const rows = registrations.map((registration) => [
    registration.nickname,
    registration.partnerName,
    registration.troopCount,
    registration.troopLevel,
    registration.isAvailable ? "Oui" : "Non",
    registration.comment,
    registration.createdAt,
    registration.updatedAt
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell ?? null)).join(","))
    .join("\n");
}

