import { startTransition, useEffect, useState } from "react";
import { AlertTriangle, Crown, RefreshCw } from "lucide-react";
import { AdminPanel } from "./components/AdminPanel";
import { FiltersBar } from "./components/FiltersBar";
import { RegistrationForm } from "./components/RegistrationForm";
import { RegistrationList } from "./components/RegistrationList";
import { StatsCards } from "./components/StatsCards";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { api } from "./lib/api";
import type {
  Registration,
  RegistrationFilters,
  RegistrationPayload,
  StatsResponse
} from "./types/registration";

const defaultFilters: RegistrationFilters = {
  search: "",
  partner: "",
  available: "all"
};

const emptyStats: StatsResponse = {
  totalParticipants: 0,
  totalTroops: 0,
  averageTroopLevel: 0,
  topPartners: []
};

const adminStorageKey = "kingshot-vikings-admin-password";

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

export default function App() {
  const [filters, setFilters] = useState<RegistrationFilters>(defaultFilters);
  const [partners, setPartners] = useState<string[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminBusy, setIsAdminBusy] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem(adminStorageKey) || "");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => Boolean(localStorage.getItem(adminStorageKey)));
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const debouncedSearch = useDebouncedValue(filters.search, 250);

  async function loadPartners() {
    const nextPartners = await api.getPartners();
    setPartners(nextPartners);
  }

  async function loadDashboard(currentFilters: RegistrationFilters) {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [nextRegistrations, nextStats] = await Promise.all([
        api.listRegistrations(currentFilters),
        api.getStats(currentFilters)
      ]);

      startTransition(() => {
        setRegistrations(nextRegistrations);
        setStats(nextStats);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de charger les inscriptions.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPartners().catch(() => {
      setErrorMessage("Impossible de charger la liste des partenaires.");
    });
  }, []);

  useEffect(() => {
    if (!adminPassword) {
      setIsAdminUnlocked(false);
      return;
    }

    api.verifyAdminPassword(adminPassword)
      .then(() => {
        setIsAdminUnlocked(true);
      })
      .catch(() => {
        setIsAdminUnlocked(false);
        localStorage.removeItem(adminStorageKey);
      });
  }, []);

  useEffect(() => {
    void loadDashboard({ ...filters, search: debouncedSearch });
  }, [debouncedSearch, filters.available, filters.partner]);

  async function refreshAll(nextFilters?: RegistrationFilters) {
    const activeFilters = nextFilters ?? { ...filters, search: debouncedSearch };
    await Promise.all([loadPartners(), loadDashboard(activeFilters)]);
  }

  async function handleSubmit(payload: RegistrationPayload) {
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingRegistration) {
        await api.updateRegistration(editingRegistration.id, payload);
        setSuccessMessage("Inscription mise a jour.");
      } else {
        await api.createRegistration(payload);
        setSuccessMessage("Inscription ajoutee.");
      }

      setEditingRegistration(null);
      await refreshAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'enregistrer l'inscription.");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(registration: Registration) {
    if (!isAdminUnlocked) {
      setErrorMessage("Le panneau admin doit etre debloque pour supprimer une inscription.");
      return;
    }

    if (!window.confirm(`Supprimer l'inscription de ${registration.nickname} ?`)) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.deleteRegistration(registration.id, adminPassword);
      setSuccessMessage("Inscription supprimee.");

      if (editingRegistration?.id === registration.id) {
        setEditingRegistration(null);
      }

      await refreshAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Suppression impossible.");
    }
  }

  async function handleUnlockAdmin() {
    setIsAdminBusy(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.verifyAdminPassword(adminPassword);
      setIsAdminUnlocked(true);
      localStorage.setItem(adminStorageKey, adminPassword);
      setSuccessMessage("Panneau admin debloque.");
    } catch (error) {
      setIsAdminUnlocked(false);
      localStorage.removeItem(adminStorageKey);
      setErrorMessage(error instanceof Error ? error.message : "Mot de passe admin invalide.");
    } finally {
      setIsAdminBusy(false);
    }
  }

  function handleLockAdmin() {
    setIsAdminUnlocked(false);
    localStorage.removeItem(adminStorageKey);
    setSuccessMessage("Panneau admin verrouille.");
  }

  async function handleExportCsv() {
    if (!isAdminUnlocked) {
      return;
    }

    setIsAdminBusy(true);
    setErrorMessage("");

    try {
      const blob = await api.exportCsv(adminPassword, { ...filters, search: debouncedSearch });
      downloadBlob(blob, "kingshot-vikings-registrations.csv");
      setSuccessMessage("Export CSV genere.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export CSV impossible.");
    } finally {
      setIsAdminBusy(false);
    }
  }

  async function handleResetWeek() {
    if (!isAdminUnlocked) {
      return;
    }

    if (!window.confirm("Reinitialiser toute la liste pour une nouvelle semaine ?")) {
      return;
    }

    setIsAdminBusy(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.resetRegistrations(adminPassword);
      setEditingRegistration(null);
      setFilters(defaultFilters);
      setSuccessMessage("La liste a ete reinitialisee.");
      await refreshAll(defaultFilters);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reinitialisation impossible.");
    } finally {
      setIsAdminBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-abyss bg-hero-glow text-mist">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
                <Crown className="h-4 w-4" />
                Kingshot Vikings Planner
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-frost sm:text-5xl">
                Organise les inscriptions Vikings sans friction.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Une feuille d&apos;inscription partagee, rapide sur mobile, avec suivi des troupes,
                disponibilites, filtres et commandes admin protegees.
              </p>
            </div>

            <button type="button" className="secondary-button w-full xl:w-auto" onClick={() => refreshAll()}>
              <RefreshCw className="h-4 w-4" />
              Rafraichir
            </button>
          </div>
        </header>

        <StatsCards stats={stats} />

        {(errorMessage || successMessage) && (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm shadow-panel ${
              errorMessage
                ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {errorMessage ? <AlertTriangle className="h-4 w-4" /> : null}
              <span>{errorMessage || successMessage}</span>
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-6">
            <RegistrationForm
              editingRegistration={editingRegistration}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onCancelEdit={() => setEditingRegistration(null)}
            />

            <AdminPanel
              adminPassword={adminPassword}
              isAdminUnlocked={isAdminUnlocked}
              isBusy={isAdminBusy}
              onPasswordChange={setAdminPassword}
              onUnlock={handleUnlockAdmin}
              onLock={handleLockAdmin}
              onExport={handleExportCsv}
              onReset={handleResetWeek}
            />
          </div>

          <div className="space-y-6">
            <FiltersBar
              filters={filters}
              partners={partners}
              onChange={setFilters}
              onReset={() => setFilters(defaultFilters)}
            />

            <RegistrationList
              registrations={registrations}
              isLoading={isLoading}
              isAdminUnlocked={isAdminUnlocked}
              onEdit={setEditingRegistration}
              onDelete={handleDelete}
            />

            {stats.topPartners.length > 0 ? (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
                <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Partenaires les plus choisis</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {stats.topPartners.map((partner) => (
                    <div
                      key={partner.partnerName}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                    >
                      <p className="text-base font-semibold text-frost">{partner.partnerName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {partner.count} inscription{partner.count > 1 ? "s" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
