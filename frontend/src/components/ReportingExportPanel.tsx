import { Download, FileArchive, FileText, Trophy } from "lucide-react";

export type ReportingExportKind = "archives" | "personal-scores" | "event-notes";

interface ReportingExportPanelProps {
  isAdminUnlocked: boolean;
  exportingKind: ReportingExportKind | null;
  onExport: (kind: ReportingExportKind) => Promise<void>;
}

const exportOptions: Array<{
  kind: ReportingExportKind;
  label: string;
  description: string;
  icon: typeof FileArchive;
}> = [
  {
    kind: "archives",
    label: "Archive summary",
    description: "Weekly archive totals, alliance score, difficulty, and manual metrics.",
    icon: FileArchive
  },
  {
    kind: "personal-scores",
    label: "Personal scores",
    description: "Player profile score history: latest, previous, best, average, and participation.",
    icon: Trophy
  },
  {
    kind: "event-notes",
    label: "Event notes",
    description: "Difficulty notes, weekly event logs, and manual leadership metrics.",
    icon: FileText
  }
];

export function ReportingExportPanel({
  isAdminUnlocked,
  exportingKind,
  onExport
}: ReportingExportPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Reporting exports</p>
        <h2 className="mt-2 text-xl font-semibold text-frost">Download archive reports</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Export focused CSV files for review outside the planner without downloading every registration snapshot.
        </p>
      </div>

      {!isAdminUnlocked ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Unlock the admin panel to export reporting CSV files.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            const isExporting = exportingKind === option.kind;
            const isBusy = Boolean(exportingKind);

            return (
              <article
                key={option.kind}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-amber-300" />
                      <p className="text-sm font-semibold text-frost">{option.label}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{option.description}</p>
                  </div>

                  <button
                    type="button"
                    className="secondary-button w-full sm:w-auto"
                    onClick={() => void onExport(option.kind)}
                    disabled={isBusy}
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export CSV"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
