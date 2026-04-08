import { useMemo, useState } from "react";
import { ArrowDownUp, Pencil, Trash2, Users } from "lucide-react";
import type { Registration } from "../types/registration";

type SortOption =
  | "default"
  | "nickname-asc"
  | "troops-desc"
  | "level-desc"
  | "updated-desc";

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "default", label: "Default order" },
  { value: "nickname-asc", label: "Nickname A-Z" },
  { value: "troops-desc", label: "Highest troops first" },
  { value: "level-desc", label: "Highest level first" },
  { value: "updated-desc", label: "Recently updated" }
];

interface RegistrationListProps {
  registrations: Registration[];
  isLoading: boolean;
  isAdminUnlocked: boolean;
  onEdit: (registration: Registration) => void;
  onDelete: (registration: Registration) => void;
}

function formatAvailabilityLabel(isAvailable: boolean) {
  return isAvailable ? "Available this week" : "Unavailable this rotation";
}

export function RegistrationList({
  registrations,
  isLoading,
  isAdminUnlocked,
  onEdit,
  onDelete
}: RegistrationListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("default");

  const sortedRegistrations = useMemo(() => {
    const entries = [...registrations];

    entries.sort((left, right) => compareRegistrations(left, right, sortBy));
    return entries;
  }, [registrations, sortBy]);

  if (isLoading) {
    return (
      <section className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/5"
          />
        ))}
      </section>
    );
  }

  if (registrations.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center shadow-panel">
        <Users className="mx-auto h-10 w-10 text-slate-400" />
        <h3 className="mt-4 text-xl font-semibold text-frost">No registrations match</h3>
        <p className="mt-2 text-slate-400">
          Add a player or adjust the filters to display this week's list.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-panel backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Player list</p>
          <p className="mt-2 text-sm text-slate-400">
            {sortedRegistrations.length} registration{sortedRegistrations.length > 1 ? "s" : ""} shown
          </p>
        </div>

        <label className="sm:w-64">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
            <ArrowDownUp className="h-4 w-4" />
            Sort by
          </span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sortedRegistrations.map((registration) => (
        <article
          key={registration.id}
          className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-panel backdrop-blur"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-semibold text-frost">{registration.nickname}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    registration.isAvailable
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-rose-500/15 text-rose-200"
                  }`}
                >
                  {registration.isAvailable ? "Available" : "Away"}
                </span>
              </div>

              <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                <p>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Partner</span>
                  {registration.partnerName}
                </p>
                <p>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Troops</span>
                  {registration.troopCount.toLocaleString("en-US")}
                </p>
                <p>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Level</span>
                  {registration.troopLevel}
                </p>
                <p>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Status</span>
                  {formatAvailabilityLabel(registration.isAvailable)}
                </p>
              </div>

              {registration.comment ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  {registration.comment}
                </p>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button type="button" className="secondary-button" onClick={() => onEdit(registration)}>
                <Pencil className="h-4 w-4" />
                Edit
              </button>

              {isAdminUnlocked ? (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => onDelete(registration)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function compareRegistrations(left: Registration, right: Registration, sortBy: SortOption) {
  switch (sortBy) {
    case "nickname-asc":
      return compareText(left.nickname, right.nickname);
    case "troops-desc":
      return compareNumbers(right.troopCount, left.troopCount) || compareDefault(left, right);
    case "level-desc":
      return compareNumbers(right.troopLevel, left.troopLevel) || compareDefault(left, right);
    case "updated-desc":
      return compareNumbers(Date.parse(right.updatedAt), Date.parse(left.updatedAt)) || compareDefault(left, right);
    case "default":
    default:
      return compareDefault(left, right);
  }
}

function compareDefault(left: Registration, right: Registration) {
  return compareNumbers(Number(right.isAvailable), Number(left.isAvailable)) || compareText(left.nickname, right.nickname);
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function compareNumbers(left: number, right: number) {
  return left - right;
}
