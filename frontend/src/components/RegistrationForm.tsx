import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Registration, RegistrationPayload, TroopLoadoutEntry, TroopType } from "../types/registration";

const MIN_TROOP_TIER = 7;
const MAX_TROOP_TIER = 11;
const MAX_TEXT_LENGTH = 40;
const MAX_COMMENT_LENGTH = 300;
const troopTierOptions = [7, 8, 9, 10, 11];

const troopTypeOptions: Array<{ value: TroopType; label: string; description: string }> = [
  { value: "infantry", label: "Infantry", description: "Front line / tank line" },
  { value: "lancer", label: "Lancer", description: "Cavalry / fast damage line" },
  { value: "marksman", label: "Marksman", description: "Back line / ranged damage" }
];

interface TroopLoadoutDraftEntry {
  type: TroopType | "";
  tier: number;
  count: number;
}

interface RegistrationFormState {
  nickname: string;
  partnerName: string;
  troopLoadout: [TroopLoadoutDraftEntry, TroopLoadoutDraftEntry];
  comment: string;
  isAvailable: boolean;
}

type FieldName = "nickname" | "partnerName" | "comment" | `troopLoadout.${number}.${"type" | "tier" | "count"}`;
type FieldErrors = Partial<Record<FieldName, string>>;
type TouchedState = Partial<Record<FieldName, boolean>>;

interface RegistrationFormProps {
  editingRegistration: Registration | null;
  isSubmitting: boolean;
  onSubmit: (payload: RegistrationPayload) => Promise<void>;
  onCancelEdit: () => void;
}

const defaultTroopLine = (): TroopLoadoutDraftEntry => ({
  type: "",
  tier: MIN_TROOP_TIER,
  count: 0
});

