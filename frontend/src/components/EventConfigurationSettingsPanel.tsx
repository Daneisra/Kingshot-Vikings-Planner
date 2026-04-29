import { CalendarDays, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { EventConfigurationSettings } from "../types/settings";

interface EventConfigurationSettingsPanelProps {
  settings: EventConfigurationSettings;
  isAdminUnlocked: boolean;
  isSaving: boolean;
  onSave: (settings: EventConfigurationSettings) => Promise<void>;
}

export function EventConfigurationSettingsPanel({
  settings,
  isAdminUnlocked,
  isSaving,
  onSave
}: EventConfigurationSettingsPanelProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const canSave = isAdminUnlocked && !isSaving && draft.eventName.trim().length > 0;

  async function handleSave() {
    if (!canSave) {
      return;
    }

    await onSave({
      eventName: draft.eventName.trim(),
      activeWeek: draft.activeWeek.trim(),
      difficultyLevel: draft.difficultyLevel.trim(),
      allianceNotes: draft.allianceNotes.trim()
    });
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Event config</p>
          <h2 className="mt-2 text-xl font-semibold text-frost">Current Viking event</h2>
          <p className="mt-2 text-sm text-slate-400">
            Keep the public context aligned with the active week, difficulty, and alliance instructions.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
          <CalendarDays className="h-4 w-4" />
          Public
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Event name</span>
          <input
            type="text"
            value={draft.eventName}
            onChange={(event) => setDraft((current) => ({ ...current, eventName: event.target.value.slice(0, 80) }))}
            placeholder="Viking Vengeance"
            disabled={!isAdminUnlocked || isSaving}
          />
          <span className="mt-2 block text-xs text-slate-500">{draft.eventName.length}/80</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Active week / season</span>
            <input
              type="text"
              value={draft.activeWeek}
              onChange={(event) =>
                setDraft((current) => ({ ...current, activeWeek: event.target.value.slice(0, 80) }))
              }
              placeholder="Week 12"
              disabled={!isAdminUnlocked || isSaving}
            />
            <span className="mt-2 block text-xs text-slate-500">{draft.activeWeek.length}/80</span>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Difficulty level</span>
            <input
              type="text"
              value={draft.difficultyLevel}
              onChange={(event) =>
                setDraft((current) => ({ ...current, difficultyLevel: event.target.value.slice(0, 40) }))
              }
              placeholder="Level 11"
              disabled={!isAdminUnlocked || isSaving}
            />
            <span className="mt-2 block text-xs text-slate-500">{draft.difficultyLevel.length}/40</span>
          </label>
        </div>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Alliance notes</span>
          <textarea
            value={draft.allianceNotes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, allianceNotes: event.target.value.slice(0, 500) }))
            }
            placeholder="Short public note for the current event week."
            rows={5}
            disabled={!isAdminUnlocked || isSaving}
          />
          <span className="mt-2 block text-xs text-slate-500">{draft.allianceNotes.length}/500</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="primary-button" onClick={() => void handleSave()} disabled={!canSave}>
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save event config"}
        </button>
        {!isAdminUnlocked ? <p className="text-sm text-slate-500">Unlock admin access to edit event config.</p> : null}
      </div>
    </section>
  );
}
