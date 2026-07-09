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

export function TroopFormationsPage({ isAdminUnlocked, adminToken, onNotify }: TroopFormationsPageProps) {
  const [summaries, setSummaries] = useState<FormationPresetSummary[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState<FormationEventKey>("vikings");
  const [preset, setPreset] = useState<FormationPreset | null>(null);
  const [draftTotals, setDraftTotals] = useState<FormationTroopCounts>({ infantry: 0, lancer: 0, marksman: 0 });
  const [draftSlots, setDraftSlots] = useState<FormationSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      applyPreset(nextPreset);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load troop formations."));
    } finally {
      setIsLoading(false);
    }
  }

  function applyPreset(nextPreset: FormationPreset) {
    setPreset(nextPreset);
    setDraftTotals(nextPreset.availableTroops);
    setDraftSlots(nextPreset.slots);
  }

  async function saveTotals() {
    if (!canEdit()) {
      return;
    }

    setIsSaving(true);

    try {
      const nextPreset = await api.updateFormationTotals(adminToken, selectedEventKey, draftTotals);
      applyPreset(nextPreset);
      onNotify("success", "Available troops updated.");
    } catch (error) {
      onNotify("error", getErrorMessage(error, "Unable to update available troops."));
    } finally {
      setIsSaving(false);
    }
  }

  async function addSlot() {
    if (!canEdit()) {
      return;
    }

    setIsSaving(true);

    try {
      const nextPreset = await api.createFormationSlot(adminToken, selectedEventKey, defaultSlotDraft);
      applyPreset(nextPreset);
      onNotify("success", "Formation slot added.");
    } catch (error) {
      onNotify("error", getErrorMessage(error, "Unable to add formation slot."));
    } finally {
      setIsSaving(false);
    }
  }

  async function duplicateSlot(slot: FormationSlot) {
    if (!canEdit()) {
      return;
    }

    setIsSaving(true);

    try {
      const nextPreset = await api.createFormationSlot(adminToken, selectedEventKey, {
        name: `${slot.name} copy`,
        hero: slot.hero,
        infantry: slot.infantry,
        lancer: slot.lancer,
        marksman: slot.marksman,
        notes: slot.notes
      });
      applyPreset(nextPreset);
      onNotify("success", "Formation slot duplicated.");
    } catch (error) {
      onNotify("error", getErrorMessage(error, "Unable to duplicate formation slot."));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSlot(slot: FormationSlot) {
    if (!canEdit()) {
      return;
    }

    setIsSaving(true);

    try {
      const nextPreset = await api.updateFormationSlot(adminToken, selectedEventKey, slot.id, {
        name: slot.name,
        hero: slot.hero,
        infantry: slot.infantry,
        lancer: slot.lancer,
        marksman: slot.marksman,
        notes: slot.notes,
        sortOrder: slot.sortOrder
      });
      applyPreset(nextPreset);
      onNotify("success", "Formation slot saved.");
    } catch (error) {
      onNotify("error", getErrorMessage(error, "Unable to save formation slot."));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSlot(slot: FormationSlot) {
    if (!canEdit() || !window.confirm(`Delete ${slot.name}?`)) {
      return;
    }

    setIsSaving(true);

    try {
      const nextPreset = await api.deleteFormationSlot(adminToken, selectedEventKey, slot.id);
      applyPreset(nextPreset);
      onNotify("success", "Formation slot deleted.");
    } catch (error) {
      onNotify("error", getErrorMessage(error, "Unable to delete formation slot."));
    } finally {
      setIsSaving(false);
    }
  }

  async function moveSlot(slotIndex: number, direction: -1 | 1) {
    if (!canEdit()) {
      return;
    }

    const targetIndex = slotIndex + direction;
    const currentSlot = draftSlots[slotIndex];
    const targetSlot = draftSlots[targetIndex];

    if (!currentSlot || !targetSlot) {
      return;
    }

    setIsSaving(true);

    try {
      await api.updateFormationSlot(adminToken, selectedEventKey, currentSlot.id, {
        ...currentSlot,
        sortOrder: targetSlot.sortOrder
      });
      const nextPreset = await api.updateFormationSlot(adminToken, selectedEventKey, targetSlot.id, {
        ...targetSlot,
        sortOrder: currentSlot.sortOrder
      });
      applyPreset(nextPreset);
      onNotify("success", "Formation order updated.");
    } catch (error) {
      onNotify("error", getErrorMessage(error, "Unable to reorder formation slots."));
    } finally {
      setIsSaving(false);
    }
  }

  async function resetPreset() {
    if (!canEdit() || !window.confirm(`Reset ${preset?.eventName ?? "this preset"} to the default template?`)) {
      return;
    }

    setIsSaving(true);

    try {
      const nextPreset = await api.resetFormationPreset(adminToken, selectedEventKey);
      applyPreset(nextPreset);
      onNotify("success", "Formation preset reset.");
    } catch (error) {
      onNotify("error", getErrorMessage(error, "Unable to reset formation preset."));
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
      const { blob, filename } = await api.exportFormationCsv(selectedEventKey);
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

  function canEdit() {
    if (isAdminUnlocked && adminToken.trim()) {
      return true;
    }

    onNotify("error", "Unlock the admin panel before editing troop formations.");
    return false;
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
              disabled={!isAdminUnlocked || isSaving}
              showSaveButton={isAdminUnlocked}
              onChange={setDraftTotals}
              onSave={() => void saveTotals()}
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

              {isAdminUnlocked ? (
                <div className="grid gap-3 sm:flex sm:flex-wrap">
                  <button type="button" className="secondary-button" onClick={() => void resetPreset()} disabled={isSaving}>
                    <RotateCcw className="h-4 w-4" />
                    Reset preset
                  </button>
                  <button type="button" className="primary-button" onClick={() => void addSlot()} disabled={isSaving}>
                    <Plus className="h-4 w-4" />
                    Add slot
                  </button>
                </div>
              ) : null}
            </div>

            {!isAdminUnlocked ? (
              <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                Unlock the Admin page to edit totals, slots, reset presets, or delete rows.
              </p>
            ) : null}

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
                      disabled={!isAdminUnlocked || isSaving}
                      showAdminActions={isAdminUnlocked}
                      onChange={updateSlotDraft}
                      onSave={saveSlot}
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
                  disabled={!isAdminUnlocked || isSaving}
                  showAdminActions={isAdminUnlocked}
                  onChange={updateSlotDraft}
                  onSave={saveSlot}
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
  showSaveButton,
  onChange,
  onSave
}: {
  totals: FormationTroopCounts;
  disabled: boolean;
  showSaveButton: boolean;
  onChange: (totals: FormationTroopCounts) => void;
  onSave: () => void;
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
        {showSaveButton ? (
          <button type="button" className="primary-button" onClick={onSave} disabled={disabled}>
            <Save className="h-4 w-4" />
            Save troops
          </button>
        ) : null}
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
  showAdminActions,
  onChange,
  onSave,
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
          showAdminActions={showAdminActions}
          onSave={onSave}
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
  showAdminActions: boolean;
  onChange: (slotId: string, patch: Partial<FormationSlot>) => void;
  onSave: (slot: FormationSlot) => void;
  onDuplicate: (slot: FormationSlot) => void;
  onDelete: (slot: FormationSlot) => void;
  onMove: (slotIndex: number, direction: -1 | 1) => void;
}

interface SlotActionsProps {
  slot: FormationSlot;
  index: number;
  slotCount: number;
  disabled: boolean;
  showAdminActions: boolean;
  onSave: (slot: FormationSlot) => void;
  onDuplicate: (slot: FormationSlot) => void;
  onDelete: (slot: FormationSlot) => void;
  onMove: (slotIndex: number, direction: -1 | 1) => void;
}

function SlotActions({
  slot,
  index,
  slotCount,
  disabled,
  showAdminActions,
  onSave,
  onDuplicate,
  onDelete,
  onMove
}: SlotActionsProps) {
  if (!showAdminActions) {
    return <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Locked</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="secondary-button" onClick={() => onMove(index, -1)} disabled={disabled || index === 0}>
        Up
      </button>
      <button type="button" className="secondary-button" onClick={() => onMove(index, 1)} disabled={disabled || index === slotCount - 1}>
        Down
      </button>
      <button type="button" className="secondary-button" onClick={() => onSave(slot)} disabled={disabled}>
        <Save className="h-4 w-4" />
        Save
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