const initialState = (): RegistrationFormState => ({
  nickname: "",
  partnerName: "",
  troopLoadout: [defaultTroopLine(), defaultTroopLine()],
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
  const totalTroops = form.troopLoadout.reduce((sum, entry) => sum + Math.max(0, entry.count || 0), 0);

  useEffect(() => {
    if (editingRegistration) {
      const draftLoadout = buildDraftLoadout(editingRegistration);

      setForm({
        nickname: editingRegistration.nickname,
        partnerName: editingRegistration.partnerName,
        troopLoadout: draftLoadout,
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
        partnerName: form.partnerName.trim(),
        troopLoadout: form.troopLoadout.flatMap((entry) => {
          if (!entry.type || entry.count <= 0) {
            return [];
          }

          return [
            {
              type: entry.type,
              tier: entry.tier,
              count: entry.count
            }
          ];
        }),
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

  function updateTroopLine(index: 0 | 1, patch: Partial<TroopLoadoutDraftEntry>) {
    setForm((current) => {
      const nextLoadout = [...current.troopLoadout] as RegistrationFormState["troopLoadout"];
      nextLoadout[index] = {
        ...nextLoadout[index],
        ...patch
      };

      return {
        ...current,
        troopLoadout: nextLoadout
      };
    });
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

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Usual partner</span>
          <input
            type="text"
            value={form.partnerName}
            onChange={(event) => setForm((current) => ({ ...current, partnerName: event.target.value }))}
            onBlur={() => handleBlur("partnerName")}
            placeholder="Partner nickname"
            maxLength={MAX_TEXT_LENGTH}
            aria-invalid={Boolean(fieldErrors.partnerName) && (hasSubmitted || touched.partnerName)}
            className={getInputClassName("partnerName")}
            required
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Keep partner names consistent for cleaner stats.</span>
            <span>{form.partnerName.trim().length}/{MAX_TEXT_LENGTH}</span>
          </div>
          {renderFieldError("partnerName")}
        </label>

        <div className="md:col-span-2 rounded-2xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-100">Only count your strongest 2 troop tiers.</p>
          <p className="mt-1 text-amber-50/90">
            Kingshot marches use Infantry, Lancers, and Marksmen. Record your top two type+tier groups only.
          </p>
        </div>

        {form.troopLoadout.map((entry, index) => {
          const troopLabel = index === 0 ? "Strongest troop tier" : "Second troop tier";
          const isOptional = index === 1;
          const typeField = `troopLoadout.${index}.type` as const;
          const tierField = `troopLoadout.${index}.tier` as const;
          const countField = `troopLoadout.${index}.count` as const;

          return (
            <section
              key={index}
              className="md:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-frost">{troopLabel}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {isOptional ? "Optional. Leave empty if only one tier matters this week." : "Required."}
                  </p>
                </div>

                {isOptional ? (
                  <button
                    type="button"
                    className="secondary-button px-3 py-2 text-xs"
                    onClick={() => updateTroopLine(1, defaultTroopLine())}
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-300">Troop type</span>
                  <select
                    value={entry.type}
                    onChange={(event) =>
                      updateTroopLine(index as 0 | 1, {
                        type: event.target.value as TroopLoadoutDraftEntry["type"]
                      })
                    }
                    onBlur={() => handleBlur(typeField)}
                    aria-invalid={Boolean(fieldErrors[typeField]) && (hasSubmitted || touched[typeField])}
                    className={getInputClassName(typeField)}
                  >
                    <option value="">{isOptional ? "Unused line" : "Select troop type"}</option>
                    {troopTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {entry.type
                      ? troopTypeOptions.find((option) => option.value === entry.type)?.description
                      : "Choose Infantry, Lancer, or Marksman."}
                  </p>
                  {renderFieldError(typeField)}
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-300">Troop tier</span>
                  <select
                    value={entry.tier}
                    onChange={(event) =>
                      updateTroopLine(index as 0 | 1, {
                        tier: Number(event.target.value)
                      })
                    }
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
                    T7+ only. T11 is included for late-game War Academy progress.
                  </p>
                  {renderFieldError(tierField)}
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-slate-300">Troop count</span>
                  <input
                    type="number"
                    min={0}
                    value={entry.count}
                    onChange={(event) =>
                      updateTroopLine(index as 0 | 1, {
                        count: Math.max(0, Number(event.target.value) || 0)
                      })
                    }
                    onBlur={() => handleBlur(countField)}
                    aria-invalid={Boolean(fieldErrors[countField]) && (hasSubmitted || touched[countField])}
                    className={getInputClassName(countField)}
                    required={index === 0}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {index === 0 ? "Required." : "Set to 0 if you only want to report one tier."}
                  </p>
                  {renderFieldError(countField)}
                </label>
              </div>
            </section>
          );
        })}

        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-sm font-medium text-frost">Reported troops</p>
          <p className="mt-1 text-2xl font-semibold text-frost">{totalTroops.toLocaleString("en-US")}</p>
          <p className="mt-1 text-xs text-slate-500">Derived automatically from your strongest two troop tiers.</p>
        </div>

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

function buildDraftLoadout(registration: Registration): [TroopLoadoutDraftEntry, TroopLoadoutDraftEntry] {
  const lines = registration.troopLoadout.slice(0, 2).map((entry) => ({
    type: entry.type,
    tier: entry.tier,
    count: entry.count
  }));

  if (lines.length === 0) {
    return [
      {
        type: "",
        tier: Math.max(MIN_TROOP_TIER, Math.min(MAX_TROOP_TIER, registration.troopLevel || MIN_TROOP_TIER)),
        count: registration.troopCount
      },
      defaultTroopLine()
    ];
  }

  if (lines.length === 1) {
    return [lines[0], defaultTroopLine()];
  }

  return [lines[0], lines[1]];
}

function getFieldErrors(form: RegistrationFormState): FieldErrors {
  const errors: FieldErrors = {};
  const nicknameLength = form.nickname.trim().length;
  const partnerNameLength = form.partnerName.trim().length;
  const commentLength = form.comment.length;
  const [primary, secondary] = form.troopLoadout;

  if (nicknameLength < 2) {
    errors.nickname = "Nickname must be at least 2 characters.";
  } else if (nicknameLength > MAX_TEXT_LENGTH) {
    errors.nickname = `Nickname must be ${MAX_TEXT_LENGTH} characters or less.`;
  }

  if (partnerNameLength < 2) {
    errors.partnerName = "Partner name must be at least 2 characters.";
  } else if (partnerNameLength > MAX_TEXT_LENGTH) {
    errors.partnerName = `Partner name must be ${MAX_TEXT_LENGTH} characters or less.`;
  }

  validateTroopLine(primary, 0, errors, true);
  validateTroopLine(secondary, 1, errors, false);

  if (primary.type && secondary.type && primary.type === secondary.type && primary.tier === secondary.tier && secondary.count > 0) {
    errors["troopLoadout.1.tier"] = "Duplicate troop type+tier combinations are not allowed.";
  }

  if (commentLength > MAX_COMMENT_LENGTH) {
    errors.comment = `Comment must be ${MAX_COMMENT_LENGTH} characters or less.`;
  }

  return errors;
}

function validateTroopLine(
  entry: TroopLoadoutDraftEntry,
  index: 0 | 1,
  errors: FieldErrors,
  required: boolean
) {
  const typeField = `troopLoadout.${index}.type` as const;
  const tierField = `troopLoadout.${index}.tier` as const;
  const countField = `troopLoadout.${index}.count` as const;
  const hasAnyValue = Boolean(entry.type) || entry.count > 0;

  if (required || hasAnyValue) {
    if (!entry.type) {
      errors[typeField] = "Choose a troop type.";
    }

    if (!Number.isInteger(entry.tier) || entry.tier < MIN_TROOP_TIER || entry.tier > MAX_TROOP_TIER) {
      errors[tierField] = `Troop tier must be between T${MIN_TROOP_TIER} and T${MAX_TROOP_TIER}.`;
    }

    if (!Number.isInteger(entry.count) || entry.count < 1) {
      errors[countField] = "Troop count must be at least 1.";
    } else if (entry.count > 100000000) {
      errors[countField] = "Troop count is unrealistically high.";
    }
  }
}
