import { Archive, Download, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { ManualArchiveStat, WeeklyArchiveSummary } from "../types/registration";

interface ManualStatDraft {
  label: string;
  value: string;
}

interface ArchiveDraft {
  allianceScore: string;
  difficultyLevel: string;
  difficultyNote: string;
  eventLog: string;
  manualStats: ManualStatDraft[];
}

interface ArchivesPanelProps {
  archives: WeeklyArchiveSummary[];
  isAdminUnlocked: boolean;
  isLoading: boolean;
  exportingArchiveId: string | null;
  savingArchiveId: string | null;
  errorMessage: string;
  onRefresh: () => Promise<void>;
  onExport: (archiveId: string) => Promise<void>;
  onSave: (
    archiveId: string,
    payload: {
      allianceScore: number | null;
      difficultyLevel: string | null;
      difficultyNote: string | null;
      eventLog: string | null;
      manualStats: ManualArchiveStat[];
    }
  ) => Promise<void>;
}

export function ArchivesPanel({
  archives,
  isAdminUnlocked,
  isLoading,
  exportingArchiveId,
  savingArchiveId,
  errorMessage,
  onRefresh,
  onExport,
  onSave
}: ArchivesPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, ArchiveDraft>>({});

  useEffect(() => {
    setDrafts((current) => {
      const nextDrafts: Record<string, ArchiveDraft> = {};

      for (const archive of archives) {
        nextDrafts[archive.id] = toArchiveDraft(archive);
      }

      for (const archive of archives) {
        const currentDraft = current[archive.id];

        if (!currentDraft) {
          continue;
        }

        if (savingArchiveId === archive.id || isDraftEqual(currentDraft, toArchiveDraft(archive))) {
          nextDrafts[archive.id] = toArchiveDraft(archive);
          continue;
        }

        nextDrafts[archive.id] = currentDraft;
      }

      return nextDrafts;
    });
  }, [archives, savingArchiveId]);

  function updateDraft(archiveId: string, patch: Partial<ArchiveDraft>) {
    setDrafts((current) => ({
      ...current,
      [archiveId]: {
        ...(current[archiveId] ?? emptyArchiveDraft()),
        ...patch
      }
    }));
  }

  function updateManualStatDraft(archiveId: string, index: number, patch: Partial<ManualStatDraft>) {
    setDrafts((current) => {
      const archiveDraft = current[archiveId] ?? emptyArchiveDraft();
      const nextManualStats = archiveDraft.manualStats.map((manualStat, manualStatIndex) =>
        manualStatIndex === index
          ? {
              ...manualStat,
              ...patch
            }
          : manualStat
      );

      return {
        ...current,
        [archiveId]: {
          ...archiveDraft,
          manualStats: nextManualStats
        }
      };
    });
  }

  function resetDraft(archive: WeeklyArchiveSummary) {
    setDrafts((current) => ({
      ...current,
      [archive.id]: toArchiveDraft(archive)
    }));
  }

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
          {archives.map((archive) => {
            const draft = drafts[archive.id] ?? toArchiveDraft(archive);
            const isDirty = !isDraftEqual(draft, toArchiveDraft(archive));
            const isSaving = savingArchiveId === archive.id;
            const isBusy = isSaving || Boolean(exportingArchiveId);
            const parsedAllianceScore = draft.allianceScore.trim() ? Number(draft.allianceScore) : null;
            const hasAllianceScoreError =
              draft.allianceScore.trim().length > 0 &&
              (!Number.isInteger(parsedAllianceScore) ||
                parsedAllianceScore === null ||
                parsedAllianceScore < 0 ||
                parsedAllianceScore > 1000000000);
            const hasDifficultyLevelError = draft.difficultyLevel.trim().length > 40;
            const hasDifficultyNoteError = draft.difficultyNote.trim().length > 300;
            const hasEventLogError = draft.eventLog.trim().length > 1200;
            const manualStatErrors = draft.manualStats.map((manualStat) => getManualStatError(manualStat));
            const hasManualStatError = manualStatErrors.some(Boolean);
            const hasValidationError =
              hasAllianceScoreError ||
              hasDifficultyLevelError ||
              hasDifficultyNoteError ||
              hasEventLogError ||
              hasManualStatError;

            return (
              <article
                key={archive.id}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-frost">{formatArchiveDate(archive.archivedAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">{archive.id}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onExport(archive.id)}
                      disabled={isBusy}
                    >
                      <Download className="h-4 w-4" />
                      {exportingArchiveId === archive.id ? "Exporting..." : "Export CSV"}
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        onSave(archive.id, {
                          allianceScore: draft.allianceScore.trim() ? Number(draft.allianceScore) : null,
                          difficultyLevel: normalizeTextInput(draft.difficultyLevel),
                          difficultyNote: normalizeTextInput(draft.difficultyNote),
                          eventLog: normalizeTextInput(draft.eventLog),
                          manualStats: normalizeManualStatDrafts(draft.manualStats)
                        })
                      }
                      disabled={!isDirty || hasValidationError || isBusy}
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
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

                <div className="mt-4 grid gap-3 lg:grid-cols-[180px_180px_minmax(0,1fr)]">
                  <label>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Alliance score
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={draft.allianceScore}
                      onChange={(event) => updateDraft(archive.id, { allianceScore: event.target.value })}
                      placeholder="e.g. 40000000"
                      className={
                        hasAllianceScoreError
                          ? "border-rose-400/40 bg-rose-500/5 focus:border-rose-400/60 focus:ring-rose-400/15"
                          : ""
                      }
                    />
                    <p className="mt-2 text-xs text-slate-500">Optional total alliance score for that week.</p>
                    {hasAllianceScoreError ? (
                      <p className="mt-2 text-xs text-rose-300">
                        Alliance score must be a whole number between 0 and 1,000,000,000.
                      </p>
                    ) : null}
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Difficulty level
                    </span>
                    <input
                      type="text"
                      value={draft.difficultyLevel}
                      onChange={(event) => updateDraft(archive.id, { difficultyLevel: event.target.value })}
                      placeholder="e.g. Level 11"
                      maxLength={40}
                      className={
                        hasDifficultyLevelError
                          ? "border-rose-400/40 bg-rose-500/5 focus:border-rose-400/60 focus:ring-rose-400/15"
                          : ""
                      }
                    />
                    <p className="mt-2 text-xs text-slate-500">Use the difficulty label your alliance tracks.</p>
                    {hasDifficultyLevelError ? (
                      <p className="mt-2 text-xs text-rose-300">Difficulty level must be 40 characters or less.</p>
                    ) : null}
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Difficulty note
                    </span>
                    <textarea
                      rows={3}
                      value={draft.difficultyNote}
                      onChange={(event) => updateDraft(archive.id, { difficultyNote: event.target.value })}
                      placeholder="e.g. Moved up one level after this run."
                      maxLength={300}
                      className={
                        hasDifficultyNoteError
                          ? "border-rose-400/40 bg-rose-500/5 focus:border-rose-400/60 focus:ring-rose-400/15"
                          : ""
                      }
                    />
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>Optional context for leadership and archive review.</span>
                      <span>{draft.difficultyNote.length}/300</span>
                    </div>
                    {hasDifficultyNoteError ? (
                      <p className="mt-2 text-xs text-rose-300">Difficulty note must be 300 characters or less.</p>
                    ) : null}
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Weekly event log
                  </span>
                  <textarea
                    rows={4}
                    value={draft.eventLog}
                    onChange={(event) => updateDraft(archive.id, { eventLog: event.target.value })}
                    placeholder="Leadership notes, score context, changed calls, HQ issues, online wave coverage, healing instructions..."
                    maxLength={1200}
                    className={
                      hasEventLogError
                        ? "border-rose-400/40 bg-rose-500/5 focus:border-rose-400/60 focus:ring-rose-400/15"
                        : ""
                    }
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>Optional weekly context for leadership decisions and archive review.</span>
                    <span>{draft.eventLog.length}/1200</span>
                  </div>
                  {hasEventLogError ? (
                    <p className="mt-2 text-xs text-rose-300">Weekly event log must be 1200 characters or less.</p>
                  ) : null}
                </label>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Manual alliance stats
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Add up to 4 extra metrics that are not captured by the sign-up sheet.
                  </p>
                  <div className="mt-4 space-y-3">
                    {draft.manualStats.map((manualStat, index) => (
                      <div
                        key={`${archive.id}-manual-stat-${index}`}
                        className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-3 md:grid-cols-[minmax(0,1fr)_180px]"
                      >
                        <label>
                          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Label</span>
                          <input
                            type="text"
                            value={manualStat.label}
                            onChange={(event) =>
                              updateManualStatDraft(archive.id, index, {
                                label: event.target.value
                              })
                            }
                            placeholder="e.g. HQ defenders"
                            maxLength={30}
                          />
                        </label>
                        <label>
                          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Value</span>
                          <input
                            type="number"
                            min={0}
                            value={manualStat.value}
                            onChange={(event) =>
                              updateManualStatDraft(archive.id, index, {
                                value: event.target.value
                              })
                            }
                            placeholder="e.g. 24"
                          />
                        </label>
                        {manualStatErrors[index] ? (
                          <p className="md:col-span-2 text-xs text-rose-300">{manualStatErrors[index]}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {isDirty ? "Unsaved archive metadata changes." : "Archive metadata is up to date."}
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => resetDraft(archive)}
                    disabled={!isDirty || isBusy}
                  >
                    Reset changes
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

function emptyArchiveDraft(): ArchiveDraft {
  return {
    allianceScore: "",
    difficultyLevel: "",
    difficultyNote: "",
    eventLog: "",
    manualStats: createEmptyManualStatDrafts()
  };
}

function toArchiveDraft(archive: WeeklyArchiveSummary): ArchiveDraft {
  return {
    allianceScore: archive.allianceScore === null ? "" : String(archive.allianceScore),
    difficultyLevel: archive.difficultyLevel ?? "",
    difficultyNote: archive.difficultyNote ?? "",
    eventLog: archive.eventLog ?? "",
    manualStats: mapManualStatsToDrafts(archive.manualStats)
  };
}

function normalizeTextInput(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function isDraftEqual(left: ArchiveDraft, right: ArchiveDraft) {
  return (
    left.allianceScore === right.allianceScore &&
    left.difficultyLevel === right.difficultyLevel &&
    left.difficultyNote === right.difficultyNote &&
    left.eventLog === right.eventLog &&
    left.manualStats.every(
      (manualStat, index) =>
        manualStat.label === right.manualStats[index]?.label && manualStat.value === right.manualStats[index]?.value
    )
  );
}

function createEmptyManualStatDrafts(): ManualStatDraft[] {
  return Array.from({ length: 4 }, () => ({
    label: "",
    value: ""
  }));
}

function mapManualStatsToDrafts(manualStats: ManualArchiveStat[]): ManualStatDraft[] {
  const nextDrafts = createEmptyManualStatDrafts();

  manualStats.slice(0, 4).forEach((manualStat, index) => {
    nextDrafts[index] = {
      label: manualStat.label,
      value: String(manualStat.value)
    };
  });

  return nextDrafts;
}

function getManualStatError(manualStat: ManualStatDraft) {
  const label = manualStat.label.trim();
  const value = manualStat.value.trim();

  if (!label && !value) {
    return "";
  }

  if (!label) {
    return "Manual stat label is required when a value is set.";
  }

  if (label.length > 30) {
    return "Manual stat label must be 30 characters or less.";
  }

  if (!value) {
    return "Manual stat value is required when a label is set.";
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 1000000000) {
    return "Manual stat value must be a whole number between 0 and 1,000,000,000.";
  }

  return "";
}

function normalizeManualStatDrafts(manualStats: ManualStatDraft[]): ManualArchiveStat[] {
  return manualStats.flatMap((manualStat) => {
    const label = manualStat.label.trim();
    const value = manualStat.value.trim();

    if (!label && !value) {
      return [];
    }

    return [
      {
        label,
        value: Number(value)
      }
    ];
  });
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
