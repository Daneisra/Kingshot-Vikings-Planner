import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Registration, RegistrationPayload } from "../types/registration";

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
  troopLevel: 1,
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

  useEffect(() => {
    if (editingRegistration) {
      setForm({
        nickname: editingRegistration.nickname,
        partnerName: editingRegistration.partnerName,
        troopCount: editingRegistration.troopCount,
        troopLevel: editingRegistration.troopLevel,
        comment: editingRegistration.comment ?? "",
        isAvailable: editingRegistration.isAvailable
      });
      return;
    }

    setForm(initialState);
  }, [editingRegistration]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (form.nickname.trim().length < 2 || form.partnerName.trim().length < 2) {
      setFormError("Le pseudo et le partenaire doivent contenir au moins 2 caracteres.");
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
    } catch {
      // The parent already exposes the API error.
    }
  }

  return (
    <section className="rounded-[2rem] border border-amber-400/15 bg-slate-950/70 p-6 shadow-panel backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Inscription rapide</p>
          <h2 className="mt-2 text-2xl font-semibold text-frost">
            {editingRegistration ? "Modifier une inscription" : "Ajouter un joueur"}
          </h2>
        </div>

        {editingRegistration ? (
          <button type="button" className="secondary-button" onClick={onCancelEdit}>
            Annuler
          </button>
        ) : null}
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Pseudo</span>
          <input
            type="text"
            value={form.nickname}
            onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
            placeholder="Pseudo Kingshot"
            maxLength={40}
            required
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Partenaire habituel</span>
          <input
            type="text"
            value={form.partnerName}
            onChange={(event) => setForm((current) => ({ ...current, partnerName: event.target.value }))}
            placeholder="Pseudo du partenaire"
            maxLength={40}
            required
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Nombre de troupes</span>
          <input
            type="number"
            min={0}
            value={form.troopCount}
            onChange={(event) =>
              setForm((current) => ({ ...current, troopCount: Number(event.target.value) }))
            }
            required
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-300">Niveau des troupes</span>
          <input
            type="number"
            min={1}
            max={100}
            value={form.troopLevel}
            onChange={(event) =>
              setForm((current) => ({ ...current, troopLevel: Number(event.target.value) }))
            }
            required
          />
        </label>

        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-300">Commentaire optionnel</span>
          <textarea
            rows={3}
            value={form.comment}
            onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
            placeholder="Besoin d'aide, horaires, precision tactique..."
            maxLength={300}
          />
        </label>

        <label className="md:col-span-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <span className="block text-sm font-medium text-frost">Disponible cette semaine</span>
            <span className="text-sm text-slate-400">Passe a non si tu ne peux pas participer.</span>
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
          <p className="text-sm text-slate-400">Objectif : remplir le formulaire en moins de 20 secondes.</p>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : editingRegistration ? "Mettre a jour" : "Ajouter"}
          </button>
        </div>
      </form>
    </section>
  );
}
