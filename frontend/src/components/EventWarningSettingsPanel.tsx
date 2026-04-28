import { BellRing, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { EventWarningSettings } from "../types/settings";

interface EventWarningSettingsPanelProps {
  settings: EventWarningSettings;
  isAdminUnlocked: boolean;
  isSaving: boolean;
  onSave: (settings: EventWarningSettings) => Promise<void>;
}

export function EventWarningSettingsPanel({
  settings,
  isAdminUnlocked,
  isSaving,
  onSave
}: EventWarningSettingsPanelProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const canSave =
    isAdminUnlocked &&
    !isSaving &&
    (!draft.isEnabled || (draft.title.trim().length > 0 && draft.message.trim().length > 0));

  async function handleSave() {
    if (!canSave) {
      return;
    }

    await onSave({
      isEnabled: draft.isEnabled,
      title: draft.title.trim(),
      message: draft.message.trim()
    });
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Event alert</p>
          <h2 className="mt-2 text-xl font-semibold text-frost">Player warning banner</h2>
          <p className="mt-2 text-sm text-slate-400">
            Publish a short leadership message above the rotating Viking reminders.
          </p>
        </div>
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            draft.isEnabled ? "bg-amber-400/15 text-amber-100" : "bg-slate-800 text-slate-300"
          }`}
        >
          <BellRing className="h-4 w-4" />
          {draft.isEnabled ? "Visible" : "Hidden"}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-frost">Show banner</span>
            <span className="mt-1 block text-sm text-slate-400">Turn this on only for active event instructions.</span>
          </span>
          <input
            type="checkbox"
            checked={draft.isEnabled}
            onChange={(event) => setDraft((current) => ({ ...current, isEnabled: event.target.checked }))}
            disabled={!isAdminUnlocked || isSaving}
            className="h-5 w-5 rounded border-white/20 bg-slate-950 accent-amber-300"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value.slice(0, 80) }))}
            placeholder="Example: Empty your city before Vikings starts"
            disabled={!isAdminUnlocked || isSaving}
          />
          <span className="mt-2 block text-xs text-slate-500">{draft.title.length}/80</span>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Message</span>
          <textarea
            value={draft.message}
            onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value.slice(0, 240) }))}
            placeholder="Short instruction visible to all players."
            rows={4}
            disabled={!isAdminUnlocked || isSaving}
          />
          <span className="mt-2 block text-xs text-slate-500">{draft.message.length}/240</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="primary-button" onClick={() => void handleSave()} disabled={!canSave}>
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save banner"}
        </button>
        {!isAdminUnlocked ? <p className="text-sm text-slate-500">Unlock admin access to edit the banner.</p> : null}
      </div>
    </section>
  );
}
