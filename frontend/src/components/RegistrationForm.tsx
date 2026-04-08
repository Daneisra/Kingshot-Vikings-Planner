import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Registration, RegistrationPayload } from "../types/registration";

const MIN_TROOP_LEVEL = 7;
const MAX_TEXT_LENGTH = 40;
const MAX_COMMENT_LENGTH = 300;

type FieldName = keyof RegistrationPayload;
type FieldErrors = Partial<Record<FieldName, string>>;
type TouchedState = Partial<Record<FieldName, boolean>>;

interface RegistrationFormProps {
  editingRegistration: Registration | null;
  isSubmitting: boolean;
  onSubmit: (payload: RegistrationPayload) => Promise<void>;
  onCancelEdit: () => void;
}

const initialState: RegistrationPayload = {
  nickname: "",
  partnerName: "",
  troopCount: 0,
  troopLevel: MIN_TROOP_LEVEL,
  comment: "",
  isAvailable: true
};

export function RegistrationForm({
  editingRegistration,
  isSubmitting,
  onSubmit,
  onCancelEdit
}: RegistrationFormProps) {
  const [form, setForm] = useState<RegistrationPayload>(initialState);
  const [formError, setFormError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [touched, setTouched] = useState<TouchedState>({});
  const nicknameInputRef = useRef<HTMLInputElement | null>(null);

  const fieldErrors = getFieldErrors(form);
  const hasValidationErrors = Object.values(fieldErrors).some(Boolean);

  useEffect(() => {
    if (editingRegistration) {
      setForm({
        nickname: editingRegistration.nickname,
        partnerName: editingRegistration.partnerName,
        troopCount: editingRegistration.troopCount,
        troopLevel: Math.max(editingRegistration.troopLevel, MIN_TROOP_LEVEL),
        comment: editingRegistration.comment ?? "",
        isAvailable: editingRegistration.isAvailable
      });
      setTouched({});
      setHasSubmitted(false);
      setFormError("");
      return;
    }

    setForm(initialState);
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
        troopCount: Number(form.troopCount),
        troopLevel: Number(form.troopLevel),
        comment: form.comment?.trim() || "",
        isAvailable: form.isAvailable
      });
      setForm(initialState);
      setTouched({});
      setHasSubmitted(false);
    } catch {
      // The parent already exposes the API error.
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

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Troop count</span>
          <input
            type="number"
            min={0}
            value={form.troopCount}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setForm((current) => ({
                ...current,
                troopCount: Number.isNaN(nextValue) ? 0 : nextValue
              }));
            }}
            onBlur={() => handleBlur("troopCount")}
            aria-invalid={Boolean(fieldErrors.troopCount) && (hasSubmitted || touched.troopCount)}
            className={getInputClassName("troopCount")}
            required
          />
          <p className="mt-2 text-xs text-slate-500">Use the total troops you plan to send this week.</p>
          {renderFieldError("troopCount")}
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Troop level</span>
          <input
            type="number"
            min={MIN_TROOP_LEVEL}
            max={100}
            value={form.troopLevel}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                troopLevel: Math.max(MIN_TROOP_LEVEL, Number(event.target.value) || MIN_TROOP_LEVEL)
              }))
            }
            onBlur={() => handleBlur("troopLevel")}
            aria-invalid={Boolean(fieldErrors.troopLevel) && (hasSubmitted || touched.troopLevel)}
            className={getInputClassName("troopLevel")}
            required
          />
          <p className="mt-2 text-xs text-slate-500">Levels below {MIN_TROOP_LEVEL} are ignored for planning.</p>
          {renderFieldError("troopLevel")}
        </label>

        <p className="md:col-span-2 rounded-2xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
          Only count your strongest 2 troop tiers. Troop level must be 7 or higher.
        </p>

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
            <span>{form.comment?.length ?? 0}/{MAX_COMMENT_LENGTH}</span>
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

function getFieldErrors(form: RegistrationPayload): FieldErrors {
  const errors: FieldErrors = {};
  const nicknameLength = form.nickname.trim().length;
  const partnerNameLength = form.partnerName.trim().length;
  const commentLength = form.comment?.length ?? 0;

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

  if (!Number.isInteger(form.troopCount) || form.troopCount < 0) {
    errors.troopCount = "Troop count must be a whole number of 0 or more.";
  } else if (form.troopCount > 100000000) {
    errors.troopCount = "Troop count is unrealistically high.";
  }

  if (!Number.isInteger(form.troopLevel) || form.troopLevel < MIN_TROOP_LEVEL) {
    errors.troopLevel = `Troop level must be ${MIN_TROOP_LEVEL} or higher.`;
  } else if (form.troopLevel > 100) {
    errors.troopLevel = "Troop level must be 100 or lower.";
  }

  if (commentLength > MAX_COMMENT_LENGTH) {
    errors.comment = `Comment must be ${MAX_COMMENT_LENGTH} characters or less.`;
  }

  return errors;
}
