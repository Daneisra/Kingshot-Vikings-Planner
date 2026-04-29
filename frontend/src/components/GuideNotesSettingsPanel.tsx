import { BookOpenCheck, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { GuideNotesSettings } from "../types/settings";

interface GuideNotesSettingsPanelProps {
  settings: GuideNotesSettings;
  isAdminUnlocked: boolean;
  isSaving: boolean;
  onSave: (settings: GuideNotesSettings) => Promise<void>;
}

export function GuideNotesSettingsPanel({
  settings,
  isAdminUnlocked,
  isSaving,
  onSave
}: GuideNotesSettingsPanelProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const canSave =
    isAdminUnlocked &&
    !isSaving &&
    (!draft.isEnabled || (draft.title.trim().length > 0 && draft.notes.trim().length > 0));

  async function handleSave() {
    if (!canSave) {
      return;
    }

    await onSave({
      isEnabled: draft.isEnabled,
      title: draft.title.trim(),
      notes: draft.notes.trim()
    });
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Guide notes</p>
          <h2 className="mt-2 text-xl font-semibold text-frost">Alliance-specific guide notes</h2>
          <p className="mt-2 text-sm text-slate-400">
            Add short alliance rules or leadership instructions to the public Viking guide.
          </p>
        </div>
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            draft.isEnabled ? "bg-cyan-300/15 text-cyan-100" : "bg-slate-800 text-slate-300"
          }`}
        >
          <BookOpenCheck className="h-4 w-4" />
          {draft.isEnabled ? "Visible" : "Hidden"}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-frost">Show notes in guide</span>
            <span className="mt-1 block text-sm text-slate-400">Use this for alliance-specific calls, not general strategy.</span>
          </span>
          <input
            type="checkbox"
            checked={draft.isEnabled}
            onChange={(event) => setDraft((current) => ({ ...current, isEnabled: event.target.checked }))}
            disabled={!isAdminUnlocked || isSaving}
            className="h-5 w-5 rounded border-white/20 bg-slate-950 accent-cyan-300"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value.slice(0, 80) }))}
            placeholder="Example: R4W Viking calls"
            disabled={!isAdminUnlocked || isSaving}
          />
          <span className="mt-2 block text-xs text-slate-500">{draft.title.length}/80</span>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Notes</span>
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value.slice(0, 800) }))}
            placeholder="Example: Stay online from wave 7. HQ anchors: wait for leadership before moving marches."
            rows={6}
            disabled={!isAdminUnlocked || isSaving}
          />
          <span className="mt-2 block text-xs text-slate-500">{draft.notes.length}/800</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="primary-button" onClick={() => void handleSave()} disabled={!canSave}>
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save notes"}
        </button>
        {!isAdminUnlocked ? <p className="text-sm text-slate-500">Unlock admin access to edit guide notes.</p> : null}
      </div>
    </section>
  );
}
