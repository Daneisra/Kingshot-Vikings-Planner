import { Copy, Download, Plus, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type {
  FormationEventKey,
  FormationPreset,
  FormationPresetSummary,
  FormationSlot,
  FormationTroopCounts
} from "../types/formations";

interface TroopFormationsPageProps {
  isAdminUnlocked: boolean;
  adminToken: string;
  onNotify: (tone: "success" | "error", message: string) => void;
}

type TroopType = keyof FormationTroopCounts;

const troopTypes: Array<{ key: TroopType; label: string }> = [
  { key: "infantry", label: "Infantry" },
  { key: "lancer", label: "Lancer" },
  { key: "marksman", label: "Marksman" }
];

const defaultSlotDraft: Omit<FormationSlot, "id" | "sortOrder"> = {
  name: "New formation",
  hero: "No hero",
  infantry: 0,
  lancer: 0,
  marksman: 0,
  notes: ""
};

interface LocalFormationDraft {
  availableTroops: FormationTroopCounts;
  slots: FormationSlot[];
  savedAt: string;
}

export function TroopFormationsPage({ isAdminUnlocked, adminToken, onNotify }: TroopFormationsPageProps) {
  const [summaries, setSummaries] = useState<FormationPresetSummary[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState<FormationEventKey>("vikings");
  const [preset, setPreset] = useState<FormationPreset | null>(null);
  const [draftTotals, setDraftTotals] = useState<FormationTroopCounts>({ infantry: 0, lancer: 0, marksman: 0 });
  const [draftSlots, setDraftSlots] = useState<FormationSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [localSavedAt, setLocalSavedAt] = useState<string | null>(null);

  const assignedTroops = useMemo(() => sumSlots(draftSlots), [draftSlots]);
  const remainingTroops = useMemo(
    () => ({
      infantry: draftTotals.infantry - assignedTroops.infantry,
      lancer: draftTotals.lancer - assignedTroops.lancer,
      marksman: draftTotals.marksman - assignedTroops.marksman
    }),
    [assignedTroops, draftTotals]
  );
  const overAssignedTypes = troopTypes.filter(({ key }) => remainingTroops[key] < 0);

  useEffect(() => {
    void loadSummaries();
  }, []);

  useEffect(() => {
    void loadPreset(selectedEventKey);
  }, [selectedEventKey]);

  useEffect(() => {
    if (!preset || preset.eventKey !== selectedEventKey || isLoading) {
      return;
    }

    const savedAt = new Date().toISOString();
    saveLocalDraft(selectedEventKey, {
      availableTroops: draftTotals,
      slots: draftSlots,
      savedAt
    });
    setLocalSavedAt(savedAt);
  }, [draftSlots, draftTotals, isLoading, preset, selectedEventKey]);

  async function loadSummaries() {
    try {
      const nextSummaries = await api.listFormationPresets();
      setSummaries(nextSummaries);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load formation presets."));
    }
  }

  async function loadPreset(eventKey: FormationEventKey) {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextPreset = await api.getFormationPreset(eventKey);
      applyPreset(nextPreset, getLocalDraft(eventKey));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load troop formations."));
    } finally {
      setIsLoading(false);
    }
  }

  function applyPreset(nextPreset: FormationPreset, localDraft?: LocalFormationDraft | null) {
    setPreset(nextPreset);
    setDraftTotals(localDraft?.availableTroops ?? nextPreset.availableTroops);
    setDraftSlots(localDraft?.slots ?? nextPreset.slots);
    setLocalSavedAt(localDraft?.savedAt ?? null);
  }

  function saveLocalNow() {
    const savedAt = new Date().toISOString();
    saveLocalDraft(selectedEventKey, {
      availableTroops: draftTotals,
      slots: draftSlots,
      savedAt
    });
    setLocalSavedAt(savedAt);
    onNotify("success", "Formation draft saved locally on this device.");
  }

  function addSlot() {
    setDraftSlots((current) => [
      ...current,
      {
        ...defaultSlotDraft,
        id: createLocalSlotId(),
        sortOrder: current.length + 1
      }
    ]);
    onNotify("success", "Formation slot added to your local draft.");
  }

  function duplicateSlot(slot: FormationSlot) {
    setDraftSlots((current) => [
      ...current,
      {
        name: `${slot.name} copy`,
        hero: slot.hero,
        infantry: slot.infantry,
        lancer: slot.lancer,
        marksman: slot.marksman,
        notes: slot.notes,
        id: createLocalSlotId(),
        sortOrder: current.length + 1
      }
    ]);
    onNotify("success", "Formation slot duplicated in your local draft.");
  }

  function deleteSlot(slot: FormationSlot) {
    if (!window.confirm(`Delete ${slot.name} from your local draft?`)) {
      return;
    }

    setDraftSlots((current) => normalizeSlotOrder(current.filter((currentSlot) => currentSlot.id !== slot.id)));
    onNotify("success", "Formation slot deleted from your local draft.");
  }

  function moveSlot(slotIndex: number, direction: -1 | 1) {
    const targetIndex = slotIndex + direction;

    if (targetIndex < 0 || targetIndex >= draftSlots.length) {
      return;
    }

    setDraftSlots((current) => {
      const nextSlots = [...current];
      const movedSlot = nextSlots[slotIndex];
      nextSlots[slotIndex] = nextSlots[targetIndex];
      nextSlots[targetIndex] = movedSlot;
      return normalizeSlotOrder(nextSlots);
    });
  }

  function resetLocalDraft() {
    if (!preset || !window.confirm(`Reset your local ${preset.eventName} draft to the shared default template?`)) {
      return;
    }

    localStorage.removeItem(getLocalStorageKey(selectedEventKey));
    setDraftTotals(preset.availableTroops);
    setDraftSlots(preset.slots);
    setLocalSavedAt(null);
    onNotify("success", "Your local formation draft was reset.");
  }

  async function resetSharedTemplate() {
    if (!isAdminUnlocked || !adminToken.trim()) {
      onNotify("error", "Unlock Admin before resetting the shared template.");
      return;
    }

    if (!window.confirm(`Reset the shared ${preset?.eventName ?? "formation"} template for everyone?`)) {
      return;
    }

    setIsSaving(true);

    try {
      const nextPreset = await api.resetFormationPreset(adminToken, selectedEventKey);
      localStorage.removeItem(getLocalStorageKey(selectedEventKey));
      applyPreset(nextPreset, null);
      onNotify("success", "Shared formation template reset.");
    } catch (error) {
      onNotify("error", getErrorMessage(error, "Unable to reset shared formation template."));
    } finally {
      setIsSaving(false);
    }
  }

  async function copySummary() {
    if (!preset) {
      return;
    }

    const summary = [
      `Event: ${preset.eventName}`,
      `Available: Infantry ${formatNumber(draftTotals.infantry)} / Lancer ${formatNumber(draftTotals.lancer)} / Marksman ${formatNumber(draftTotals.marksman)}`,
      `Assigned: Infantry ${formatNumber(assignedTroops.infantry)} / Lancer ${formatNumber(assignedTroops.lancer)} / Marksman ${formatNumber(assignedTroops.marksman)}`,
      `Remaining: Infantry ${formatNumber(remainingTroops.infantry)} / Lancer ${formatNumber(remainingTroops.lancer)} / Marksman ${formatNumber(remainingTroops.marksman)}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      onNotify("success", "Formation summary copied.");
    } catch {
      onNotify("error", "Unable to copy the summary from this browser.");
    }
  }

  async function exportCsv() {
    setIsSaving(true);

    try {
      const { blob, filename } = buildLocalFormationCsv({
        eventName: preset?.eventName ?? selectedEventKey,
        eventKey: selectedEventKey,
        availableTroops: draftTotals,
        slots: draftSlots
      });
      downloadBlob(blob, filename);
      onNotify("success", "Formation CSV exported.");
    } catch (error) {
      onNotify("error", getErrorMessage(error, "Unable to export formation CSV."));
    } finally {
      setIsSaving(false);
    }
  }

  function updateSlotDraft(slotId: string, patch: Partial<FormationSlot>) {
    setDraftSlots((current) => current.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/10 p-5 shadow-panel">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Troop formations</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-frost">
              Plan march splits by event
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/85">
              Track available Infantry, Lancer, and Marksman troops, distribute them into event formations, and keep
              remaining troops visible before the event starts.
            </p>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button type="button" className="secondary-button" onClick={() => void loadPreset(selectedEventKey)}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button type="button" className="secondary-button" onClick={saveLocalNow}>
              <Save className="h-4 w-4" />
              Save locally
            </button>
            <button type="button" className="secondary-button" onClick={() => void copySummary()}>
              <Copy className="h-4 w-4" />
              Copy Summary
            </button>
            <button type="button" className="secondary-button" onClick={() => void exportCsv()} disabled={isSaving}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {summaries.map((summary) => (
            <button
              key={summary.eventKey}
              type="button"
              className={selectedEventKey === summary.eventKey ? "primary-button" : "secondary-button"}
              onClick={() => setSelectedEventKey(summary.eventKey)}
            >
              {summary.eventName}
            </button>
          ))}
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-100">
          {errorMessage}
        </p>
      ) : null}

      {isLoading || !preset ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-950/70" />
        </section>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <AvailableTroopsPanel
              totals={draftTotals}
              disabled={isSaving}
              onChange={setDraftTotals}
            />

            <FormationSummaryPanel
              assigned={assignedTroops}
              remaining={remainingTroops}
              overAssignedTypes={overAssignedTypes.map((troopType) => troopType.label)}
            />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-amber-300">{preset.eventName} slots</p>
                <h2 className="mt-2 text-xl font-semibold text-frost">Editable formation plan</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  The Remainder line is calculated automatically from the remaining troops and is not edited directly.
                </p>
              </div>

              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <button type="button" className="secondary-button" onClick={resetLocalDraft} disabled={isSaving}>
                  <RotateCcw className="h-4 w-4" />
                  Reset my formation
                </button>
                <button type="button" className="primary-button" onClick={addSlot} disabled={isSaving}>
                  <Plus className="h-4 w-4" />
                  Add slot
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <p className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                Your changes are saved locally on this device. Admin access is only required to reset shared default templates.
                {localSavedAt ? (
                  <span className="mt-1 block text-emerald-200">Saved locally at {formatLocalTime(localSavedAt)}.</span>
                ) : null}
              </p>
              {isAdminUnlocked ? (
                <button type="button" className="danger-button" onClick={() => void resetSharedTemplate()} disabled={isSaving}>
                  Reset shared template
                </button>
              ) : null}
            </div>

            <div className="mt-5 hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1080px] border-separate border-spacing-y-3 text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-3">Name</th>
                    <th className="px-3">Hero</th>
                    <th className="px-3">Infantry</th>
                    <th className="px-3">Lancer</th>
                    <th className="px-3">Marksman</th>
                    <th className="px-3">Total</th>
                    <th className="px-3">Ratios</th>
                    <th className="px-3">Notes</th>
                    <th className="px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {draftSlots.map((slot, index) => (
                    <SlotTableRow
                      key={slot.id}
                      slot={slot}
                      index={index}
                      slotCount={draftSlots.length}
                      disabled={isSaving}
                      onChange={updateSlotDraft}
                      onDuplicate={duplicateSlot}
                      onDelete={deleteSlot}
                      onMove={moveSlot}
                    />
                  ))}
                  <RemainderTableRow remaining={remainingTroops} />
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 xl:hidden">
              {draftSlots.map((slot, index) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  index={index}
                  slotCount={draftSlots.length}
                  disabled={isSaving}
                  onChange={updateSlotDraft}
                  onDuplicate={duplicateSlot}
                  onDelete={deleteSlot}
                  onMove={moveSlot}
                />
              ))}
              <RemainderCard remaining={remainingTroops} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function AvailableTroopsPanel({
  totals,
  disabled,
  onChange
}: {
  totals: FormationTroopCounts;
  disabled: boolean;
  onChange: (totals: FormationTroopCounts) => void;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel">
      <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Available troops</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {troopTypes.map(({ key, label }) => (
          <label key={key}>
            <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
            <NumericInput
              value={totals[key]}
              disabled={disabled}
              onChange={(value) => onChange({ ...totals, [key]: value })}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">Total available: {formatNumber(getTotal(totals))}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Auto-saved locally</p>
      </div>
    </section>
  );
}

function FormationSummaryPanel({
  assigned,
  remaining,
  overAssignedTypes
}: {
  assigned: FormationTroopCounts;
  remaining: FormationTroopCounts;
  overAssignedTypes: string[];
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel">
      <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Assigned / remaining</p>
      <div className="mt-4 grid gap-3">
        <SummaryRow label="Assigned" counts={assigned} />
        <SummaryRow label="Remaining" counts={remaining} highlightNegative />
      </div>
      {overAssignedTypes.length > 0 ? (
        <p className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Overassigned: {overAssignedTypes.join(", ")}. Reduce one or more formation slots before the event.
        </p>
      ) : (
        <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          No overassignment detected.
        </p>
      )}
    </section>
  );
}

function SlotTableRow({
  slot,
  index,
  slotCount,
  disabled,
  onChange,
  onDuplicate,
  onDelete,
  onMove
}: SlotEditorProps) {
  const total = getSlotTotal(slot);

  return (
    <tr className="rounded-2xl bg-slate-950/70 align-top">
      <td className="rounded-l-2xl px-3 py-3">
        <TextInput value={slot.name} disabled={disabled} onChange={(value) => onChange(slot.id, { name: value })} />
      </td>
      <td className="px-3 py-3">
        <TextInput value={slot.hero} disabled={disabled} onChange={(value) => onChange(slot.id, { hero: value })} />
      </td>
      {troopTypes.map(({ key }) => (
        <td key={key} className="px-3 py-3">
          <NumericInput value={slot[key]} disabled={disabled} onChange={(value) => onChange(slot.id, { [key]: value })} />
        </td>
      ))}
      <td className="px-3 py-3 font-semibold text-frost">{formatNumber(total)}</td>
      <td className="px-3 py-3 text-xs text-slate-300">{formatSlotRatios(slot)}</td>
      <td className="px-3 py-3">
        <TextInput value={slot.notes} disabled={disabled} onChange={(value) => onChange(slot.id, { notes: value })} />
      </td>
      <td className="rounded-r-2xl px-3 py-3">
        <SlotActions
          slot={slot}
          index={index}
          slotCount={slotCount}
          disabled={disabled}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onMove={onMove}
        />
      </td>
    </tr>
  );
}

function SlotCard(props: SlotEditorProps) {
  const { slot, disabled, onChange } = props;
  const total = getSlotTotal(slot);

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Name</span>
          <TextInput value={slot.name} disabled={disabled} onChange={(value) => onChange(slot.id, { name: value })} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Hero</span>
          <TextInput value={slot.hero} disabled={disabled} onChange={(value) => onChange(slot.id, { hero: value })} />
        </label>
        {troopTypes.map(({ key, label }) => (
          <label key={key}>
            <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
            <NumericInput value={slot[key]} disabled={disabled} onChange={(value) => onChange(slot.id, { [key]: value })} />
          </label>
        ))}
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Notes</span>
          <TextInput value={slot.notes} disabled={disabled} onChange={(value) => onChange(slot.id, { notes: value })} />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryPill label="Total" value={formatNumber(total)} />
        <SummaryPill label="Ratios" value={formatSlotRatios(slot)} />
      </div>
      <div className="mt-4">
        <SlotActions {...props} />
      </div>
    </article>
  );
}

interface SlotEditorProps {
  slot: FormationSlot;
  index: number;
  slotCount: number;
  disabled: boolean;
  onChange: (slotId: string, patch: Partial<FormationSlot>) => void;
  onDuplicate: (slot: FormationSlot) => void;
  onDelete: (slot: FormationSlot) => void;
  onMove: (slotIndex: number, direction: -1 | 1) => void;
}

interface SlotActionsProps {
  slot: FormationSlot;
  index: number;
  slotCount: number;
  disabled: boolean;
  onDuplicate: (slot: FormationSlot) => void;
  onDelete: (slot: FormationSlot) => void;
  onMove: (slotIndex: number, direction: -1 | 1) => void;
}

function SlotActions({
  slot,
  index,
  slotCount,
  disabled,
  onDuplicate,
  onDelete,
  onMove
}: SlotActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="secondary-button" onClick={() => onMove(index, -1)} disabled={disabled || index === 0}>
        Up
      </button>
      <button type="button" className="secondary-button" onClick={() => onMove(index, 1)} disabled={disabled || index === slotCount - 1}>
        Down
      </button>
      <button type="button" className="secondary-button" onClick={() => onDuplicate(slot)} disabled={disabled}>
        Copy
      </button>
      <button type="button" className="danger-button" onClick={() => onDelete(slot)} disabled={disabled}>
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  );
}

function RemainderTableRow({ remaining }: { remaining: FormationTroopCounts }) {
  const total = getTotal(remaining);

  return (
    <tr className="rounded-2xl border border-amber-300/20 bg-amber-300/10 align-top">
      <td className="rounded-l-2xl px-3 py-4 font-semibold text-frost">Remainder</td>
      <td className="px-3 py-4 text-slate-300">No hero</td>
      <td className={getRemainingClassName(remaining.infantry)}>{formatNumber(remaining.infantry)}</td>
      <td className={getRemainingClassName(remaining.lancer)}>{formatNumber(remaining.lancer)}</td>
      <td className={getRemainingClassName(remaining.marksman)}>{formatNumber(remaining.marksman)}</td>
      <td className="px-3 py-4 font-semibold text-frost">{formatNumber(total)}</td>
      <td className="px-3 py-4 text-xs text-slate-300">Calculated</td>
      <td className="px-3 py-4 text-slate-300">Automatic remaining troops</td>
      <td className="rounded-r-2xl px-3 py-4 text-slate-500">Locked</td>
    </tr>
  );
}

function RemainderCard({ remaining }: { remaining: FormationTroopCounts }) {
  return (
    <article className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
      <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Remainder</p>
      <p className="mt-2 text-sm text-amber-50/85">Calculated automatically from available minus assigned troops.</p>
      <div className="mt-4 grid gap-3">
        <SummaryRow label="Remaining" counts={remaining} highlightNegative />
      </div>
    </article>
  );
}

function NumericInput({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (value: number) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={String(value)}
      disabled={disabled}
      onChange={(event) => onChange(parseIntegerInput(event.target.value))}
    />
  );
}

function TextInput({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <input type="text" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />;
}

function SummaryRow({
  label,
  counts,
  highlightNegative = false
}: {
  label: string;
  counts: FormationTroopCounts;
  highlightNegative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        {troopTypes.map(({ key, label: troopLabel }) => (
          <p key={key} className={highlightNegative && counts[key] < 0 ? "font-semibold text-rose-200" : "text-slate-300"}>
            <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">{troopLabel}</span>
            {formatNumber(counts[key])}
          </p>
        ))}
      </div>
      <p className="mt-2 text-sm font-semibold text-frost">Total {formatNumber(getTotal(counts))}</p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-frost">{value}</p>
    </div>
  );
}

function sumSlots(slots: FormationSlot[]): FormationTroopCounts {
  return slots.reduce(
    (totals, slot) => ({
      infantry: totals.infantry + slot.infantry,
      lancer: totals.lancer + slot.lancer,
      marksman: totals.marksman + slot.marksman
    }),
    { infantry: 0, lancer: 0, marksman: 0 }
  );
}

function getTotal(counts: FormationTroopCounts) {
  return counts.infantry + counts.lancer + counts.marksman;
}

function getSlotTotal(slot: FormationSlot) {
  return slot.infantry + slot.lancer + slot.marksman;
}

function formatSlotRatios(slot: FormationSlot) {
  const total = getSlotTotal(slot);

  return troopTypes.map(({ key, label }) => `${label} ${formatRatio(slot[key], total)}`).join(" / ");
}

function formatRatio(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function parseIntegerInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly ? Number(digitsOnly) : 0;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function getRemainingClassName(value: number) {
  return `px-3 py-4 font-semibold ${value < 0 ? "text-rose-200" : "text-frost"}`;
}

function getLocalStorageKey(eventKey: FormationEventKey) {
  return `troop-formations:${eventKey}`;
}

function getLocalDraft(eventKey: FormationEventKey): LocalFormationDraft | null {
  const rawDraft = localStorage.getItem(getLocalStorageKey(eventKey));

  if (!rawDraft) {
    return null;
  }

  try {
    const parsedDraft = JSON.parse(rawDraft) as LocalFormationDraft;

    if (!isValidTroopCounts(parsedDraft.availableTroops) || !Array.isArray(parsedDraft.slots)) {
      return null;
    }

    return {
      availableTroops: normalizeTroopCounts(parsedDraft.availableTroops),
      slots: normalizeSlotOrder(parsedDraft.slots.map(normalizeSlotDraft)),
      savedAt: typeof parsedDraft.savedAt === "string" ? parsedDraft.savedAt : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function saveLocalDraft(eventKey: FormationEventKey, draft: LocalFormationDraft) {
  localStorage.setItem(getLocalStorageKey(eventKey), JSON.stringify(draft));
}

function normalizeTroopCounts(counts: FormationTroopCounts): FormationTroopCounts {
  return {
    infantry: normalizeCount(counts.infantry),
    lancer: normalizeCount(counts.lancer),
    marksman: normalizeCount(counts.marksman)
  };
}

function normalizeSlotDraft(slot: FormationSlot): FormationSlot {
  return {
    id: typeof slot.id === "string" && slot.id.trim() ? slot.id : createLocalSlotId(),
    name: typeof slot.name === "string" && slot.name.trim() ? slot.name : "Formation",
    hero: typeof slot.hero === "string" && slot.hero.trim() ? slot.hero : "No hero",
    infantry: normalizeCount(slot.infantry),
    lancer: normalizeCount(slot.lancer),
    marksman: normalizeCount(slot.marksman),
    notes: typeof slot.notes === "string" ? slot.notes : "",
    sortOrder: normalizeCount(slot.sortOrder)
  };
}

function normalizeSlotOrder(slots: FormationSlot[]) {
  return slots.map((slot, index) => ({
    ...normalizeSlotDraft(slot),
    sortOrder: index + 1
  }));
}

function isValidTroopCounts(value: unknown): value is FormationTroopCounts {
  if (!value || typeof value !== "object") {
    return false;
  }

  const counts = value as FormationTroopCounts;
  return Number.isFinite(counts.infantry) && Number.isFinite(counts.lancer) && Number.isFinite(counts.marksman);
}

function normalizeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function createLocalSlotId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildLocalFormationCsv({
  eventName,
  eventKey,
  availableTroops,
  slots
}: {
  eventName: string;
  eventKey: FormationEventKey;
  availableTroops: FormationTroopCounts;
  slots: FormationSlot[];
}) {
  const assigned = sumSlots(slots);
  const remaining = {
    infantry: availableTroops.infantry - assigned.infantry,
    lancer: availableTroops.lancer - assigned.lancer,
    marksman: availableTroops.marksman - assigned.marksman
  };
  const exportDate = new Date().toISOString().slice(0, 10);
  const rows: Array<Array<string | number>> = [
    ["Kingshot Troop Formation Export"],
    ["Exported At (UTC)", new Date().toISOString()],
    ["Event", eventName],
    ["Source", "Local browser draft"],
    [""],
    ["Available", availableTroops.infantry, availableTroops.lancer, availableTroops.marksman],
    ["Assigned", assigned.infantry, assigned.lancer, assigned.marksman],
    ["Remaining", remaining.infantry, remaining.lancer, remaining.marksman],
    [""],
    ["Name", "Hero", "Infantry", "Lancer", "Marksman", "Total", "Infantry Ratio", "Lancer Ratio", "Marksman Ratio", "Notes"],
    ...slots.map((slot) => {
      const total = getSlotTotal(slot);

      return [
        slot.name,
        slot.hero,
        slot.infantry,
        slot.lancer,
        slot.marksman,
        total,
        formatRatio(slot.infantry, total),
        formatRatio(slot.lancer, total),
        formatRatio(slot.marksman, total),
        slot.notes
      ];
    }),
    [
      "Remainder",
      "No hero",
      remaining.infantry,
      remaining.lancer,
      remaining.marksman,
      getTotal(remaining),
      "",
      "",
      "",
      "Calculated automatically"
    ]
  ];

  return {
    blob: new Blob([`\ufeff${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`], {
      type: "text/csv;charset=utf-8"
    }),
    filename: `kingshot-formations-${eventKey}-local-${exportDate}.csv`
  };
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function formatLocalTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "now";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
