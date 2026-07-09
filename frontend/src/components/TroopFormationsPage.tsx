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
type TroopTier = 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
type TierInventory = Record<TroopTier, number>;
type FormationTierInventory = Record<TroopType, TierInventory>;

interface TroopAllocationEntry {
  tier: TroopTier;
  count: number;
}

type SlotTroopAllocation = Record<TroopType, TroopAllocationEntry[]>;
type SlotShortage = Record<TroopType, number>;

interface AllocationResult {
  slots: Record<string, SlotTroopAllocation>;
  shortages: Record<string, SlotShortage>;
  remainingByTier: FormationTierInventory;
}

const troopTypes: Array<{ key: TroopType; label: string }> = [
  { key: "infantry", label: "Infantry" },
  { key: "lancer", label: "Lancer" },
  { key: "marksman", label: "Marksman" }
];

const troopTiers: TroopTier[] = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7];

const defaultSlotDraft: Omit<FormationSlot, "id" | "sortOrder"> = {
  name: "New formation",
  hero: "No hero",
  infantry: 0,
  lancer: 0,
  marksman: 0,
  notes: ""
};

interface LocalFormationDraft {
  availableTroops?: FormationTroopCounts;
  availableTroopsByTier?: FormationTierInventory;
  slots: FormationSlot[];
  savedAt: string;
}

