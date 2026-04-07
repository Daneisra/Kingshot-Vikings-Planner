import { Pencil, Trash2, Users } from "lucide-react";
import type { Registration } from "../types/registration";

interface RegistrationListProps {
  registrations: Registration[];
  isLoading: boolean;
  isAdminUnlocked: boolean;
  onEdit: (registration: Registration) => void;
  onDelete: (registration: Registration) => void;
}

function formatAvailabilityLabel(isAvailable: boolean) {
  return isAvailable ? "Disponible pour la semaine" : "Indisponible pour cette rotation";
}

export function RegistrationList({
  registrations,
  isLoading,
  isAdminUnlocked,
  onEdit,
  onDelete
}: RegistrationListProps) {
  if (isLoading) {
    return (
      <section className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/5"
          />
        ))}
      </section>
    );
  }

  if (registrations.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center shadow-panel">
        <Users className="mx-auto h-10 w-10 text-slate-400" />
        <h3 className="mt-4 text-xl font-semibold text-frost">Aucune inscription ne correspond</h3>
        <p className="mt-2 text-slate-400">
          Ajoute un joueur ou ajuste les filtres pour afficher la liste de la semaine.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      {registrations.map((registration) => (
        <article
          key={registration.id}
          className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-panel backdrop-blur"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-semibold text-frost">{registration.nickname}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    registration.isAvailable
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-rose-500/15 text-rose-200"
                  }`}
                >
                  {registration.isAvailable ? "Disponible" : "Absent"}
                </span>
              </div>

              <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                <p>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Partenaire</span>
                  {registration.partnerName}
                </p>
                <p>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Troupes</span>
                  {registration.troopCount.toLocaleString("fr-FR")}
                </p>
                <p>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Niveau</span>
                  {registration.troopLevel}
                </p>
                <p>
                  <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Statut</span>
                  {formatAvailabilityLabel(registration.isAvailable)}
                </p>
              </div>

              {registration.comment ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  {registration.comment}
                </p>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button type="button" className="secondary-button" onClick={() => onEdit(registration)}>
                <Pencil className="h-4 w-4" />
                Modifier
              </button>

              {isAdminUnlocked ? (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => onDelete(registration)}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
