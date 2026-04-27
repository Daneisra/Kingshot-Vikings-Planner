import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Upload } from "lucide-react";
import type { RegistrationPayload, TroopLoadoutEntry, TroopType } from "../types/registration";

const sampleCsv = `nickname,partners,tier1,infantry1,lancer1,marksman1,tier2,infantry2,lancer2,marksman2,available,personalScore,comment
Ragnar,Lagertha|Bjorn,10,120000,90000,85000,9,50000,30000,20000,yes,42000000,Main rally player
Lagertha,Ragnar,9,100000,80000,75000,,,,,yes,,`;

const troopTypes: TroopType[] = ["infantry", "lancer", "marksman"];

const headerAliases: Record<string, string> = {
  nickname: "nickname",
  nick: "nickname",
  player: "nickname",
  partners: "partners",
  partner: "partners",
  partnernames: "partners",
  tier1: "tier1",
  strongesttier: "tier1",
  infantry1: "infantry1",
  lancer1: "lancer1",
  marksman1: "marksman1",
  tier2: "tier2",
  secondtier: "tier2",
  infantry2: "infantry2",
  lancer2: "lancer2",
  marksman2: "marksman2",
  available: "available",
  isavailable: "available",
  personalscore: "personalScore",
  score: "personalScore",
  comment: "comment",
  note: "comment"
};

interface BulkImportPanelProps {
  isAdminUnlocked: boolean;
  isImporting: boolean;
  onImport: (registrations: RegistrationPayload[]) => Promise<void>;
}