export function TroopFormationsPage({ isAdminUnlocked, adminToken, onNotify }: TroopFormationsPageProps) {
  const [summaries, setSummaries] = useState<FormationPresetSummary[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState<FormationEventKey>("vikings");
  const [preset, setPreset] = useState<FormationPreset | null>(null);
  const [draftAvailableByTier, setDraftAvailableByTier] = useState<FormationTierInventory>(createEmptyTierInventory());
  const [draftSlots, setDraftSlots] = useState<FormationSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [localSavedAt, setLocalSavedAt] = useState<string | null>(null);

  const availableTroops = useMemo(() => sumTierInventory(draftAvailableByTier), [draftAvailableByTier]);
  const assignedTroops = useMemo(() => sumSlots(draftSlots), [draftSlots]);
  const allocationResult = useMemo(
    () => allocateSlotsByTier(draftAvailableByTier, draftSlots),
    [draftAvailableByTier, draftSlots]
  );
  const remainingTroops = useMemo(
    () => sumTierInventory(allocationResult.remainingByTier),
    [allocationResult.remainingByTier]
  );
  const shortageTotals = useMemo(() => sumSlotShortages(allocationResult.shortages), [allocationResult.shortages]);
  const overAssignedTypes = troopTypes.filter(({ key }) => shortageTotals[key] > 0);

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
      availableTroopsByTier: draftAvailableByTier,
      slots: draftSlots,
      savedAt
    });
    setLocalSavedAt(savedAt);
  }, [draftAvailableByTier, draftSlots, isLoading, preset, selectedEventKey]);

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
    setDraftAvailableByTier(
      localDraft?.availableTroopsByTier ??
        convertTotalsToTierInventory(localDraft?.availableTroops ?? nextPreset.availableTroops)
    );
    setDraftSlots(localDraft?.slots ?? nextPreset.slots);
    setLocalSavedAt(localDraft?.savedAt ?? null);
  }

  function saveLocalNow() {
    const savedAt = new Date().toISOString();
    saveLocalDraft(selectedEventKey, {
      availableTroopsByTier: draftAvailableByTier,
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
    setDraftAvailableByTier(convertTotalsToTierInventory(preset.availableTroops));
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
      `Available: Infantry ${formatNumber(availableTroops.infantry)} / Lancer ${formatNumber(availableTroops.lancer)} / Marksman ${formatNumber(availableTroops.marksman)}`,
      `Assigned: Infantry ${formatNumber(assignedTroops.infantry)} / Lancer ${formatNumber(assignedTroops.lancer)} / Marksman ${formatNumber(assignedTroops.marksman)}`,
      `Remaining: Infantry ${formatNumber(remainingTroops.infantry)} / Lancer ${formatNumber(remainingTroops.lancer)} / Marksman ${formatNumber(remainingTroops.marksman)}`,
      "",
      "Auto allocation:",
      ...draftSlots.map((slot) => `${slot.name}: ${formatSlotAllocation(allocationResult.slots[slot.id], allocationResult.shortages[slot.id])}`)
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
        availableTroopsByTier: draftAvailableByTier,
        slots: draftSlots,
        allocationResult
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
              Track available Infantry, Lancer, and Marksman troops by tier, define formation needs, and let the
              planner assign your strongest available troops first.
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
              inventory={draftAvailableByTier}
              disabled={isSaving}
              onChange={setDraftAvailableByTier}
            />

            <FormationSummaryPanel
              assigned={assignedTroops}
              remaining={remainingTroops}
              shortageTotals={shortageTotals}
              overAssignedTypes={overAssignedTypes.map((troopType) => troopType.label)}
            />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-amber-300">{preset.eventName} slots</p>
                <h2 className="mt-2 text-xl font-semibold text-frost">Editable formation plan</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Enter the troop counts each slot needs. Auto allocation follows the slot order and consumes your
                  strongest available tiers first.
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

            <div className="mt-5 grid gap-4">
              {draftSlots.map((slot, index) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  index={index}
                  slotCount={draftSlots.length}
                  disabled={isSaving}
                  allocation={allocationResult.slots[slot.id]}
                  shortage={allocationResult.shortages[slot.id]}
                  onChange={updateSlotDraft}
                  onDuplicate={duplicateSlot}
                  onDelete={deleteSlot}
                  onMove={moveSlot}
                />
              ))}
              <RemainderCard remaining={remainingTroops} remainingByTier={allocationResult.remainingByTier} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function AvailableTroopsPanel({
  inventory,
  disabled,
  onChange
}: {
  inventory: FormationTierInventory;
  disabled: boolean;
  onChange: (inventory: FormationTierInventory) => void;
}) {
  const totals = sumTierInventory(inventory);
  const [expandedTroopTypes, setExpandedTroopTypes] = useState<Record<TroopType, boolean>>({
    infantry: false,
    lancer: false,
    marksman: false
  });

  function updateTierCount(troopType: TroopType, tier: TroopTier, count: number) {
    onChange({
      ...inventory,
      [troopType]: {
        ...inventory[troopType],
        [tier]: count
      }
    });
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel">
      <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Available troops</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Enter your troops by tier. The formation planner consumes the strongest tiers first, from T16 down to T7.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {troopTypes.map(({ key, label }) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-frost">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-frost">{formatNumber(totals[key])}</p>
              </div>
              <button
                type="button"
                className="secondary-button px-3 py-2 text-xs"
                onClick={() =>
                  setExpandedTroopTypes((current) => ({
                    ...current,
                    [key]: !current[key]
                  }))
                }
              >
                {expandedTroopTypes[key] ? "Hide tiers" : "Edit tiers"}
              </button>
            </div>
            <p className="mt-3 min-h-10 text-sm leading-5 text-slate-400">{formatTierSummary(inventory[key])}</p>
            {expandedTroopTypes[key] ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-2 xl:grid-cols-5">
                {troopTiers.map((tier) => (
                  <label key={tier} className="min-w-0">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      T{tier}
                    </span>
                    <NumericInput
                      value={inventory[key][tier]}
                      disabled={disabled}
                      onChange={(value) => updateTierCount(key, tier, value)}
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>
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
  shortageTotals,
  overAssignedTypes
}: {
  assigned: FormationTroopCounts;
  remaining: FormationTroopCounts;
  shortageTotals: FormationTroopCounts;
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
          Shortage: {overAssignedTypes.join(", ")}. Missing Infantry {formatNumber(shortageTotals.infantry)} / Lancer{" "}
          {formatNumber(shortageTotals.lancer)} / Marksman {formatNumber(shortageTotals.marksman)}.
        </p>
      ) : (
        <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          No shortage detected.
        </p>
      )}
    </section>
  );
}

function SlotCard(props: SlotEditorProps) {
  const { slot, disabled, allocation, shortage, onChange } = props;
  const total = getSlotTotal(slot);

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:max-w-md">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Name</span>
            <TextInput value={slot.name} disabled={disabled} onChange={(value) => onChange(slot.id, { name: value })} />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Hero</span>
            <TextInput value={slot.hero} disabled={disabled} onChange={(value) => onChange(slot.id, { hero: value })} />
          </label>
        </div>
        <SlotActions {...props} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Needs</p>
            <p className="text-sm font-semibold text-frost">Total {formatNumber(total)}</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {troopTypes.map(({ key, label }) => (
              <label key={key}>
                <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
                <NumericInput value={slot[key]} disabled={disabled} onChange={(value) => onChange(slot.id, { [key]: value })} />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{formatSlotRatios(slot)}</p>
        </div>

        <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Auto allocation</p>
          <div className="mt-3">
            <AllocationSummary allocation={allocation} shortage={shortage} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</span>
          <TextInput value={slot.notes} disabled={disabled} onChange={(value) => onChange(slot.id, { notes: value })} />
        </label>
      </div>
    </article>
  );
}

interface SlotEditorProps {
  slot: FormationSlot;
  index: number;
  slotCount: number;
  disabled: boolean;
  allocation: SlotTroopAllocation;
  shortage: SlotShortage;
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
      <button
        type="button"
        className="secondary-button h-10 min-w-10 px-3 text-sm"
        title="Move up"
        onClick={() => onMove(index, -1)}
        disabled={disabled || index === 0}
      >
        ↑
      </button>
      <button
        type="button"
        className="secondary-button h-10 min-w-10 px-3 text-sm"
        title="Move down"
        onClick={() => onMove(index, 1)}
        disabled={disabled || index === slotCount - 1}
      >
        ↓
      </button>
      <button
        type="button"
        className="secondary-button h-10 min-w-10 px-3 text-sm"
        title="Duplicate"
        onClick={() => onDuplicate(slot)}
        disabled={disabled}
      >
        Copy
      </button>
      <button
        type="button"
        className="danger-button h-10 min-w-10 px-3 text-sm"
        title="Delete"
        onClick={() => onDelete(slot)}
        disabled={disabled}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AllocationSummary({ allocation, shortage }: { allocation: SlotTroopAllocation; shortage: SlotShortage }) {
  const hasAllocation = troopTypes.some(({ key }) => allocation[key].length > 0);
  const hasShortage = troopTypes.some(({ key }) => shortage[key] > 0);

  if (!hasAllocation && !hasShortage) {
    return <p className="text-sm text-slate-500">No troops assigned</p>;
  }

  return (
    <div className="space-y-3">
      {troopTypes.map(({ key, label }) => {
        const allocationEntries = allocation[key];
        const shortageCount = shortage[key];

        if (allocationEntries.length === 0 && shortageCount <= 0) {
          return null;
        }

        return (
          <div key={key} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
            {allocationEntries.map((entry) => (
              <span
                key={`${key}-${entry.tier}`}
                className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-50"
              >
                {formatNumber(entry.count)} T{entry.tier}
              </span>
            ))}
            {shortageCount > 0 ? (
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-100">
                Shortage: {formatNumber(shortageCount)} {label}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RemainderCard({
  remaining,
  remainingByTier
}: {
  remaining: FormationTroopCounts;
  remainingByTier: FormationTierInventory;
}) {
  return (
    <article className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Remainder</p>
          <p className="mt-2 text-sm text-amber-50/85">Calculated automatically after all slots consume troops.</p>
        </div>
        <p className="text-2xl font-semibold text-frost">{formatNumber(getTotal(remaining))}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {troopTypes.map(({ key, label }) => (
          <SummaryPill key={key} label={label} value={formatNumber(remaining[key])} />
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">{formatRemainingByTier(remainingByTier)}</p>
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

function createEmptyTierInventory(): FormationTierInventory {
  return troopTypes.reduce((inventory, { key }) => {
    inventory[key] = troopTiers.reduce((tiers, tier) => {
      tiers[tier] = 0;
      return tiers;
    }, {} as TierInventory);
    return inventory;
  }, {} as FormationTierInventory);
}

function convertTotalsToTierInventory(totals: FormationTroopCounts): FormationTierInventory {
  const inventory = createEmptyTierInventory();

  for (const { key } of troopTypes) {
    inventory[key][7] = normalizeCount(totals[key]);
  }

  return inventory;
}

function cloneTierInventory(inventory: FormationTierInventory): FormationTierInventory {
  return troopTypes.reduce((nextInventory, { key }) => {
    nextInventory[key] = troopTiers.reduce((tiers, tier) => {
      tiers[tier] = normalizeCount(inventory[key]?.[tier] ?? 0);
      return tiers;
    }, {} as TierInventory);
    return nextInventory;
  }, {} as FormationTierInventory);
}

function sumTierInventory(inventory: FormationTierInventory): FormationTroopCounts {
  return troopTypes.reduce(
    (totals, { key }) => {
      totals[key] = troopTiers.reduce((total, tier) => total + normalizeCount(inventory[key]?.[tier] ?? 0), 0);
      return totals;
    },
    { infantry: 0, lancer: 0, marksman: 0 } as FormationTroopCounts
  );
}

function sumSlotShortages(shortages: Record<string, SlotShortage>): FormationTroopCounts {
  return Object.values(shortages).reduce(
    (totals, shortage) => {
      for (const { key } of troopTypes) {
        totals[key] += shortage[key];
      }

      return totals;
    },
    { infantry: 0, lancer: 0, marksman: 0 } as FormationTroopCounts
  );
}

function allocateSlotsByTier(availableByTier: FormationTierInventory, slots: FormationSlot[]): AllocationResult {
  const remainingByTier = cloneTierInventory(availableByTier);
  const slotAllocations: Record<string, SlotTroopAllocation> = {};
  const slotShortages: Record<string, SlotShortage> = {};

  for (const slot of slots) {
    const allocation = createEmptySlotAllocation();
    const shortage = createEmptySlotShortage();

    for (const { key } of troopTypes) {
      let requestedCount = normalizeCount(slot[key]);

      for (const tier of troopTiers) {
        if (requestedCount <= 0) {
          break;
        }

        const availableCount = remainingByTier[key][tier];
        const allocatedCount = Math.min(availableCount, requestedCount);

        if (allocatedCount > 0) {
          allocation[key].push({ tier, count: allocatedCount });
          remainingByTier[key][tier] -= allocatedCount;
          requestedCount -= allocatedCount;
        }
      }

      shortage[key] = requestedCount;
    }

    slotAllocations[slot.id] = allocation;
    slotShortages[slot.id] = shortage;
  }

  return {
    slots: slotAllocations,
    shortages: slotShortages,
    remainingByTier
  };
}

function createEmptySlotAllocation(): SlotTroopAllocation {
  return troopTypes.reduce((allocation, { key }) => {
    allocation[key] = [];
    return allocation;
  }, {} as SlotTroopAllocation);
}

function createEmptySlotShortage(): SlotShortage {
  return troopTypes.reduce((shortage, { key }) => {
    shortage[key] = 0;
    return shortage;
  }, {} as SlotShortage);
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

function formatAllocationEntries(entries: TroopAllocationEntry[]) {
  if (entries.length === 0) {
    return "None";
  }

  return entries.map((entry) => `T${entry.tier} ${formatNumber(entry.count)}`).join(", ");
}

function formatTierSummary(inventory: TierInventory) {
  const nonEmptyTiers = troopTiers
    .filter((tier) => inventory[tier] > 0)
    .map((tier) => `T${tier} ${formatNumber(inventory[tier])}`);

  return nonEmptyTiers.length > 0 ? nonEmptyTiers.join(" · ") : "No troops entered yet.";
}

function formatSlotAllocation(allocation: SlotTroopAllocation, shortage: SlotShortage) {
  return troopTypes
    .map(({ key, label }) => {
      const allocationText = formatAllocationEntries(allocation[key]);
      const shortageText = shortage[key] > 0 ? ` / short ${formatNumber(shortage[key])}` : "";
      return `${label} ${allocationText}${shortageText}`;
    })
    .join(" | ");
}

function formatRemainingByTier(inventory: FormationTierInventory) {
  const details = troopTypes
    .map(({ key, label }) => {
      const tierDetails = troopTiers
        .filter((tier) => inventory[key][tier] > 0)
        .map((tier) => `T${tier} ${formatNumber(inventory[key][tier])}`)
        .join(", ");

      return tierDetails ? `${label}: ${tierDetails}` : "";
    })
    .filter(Boolean);

  return details.length > 0 ? details.join(" / ") : "No troops remaining by tier.";
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

    if (!Array.isArray(parsedDraft.slots)) {
      return null;
    }

    const availableTroopsByTier = isValidTierInventory(parsedDraft.availableTroopsByTier)
      ? normalizeTierInventory(parsedDraft.availableTroopsByTier)
      : convertTotalsToTierInventory(
          isValidTroopCounts(parsedDraft.availableTroops)
            ? parsedDraft.availableTroops
            : { infantry: 0, lancer: 0, marksman: 0 }
        );

    return {
      availableTroopsByTier,
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

function normalizeTierInventory(inventory: FormationTierInventory): FormationTierInventory {
  return cloneTierInventory(inventory);
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

function isValidTierInventory(value: unknown): value is FormationTierInventory {
  if (!value || typeof value !== "object") {
    return false;
  }

  const inventory = value as FormationTierInventory;
  return troopTypes.every(({ key }) => {
    const tierInventory = inventory[key];

    if (!tierInventory || typeof tierInventory !== "object") {
      return false;
    }

    return troopTiers.every((tier) => Number.isFinite(tierInventory[tier]));
  });
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
  availableTroopsByTier,
  slots,
  allocationResult
}: {
  eventName: string;
  eventKey: FormationEventKey;
  availableTroopsByTier: FormationTierInventory;
  slots: FormationSlot[];
  allocationResult: AllocationResult;
}) {
  const availableTroops = sumTierInventory(availableTroopsByTier);
  const assigned = sumSlots(slots);
  const remaining = sumTierInventory(allocationResult.remainingByTier);
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
    ["Available By Tier"],
    ["Troop Type", ...troopTiers.map((tier) => `T${tier}`), "Total"],
    ...troopTypes.map(({ key, label }) => [
      label,
      ...troopTiers.map((tier) => availableTroopsByTier[key][tier]),
      availableTroops[key]
    ]),
    [""],
    [
      "Name",
      "Hero",
      "Infantry",
      "Lancer",
      "Marksman",
      "Total",
      "Infantry Ratio",
      "Lancer Ratio",
      "Marksman Ratio",
      "Auto Allocation",
      "Notes"
    ],
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
        formatSlotAllocation(allocationResult.slots[slot.id], allocationResult.shortages[slot.id]),
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
      formatRemainingByTier(allocationResult.remainingByTier),
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
