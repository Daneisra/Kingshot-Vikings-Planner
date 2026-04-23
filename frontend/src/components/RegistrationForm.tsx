import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Registration, RegistrationPayload, TroopLoadoutEntry, TroopType } from "../types/registration";

const MIN_TROOP_TIER = 7;
const MAX_TROOP_TIER = 11;
const MAX_TEXT_LENGTH = 40;
const MAX_COMMENT_LENGTH = 300;
const MAX_PERSONAL_SCORE = 1000000000;
const troopTierOptions = [7, 8, 9, 10, 11];
const troopTypeLabels: Record<TroopType, string> = {
  infantry: "Infantry",
  lancer: "Lancer",
  marksman: "Marksman"
};
const troopTypeOrder: TroopType[] = ["infantry", "lancer", "marksman"];

interface TierGroupDraft {
  tier: number;
  infantry: number;
  lancer: number;
  marksman: number;
}

interface RegistrationFormState {
  nickname: string;
  partnerInput: string;
  partnerNames: string[];
  tierGroups: [TierGroupDraft, TierGroupDraft];
  personalScore: string;
  comment: string;
  isAvailable: boolean;
}

type TierFieldName =
  | `tierGroups.${number}.tier`
  | `tierGroups.${number}.infantry`
  | `tierGroups.${number}.lancer`
  | `tierGroups.${number}.marksman`;

type FieldName = "nickname" | "partnerInput" | "partnerNames" | "personalScore" | "comment" | TierFieldName;
type FieldErrors = Partial<Record<FieldName, string>>;
type TouchedState = Partial<Record<FieldName, boolean>>;

interface RegistrationFormProps {
  editingRegistration: Registration | null;
  isSubmitting: boolean;
  onSubmit: (payload: RegistrationPayload) => Promise<void>;
  onCancelEdit: () => void;
}

const defaultTierGroup = (): TierGroupDraft => ({
  tier: MIN_TROOP_TIER,
  infantry: 0,
  lancer: 0,
  marksman: 0
});

const initialState = (): RegistrationFormState => ({
  nickname: "",
  partnerInput: "",
  partnerNames: [],
  tierGroups: [defaultTierGroup(), defaultTierGroup()],
  personalScore: "",
  comment: "",
  isAvailable: true
});

