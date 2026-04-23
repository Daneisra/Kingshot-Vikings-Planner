import { Archive, Download, RefreshCw } from "lucide-react";
import type { WeeklyArchiveSummary } from "../types/registration";

interface ArchivesPanelProps {
  archives: WeeklyArchiveSummary[];
  isAdminUnlocked: boolean;
  isLoading: boolean;
  exportingArchiveId: string | null;
  errorMessage: string;
  onRefresh: () => Promise<void>;
  onExport: (archiveId: string) => Promise<void>;
}

export function ArchivesPanel({
  archives,
  isAdminUnlocked,
  isLoading,
  exportingArchiveId,
  errorMessage,
  onRefresh,
  onExport
}: ArchivesPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Archives</p>
          <h2 className="mt-2 text-xl font-semibold text-frost">Past weekly snapshots</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Each weekly reset stores a snapshot that can be reviewed and exported later.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onRefresh}
          disabled={!isAdminUnlocked || isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!isAdminUnlocked ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Unlock the admin panel to browse archived weeks.
        </p>
      ) : errorMessage ? (
        <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-100">
          {errorMessage}
        </p>
      ) : archives.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-6 text-center">
          <Archive className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-frost">No archives yet</p>
          <p className="mt-1 text-sm text-slate-400">Archives are created automatically when starting a new week.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {archives.map((archive) => (
            <article
              key={archive.id}
              className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-frost">{formatArchiveDate(archive.archivedAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">{archive.id}</p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onExport(archive.id)}
                  disabled={Boolean(exportingArchiveId)}
                >
                  <Download className="h-4 w-4" />
                  {exportingArchiveId === archive.id ? "Exporting..." : "Export CSV"}
                </button>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                <p>
                  <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Players</span>
                  {archive.registrationCount}
                </p>
                <p>
                  <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Available</span>
                  {archive.availableParticipants}
                </p>
                <p>
                  <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Troops</span>
                  {archive.totalTroops.toLocaleString("en-US")}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