interface ParseResult {
  registrations: RegistrationPayload[];
  errors: string[];
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsvRows(rawValue: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let isQuoted = false;

  for (let index = 0; index < rawValue.length; index += 1) {
    const character = rawValue[index];
    const nextCharacter = rawValue[index + 1];

    if (character === '"') {
      if (isQuoted && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }

      continue;
    }

    if (character === "," && !isQuoted) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !isQuoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      currentCell = "";

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell.trim());

  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function parseOptionalCount(value: string, rowNumber: number, label: string, errors: string[]) {
  const normalizedValue = value.trim().replace(/[ ,]/g, "");

  if (!normalizedValue) {
    return 0;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    errors.push(`Row ${rowNumber}: ${label} must be a positive whole number.`);
    return 0;
  }

  return parsedValue;
}

function parseTier(value: string, rowNumber: number, label: string, errors: string[]) {
  const parsedValue = Number(value.trim().replace(/^t/i, ""));

  if (!Number.isInteger(parsedValue) || parsedValue < 7 || parsedValue > 11) {
    errors.push(`Row ${rowNumber}: ${label} must be between T7 and T11.`);
    return null;
  }

  return parsedValue;
}

function parseAvailability(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue || ["yes", "y", "true", "1", "available"].includes(normalizedValue)) {
    return true;
  }

  if (["no", "n", "false", "0", "unavailable"].includes(normalizedValue)) {
    return false;
  }

  return true;
}

function parseImport(rawValue: string): ParseResult {
  const rows = parseCsvRows(rawValue.trim());
  const errors: string[] = [];

  if (rows.length === 0) {
    return {
      registrations: [],
      errors: []
    };
  }

  const headers = rows[0].map((header) => headerAliases[normalizeHeader(header)] ?? normalizeHeader(header));
  const columnIndex = new Map<string, number>();

  headers.forEach((header, index) => {
    if (!columnIndex.has(header)) {
      columnIndex.set(header, index);
    }
  });

  const getCell = (row: string[], key: string) => {
    const index = columnIndex.get(key);
    return typeof index === "number" ? row[index] ?? "" : "";
  };

  if (!columnIndex.has("nickname") || !columnIndex.has("partners") || !columnIndex.has("tier1")) {
    errors.push("The CSV header must include nickname, partners, and tier1 columns.");
  }

  const registrations = rows.slice(1).flatMap((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const nickname = getCell(row, "nickname").trim();
    const partnerNames = getCell(row, "partners")
      .split(/[|;]/)
      .map((partnerName) => partnerName.trim())
      .filter(Boolean);
    const rowErrorsStart = errors.length;

    if (!nickname) {
      errors.push(`Row ${rowNumber}: nickname is required.`);
    }

    if (partnerNames.length === 0) {
      errors.push(`Row ${rowNumber}: at least one partner is required.`);
    }

    const troopLoadout: TroopLoadoutEntry[] = [];

    [1, 2].forEach((blockNumber) => {
      const tierValue = getCell(row, `tier${blockNumber}`);
      const counts = troopTypes.map((troopType) => ({
        type: troopType,
        count: parseOptionalCount(getCell(row, `${troopType}${blockNumber}`), rowNumber, `${troopType}${blockNumber}`, errors)
      }));
      const hasCounts = counts.some((entry) => entry.count > 0);

      if (!hasCounts) {
        return;
      }

      const tier = parseTier(tierValue, rowNumber, `tier${blockNumber}`, errors);

      if (tier === null) {
        return;
      }

      counts.forEach((entry) => {
        if (entry.count > 0) {
          troopLoadout.push({
            type: entry.type,
            tier,
            count: entry.count
          });
        }
      });
    });

    if (troopLoadout.length === 0) {
      errors.push(`Row ${rowNumber}: at least one troop count is required.`);
    }

    if (errors.length > rowErrorsStart) {
      return [];
    }

    const personalScoreValue = getCell(row, "personalScore").trim();
    const personalScore = personalScoreValue
      ? parseOptionalCount(personalScoreValue, rowNumber, "personalScore", errors)
      : null;

    return [
      {
        nickname,
        partnerNames,
        troopLoadout,
        personalScore,
        comment: getCell(row, "comment").trim(),
        isAvailable: parseAvailability(getCell(row, "available"))
      }
    ];
  });

  if (registrations.length > 100) {
    errors.push("Import up to 100 registrations at a time.");
  }

  return {
    registrations,
    errors
  };
}

export function BulkImportPanel({ isAdminUnlocked, isImporting, onImport }: BulkImportPanelProps) {
  const [rawImport, setRawImport] = useState("");
  const parseResult = useMemo(() => parseImport(rawImport), [rawImport]);
  const canImport =
    isAdminUnlocked &&
    !isImporting &&
    parseResult.registrations.length > 0 &&
    parseResult.errors.length === 0;

  async function handleImport() {
    if (!canImport) {
      return;
    }

    await onImport(parseResult.registrations);
    setRawImport("");
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Bulk import</p>
          <h2 className="mt-2 text-xl font-semibold text-frost">Import registrations</h2>
          <p className="mt-2 text-sm text-slate-400">
            Paste CSV rows to add several players at once. The import is all-or-nothing.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
          <ClipboardList className="h-4 w-4" />
          {parseResult.registrations.length} ready
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-medium text-slate-300">CSV data</span>
        <textarea
          value={rawImport}
          onChange={(event) => setRawImport(event.target.value)}
          placeholder={sampleCsv}
          rows={9}
          disabled={!isAdminUnlocked || isImporting}
          className="font-mono text-sm"
        />
      </label>

      <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
        Required columns: nickname, partners, tier1, infantry1, lancer1, marksman1. Use `|` between multiple partners.
      </div>

      {parseResult.errors.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Import needs fixes
          </div>
          <div className="mt-2 space-y-1">
            {parseResult.errors.slice(0, 5).map((error) => (
              <p key={error}>{error}</p>
            ))}
            {parseResult.errors.length > 5 ? <p>And {parseResult.errors.length - 5} more errors.</p> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="primary-button"
          onClick={() => void handleImport()}
          disabled={!canImport}
        >
          <Upload className="h-4 w-4" />
          {isImporting ? "Importing..." : "Import registrations"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setRawImport(sampleCsv)}
          disabled={!isAdminUnlocked || isImporting}
        >
          Use sample
        </button>
        {!isAdminUnlocked ? <p className="text-sm text-slate-500">Unlock admin access to import data.</p> : null}
      </div>
    </section>
  );
}