export function RegistrationForm({
  editingRegistration,
  isSubmitting,
  onSubmit,
  onCancelEdit
}: RegistrationFormProps) {
  const [form, setForm] = useState<RegistrationFormState>(initialState);
  const [formError, setFormError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [touched, setTouched] = useState<TouchedState>({});
  const nicknameInputRef = useRef<HTMLInputElement | null>(null);

  const fieldErrors = useMemo(() => getFieldErrors(form), [form]);
  const hasValidationErrors = Object.values(fieldErrors).some(Boolean);
  const totalTroops = form.tierGroups.reduce(
    (sum, group) => sum + group.infantry + group.lancer + group.marksman,
    0
  );

  useEffect(() => {
    if (editingRegistration) {
      setForm({
        nickname: editingRegistration.nickname,
        partnerInput: "",
        partnerNames: buildPartnerNames(editingRegistration),
        tierGroups: buildTierGroups(editingRegistration),
        personalScore: editingRegistration.personalScore === null ? "" : String(editingRegistration.personalScore),
        comment: editingRegistration.comment ?? "",
        isAvailable: editingRegistration.isAvailable
      });
      setTouched({});
      setHasSubmitted(false);
      setFormError("");
      return;
    }

    setForm(initialState());
    setTouched({});
    setHasSubmitted(false);
    setFormError("");
  }, [editingRegistration]);

  useEffect(() => {
    if (!editingRegistration) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      nicknameInputRef.current?.focus();
      nicknameInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [editingRegistration]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setHasSubmitted(true);

    if (hasValidationErrors) {
      setFormError("Please fix the highlighted fields before submitting.");
      return;
    }

    try {
      await onSubmit({
        nickname: form.nickname.trim(),
        partnerNames: form.partnerNames,
        troopLoadout: flattenTierGroups(form.tierGroups),
        personalScore: form.personalScore.trim() ? Number(form.personalScore) : null,
        comment: form.comment.trim(),
        isAvailable: form.isAvailable
      });

      setForm(initialState());
      setTouched({});
      setHasSubmitted(false);
    } catch {
      // Parent exposes the API error.
    }
  }

  function handleBlur(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function getInputClassName(field: FieldName) {
    const shouldShowError = Boolean(fieldErrors[field]) && (hasSubmitted || touched[field]);
    return shouldShowError
      ? "border-rose-400/40 bg-rose-500/5 focus:border-rose-400/60 focus:ring-rose-400/15"
      : "";
  }

  function renderFieldError(field: FieldName) {
    const message = fieldErrors[field];
    const shouldShowError = Boolean(message) && (hasSubmitted || touched[field]);

    if (!shouldShowError || !message) {
      return null;
    }

    return <p className="mt-2 text-xs text-rose-300">{message}</p>;
  }

  function updateTierGroup(index: 0 | 1, patch: Partial<TierGroupDraft>) {
    setForm((current) => {
      const nextTierGroups = [...current.tierGroups] as RegistrationFormState["tierGroups"];
      nextTierGroups[index] = {
        ...nextTierGroups[index],
        ...patch
      };

      return {
        ...current,
        tierGroups: nextTierGroups
      };
    });
  }

  function addPartner() {
    const nextPartnerName = form.partnerInput.trim();

    if (!nextPartnerName) {
      setTouched((current) => ({ ...current, partnerInput: true, partnerNames: true }));
      return;
    }

    if (nextPartnerName.length < 2 || nextPartnerName.length > MAX_TEXT_LENGTH) {
      setTouched((current) => ({ ...current, partnerInput: true, partnerNames: true }));
      return;
    }

    if (form.partnerNames.some((partnerName) => partnerName.toLowerCase() === nextPartnerName.toLowerCase())) {
      setFormError("That partner is already in the list.");
      return;
    }

    if (form.partnerNames.length >= 4) {
      setFormError("Use up to 4 regular partners.");
      return;
    }

    setFormError("");
    setForm((current) => ({
      ...current,
      partnerInput: "",
      partnerNames: [...current.partnerNames, nextPartnerName]
    }));
    setTouched((current) => ({ ...current, partnerInput: true, partnerNames: true }));
  }

  function removePartner(partnerNameToRemove: string) {
    setForm((current) => ({
      ...current,
      partnerNames: current.partnerNames.filter((partnerName) => partnerName !== partnerNameToRemove)
    }));
    setTouched((current) => ({ ...current, partnerNames: true }));
  }

  return (
    <section className="rounded-[2rem] border border-amber-400/15 bg-slate-950/70 p-6 shadow-panel backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Quick Sign-Up</p>
          <h2 className="mt-2 text-2xl font-semibold text-frost">
            {editingRegistration ? "Edit registration" : "Add a player"}
          </h2>
          {editingRegistration ? (
            <p className="mt-2 text-sm text-slate-300">
              Editing <span className="font-semibold text-frost">{editingRegistration.nickname}</span>. Update the
              fields below or cancel to return to the list.
            </p>
          ) : null}
        </div>

        {editingRegistration ? (
          <button type="button" className="secondary-button" onClick={onCancelEdit}>
            Cancel
          </button>
        ) : null}
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Nickname</span>
          <input
            ref={nicknameInputRef}
            type="text"
            value={form.nickname}
            onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
            onBlur={() => handleBlur("nickname")}
            placeholder="Kingshot nickname"
            maxLength={MAX_TEXT_LENGTH}
            aria-invalid={Boolean(fieldErrors.nickname) && (hasSubmitted || touched.nickname)}
            className={getInputClassName("nickname")}
            required
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Use the exact in-game nickname.</span>
            <span>{form.nickname.trim().length}/{MAX_TEXT_LENGTH}</span>
          </div>
          {renderFieldError("nickname")}
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-300">Regular partners</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.partnerInput}
              onChange={(event) => {
                setFormError("");
                setForm((current) => ({ ...current, partnerInput: event.target.value }));
              }}
              onBlur={() => handleBlur("partnerInput")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addPartner();
                }
              }}
              placeholder="Partner nickname"
              maxLength={MAX_TEXT_LENGTH}
              aria-invalid={Boolean(fieldErrors.partnerNames) && (hasSubmitted || touched.partnerNames)}
              className={getInputClassName("partnerNames")}
            />
            <button type="button" className="secondary-button shrink-0" onClick={addPartner}>
              Add
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Add up to 4 partners. The first one becomes the primary partner.</span>
            <span>{form.partnerInput.trim().length}/{MAX_TEXT_LENGTH}</span>
          </div>
          {form.partnerNames.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.partnerNames.map((partnerName, index) => (
                <div
                  key={partnerName}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-frost"
                >
                  <span>{partnerName}</span>
                  {index === 0 ? (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                      Primary
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1 text-xs text-slate-300"
                    onClick={() => removePartner(partnerName)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {renderFieldError("partnerNames")}
        </div>

        <div className="md:col-span-2 rounded-2xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-100">Only count your strongest 2 troop tiers.</p>
          <p className="mt-1 text-amber-50/90">
            For each tier block, enter one common tier and the counts for Infantry, Lancers, and Marksmen.
          </p>
        </div>

        {form.tierGroups.map((group, index) => {
          const isOptional = index === 1;
          const troopBlockLabel = index === 0 ? "Strongest troop tier" : "Second troop tier";
          const tierField = `tierGroups.${index}.tier` as const;
          const groupTotal = group.infantry + group.lancer + group.marksman;

          return (
            <section key={index} className="md:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-frost">{troopBlockLabel}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {isOptional ? "Optional. Leave all troop counts at 0 if unused." : "Required."}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Block Total</p>
                  <p className="mt-1 text-lg font-semibold text-frost">{groupTotal.toLocaleString("en-US")}</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <label className="w-full max-w-[180px] rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Tier
                    </span>
                    <select
                      value={group.tier}
                      onChange={(event) => updateTierGroup(index as 0 | 1, { tier: Number(event.target.value) })}
                      onBlur={() => handleBlur(tierField)}
                      aria-invalid={Boolean(fieldErrors[tierField]) && (hasSubmitted || touched[tierField])}
                      className={getInputClassName(tierField)}
                    >
                      {troopTierOptions.map((tier) => (
                        <option key={tier} value={tier}>
                          T{tier}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      T7+ only. T11 is available for late-game War Academy players.
                    </p>
                    {renderFieldError(tierField)}
                  </label>
                </div>

                <div className="space-y-3">
                  {troopTypeOrder.map((troopType) => {
                    const field = `tierGroups.${index}.${troopType}` as const;

                    return (
                      <label
                        key={troopType}
                        className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center"
                      >
                        <div>
                          <span className="block text-sm font-medium text-slate-200">{troopTypeLabels[troopType]}</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {isOptional ? "0 if unused in this tier." : "Count for this troop type."}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <input
                            type="number"
                            min={0}
                            value={group[troopType]}
                            onChange={(event) =>
                              updateTierGroup(index as 0 | 1, {
                                [troopType]: Math.max(0, Number(event.target.value) || 0)
                              } as Partial<TierGroupDraft>)
                            }
                            onBlur={() => handleBlur(field)}
                            aria-invalid={Boolean(fieldErrors[field]) && (hasSubmitted || touched[field])}
                            className={getInputClassName(field)}
                          />
                          {renderFieldError(field)}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-sm font-medium text-frost">Reported troops</p>
          <p className="mt-1 text-2xl font-semibold text-frost">{totalTroops.toLocaleString("en-US")}</p>
          <p className="mt-1 text-xs text-slate-500">Derived automatically from your strongest two tier blocks.</p>
        </div>

        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-300">Personal event score</span>
          <input
            type="number"
            min={0}
            max={MAX_PERSONAL_SCORE}
            value={form.personalScore}
            onChange={(event) => setForm((current) => ({ ...current, personalScore: event.target.value }))}
            onBlur={() => handleBlur("personalScore")}
            placeholder="Optional score after the event"
            aria-invalid={Boolean(fieldErrors.personalScore) && (hasSubmitted || touched.personalScore)}
            className={getInputClassName("personalScore")}
          />
          <p className="mt-2 text-xs text-slate-500">
            Optional. Fill it after Viking Vengeance to compare your score across archived weeks.
          </p>
          {renderFieldError("personalScore")}
        </label>

        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-300">Optional comment</span>
          <textarea
            rows={3}
            value={form.comment}
            onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
            onBlur={() => handleBlur("comment")}
            placeholder="Need help, timing, tactical details..."
            maxLength={MAX_COMMENT_LENGTH}
            aria-invalid={Boolean(fieldErrors.comment) && (hasSubmitted || touched.comment)}
            className={getInputClassName("comment")}
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Optional. Keep it short and tactical.</span>
            <span>{form.comment.length}/{MAX_COMMENT_LENGTH}</span>
          </div>
          {renderFieldError("comment")}
        </label>

        <label className="md:col-span-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <span className="block text-sm font-medium text-frost">Available this week</span>
            <span className="text-sm text-slate-400">Switch to no if you cannot participate.</span>
          </div>

          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, isAvailable: !current.isAvailable }))}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition ${
              form.isAvailable ? "bg-emerald-500/80" : "bg-slate-700"
            }`}
          >
            <span
              className={`inline-block h-8 w-8 rounded-full bg-white transition ${
                form.isAvailable ? "translate-x-11" : "translate-x-1"
              }`}
            />
          </button>
        </label>

        {formError ? <p className="md:col-span-2 text-sm text-rose-300">{formError}</p> : null}

        <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Goal: submit the form in under 20 seconds.
            {hasValidationErrors ? " Required fields update live as you type." : ""}
          </p>
          <button type="submit" className="primary-button" disabled={isSubmitting || hasValidationErrors}>
            {isSubmitting ? "Saving..." : editingRegistration ? "Update" : "Add"}
          </button>
        </div>
      </form>
    </section>
  );
}

function buildTierGroups(registration: Registration): [TierGroupDraft, TierGroupDraft] {
  if (registration.troopLoadout.length === 0) {
    return [
      {
        tier: Math.max(MIN_TROOP_TIER, Math.min(MAX_TROOP_TIER, registration.troopLevel || MIN_TROOP_TIER)),
        infantry: registration.troopCount,
        lancer: 0,
        marksman: 0
      },
      defaultTierGroup()
    ];
  }

  const groupedByTier = new Map<number, TierGroupDraft>();

  for (const entry of registration.troopLoadout) {
    const currentGroup = groupedByTier.get(entry.tier) ?? {
      tier: entry.tier,
      infantry: 0,
      lancer: 0,
      marksman: 0
    };

    currentGroup[entry.type] += entry.count;
    groupedByTier.set(entry.tier, currentGroup);
  }

  const orderedGroups = Array.from(groupedByTier.values())
    .sort((left, right) => right.tier - left.tier)
    .slice(0, 2);

  if (orderedGroups.length === 1) {
    return [orderedGroups[0], defaultTierGroup()];
  }

  return [orderedGroups[0] ?? defaultTierGroup(), orderedGroups[1] ?? defaultTierGroup()];
}

function buildPartnerNames(registration: Registration) {
  if (registration.partnerNames.length > 0) {
    return registration.partnerNames;
  }

  if (registration.partnerName.trim()) {
    return [registration.partnerName.trim()];
  }

  return [];
}

function flattenTierGroups(tierGroups: [TierGroupDraft, TierGroupDraft]): TroopLoadoutEntry[] {
  return tierGroups.flatMap((group) =>
    troopTypeOrder.flatMap((troopType) => {
      const count = group[troopType];

      if (count <= 0) {
        return [];
      }

      return [
        {
          type: troopType,
          tier: group.tier,
          count
        }
      ];
    })
  );
}

function getFieldErrors(form: RegistrationFormState): FieldErrors {
  const errors: FieldErrors = {};
  const nicknameLength = form.nickname.trim().length;
  const commentLength = form.comment.length;
  const personalScoreValue = form.personalScore.trim();
  const [primaryGroup, secondaryGroup] = form.tierGroups;
  const primaryTotal = getTierGroupTotal(primaryGroup);
  const secondaryTotal = getTierGroupTotal(secondaryGroup);

  if (nicknameLength < 2) {
    errors.nickname = "Nickname must be at least 2 characters.";
  } else if (nicknameLength > MAX_TEXT_LENGTH) {
    errors.nickname = `Nickname must be ${MAX_TEXT_LENGTH} characters or less.`;
  }

  if (form.partnerNames.length < 1) {
    errors.partnerNames = "Add at least one regular partner.";
  } else if (form.partnerNames.length > 4) {
    errors.partnerNames = "Use up to 4 regular partners.";
  }

  const duplicatePartnerNames = new Set<string>();

  form.partnerNames.forEach((partnerName) => {
    const normalizedPartnerName = partnerName.trim().toLowerCase();

    if (duplicatePartnerNames.has(normalizedPartnerName)) {
      errors.partnerNames = "Duplicate partners are not allowed.";
    }

    duplicatePartnerNames.add(normalizedPartnerName);

    if (partnerName.trim().length < 2 || partnerName.trim().length > MAX_TEXT_LENGTH) {
      errors.partnerNames = `Each partner must be between 2 and ${MAX_TEXT_LENGTH} characters.`;
    }
  });

  validateTierGroup(primaryGroup, 0, errors, true);
  validateTierGroup(secondaryGroup, 1, errors, false);

  if (primaryTotal > 0 && secondaryTotal > 0 && primaryGroup.tier === secondaryGroup.tier) {
    errors["tierGroups.1.tier"] = "Use two different tiers. Do not repeat the same tier twice.";
  }

  if (commentLength > MAX_COMMENT_LENGTH) {
    errors.comment = `Comment must be ${MAX_COMMENT_LENGTH} characters or less.`;
  }

  if (personalScoreValue) {
    const numericPersonalScore = Number(personalScoreValue);

    if (!Number.isInteger(numericPersonalScore) || numericPersonalScore < 0) {
      errors.personalScore = "Personal score must be a whole number greater than or equal to 0.";
    } else if (numericPersonalScore > MAX_PERSONAL_SCORE) {
      errors.personalScore = "Personal score is unrealistically high.";
    }
  }

  return errors;
}

function validateTierGroup(
  group: TierGroupDraft,
  index: 0 | 1,
  errors: FieldErrors,
  required: boolean
) {
  const tierField = `tierGroups.${index}.tier` as const;
  const total = getTierGroupTotal(group);

  if (!Number.isInteger(group.tier) || group.tier < MIN_TROOP_TIER || group.tier > MAX_TROOP_TIER) {
    errors[tierField] = `Troop tier must be between T${MIN_TROOP_TIER} and T${MAX_TROOP_TIER}.`;
  }

  troopTypeOrder.forEach((troopType) => {
    const field = `tierGroups.${index}.${troopType}` as const;
    const count = group[troopType];

    if (!Number.isInteger(count) || count < 0) {
      errors[field] = "Troop count must be 0 or higher.";
    } else if (count > 100000000) {
      errors[field] = "Troop count is unrealistically high.";
    }
  });

  if (required && total < 1) {
    errors["tierGroups.0.infantry"] = "Enter at least one troop count in the strongest tier block.";
  }
}

function getTierGroupTotal(group: TierGroupDraft) {
  return group.infantry + group.lancer + group.marksman;
}
