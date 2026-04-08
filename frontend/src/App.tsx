import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { Crown, Github, RefreshCw } from "lucide-react";
import { AdminPanel } from "./components/AdminPanel";
import { FiltersBar } from "./components/FiltersBar";
import { RegistrationForm } from "./components/RegistrationForm";
import { RegistrationList } from "./components/RegistrationList";
import { StatsCards } from "./components/StatsCards";
import { ToastStack } from "./components/ToastStack";
import type { ToastItem } from "./components/ToastStack";
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
const githubIssuesUrl = "https://github.com/Daneisra/Kingshot-Vikings-Planner/issues";

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
  const formPanelRef = useRef<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState<RegistrationFilters>(defaultFilters);
  const [partners, setPartners] = useState<string[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlockingAdmin, setIsUnlockingAdmin] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isResettingWeek, setIsResettingWeek] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem(adminStorageKey) || "");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => Boolean(localStorage.getItem(adminStorageKey)));
  const [partnersErrorMessage, setPartnersErrorMessage] = useState("");
  const [registrationsErrorMessage, setRegistrationsErrorMessage] = useState("");
  const [statsErrorMessage, setStatsErrorMessage] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const debouncedSearch = useDebouncedValue(filters.search, 250);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((tone: ToastItem["tone"], message: string) => {
    toastIdRef.current += 1;

    setToasts((current) => [
      ...current.slice(-2),
      {
        id: toastIdRef.current,
        message,
        tone
      }
    ]);
  }, []);

  async function loadPartners() {
    setIsLoadingPartners(true);
    setPartnersErrorMessage("");

    try {
      const nextPartners = await api.getPartners();
      setPartners(nextPartners);
    } catch {
      setPartnersErrorMessage("Partner filter options could not be refreshed. The rest of the board is still usable.");
    } finally {
      setIsLoadingPartners(false);
    }
  }

  async function loadDashboard(currentFilters: RegistrationFilters) {
    setIsLoading(true);
    setRegistrationsErrorMessage("");
    setStatsErrorMessage("");

    try {
      const [registrationsResult, statsResult] = await Promise.allSettled([
        api.listRegistrations(currentFilters),
        api.getStats(currentFilters)
      ]);

      startTransition(() => {
        if (registrationsResult.status === "fulfilled") {
          setRegistrations(registrationsResult.value);
        } else {
          setRegistrationsErrorMessage(
            registrations.length > 0
              ? "Could not refresh the player list. Showing the last known data."
              : "The player list is temporarily unavailable. Try refreshing again in a moment."
          );
        }

        if (statsResult.status === "fulfilled") {
          setStats(statsResult.value);
        } else {
          setStatsErrorMessage("Stats could not be refreshed. The player list may still be current.");
        }
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPartners();
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

  useEffect(() => {
    if (!editingRegistration) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [editingRegistration]);

  async function refreshAll(nextFilters?: RegistrationFilters) {
    const activeFilters = nextFilters ?? { ...filters, search: debouncedSearch };
    setIsRefreshing(true);

    try {
      await Promise.all([loadPartners(), loadDashboard(activeFilters)]);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSubmit(payload: RegistrationPayload) {
    setIsSubmitting(true);

    try {
      if (editingRegistration) {
        await api.updateRegistration(editingRegistration.id, payload);
        pushToast("success", "Registration updated.");
      } else {
        await api.createRegistration(payload);
        pushToast("success", "Registration added.");
      }

      setEditingRegistration(null);
      await refreshAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to save the registration.");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(registration: Registration) {
    if (!isAdminUnlocked) {
      pushToast("error", "Unlock the admin panel before deleting a registration.");
      return;
    }

    if (!window.confirm(`Delete ${registration.nickname}'s registration?`)) {
      return;
    }

    try {
      await api.deleteRegistration(registration.id, adminPassword);
      pushToast("success", "Registration deleted.");

      if (editingRegistration?.id === registration.id) {
        setEditingRegistration(null);
      }

      await refreshAll();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to delete the registration.");
    }
  }

  async function handleUnlockAdmin() {
    setIsUnlockingAdmin(true);

    try {
      await api.verifyAdminPassword(adminPassword);
      setIsAdminUnlocked(true);
      localStorage.setItem(adminStorageKey, adminPassword);
      pushToast("success", "Admin panel unlocked.");
    } catch (error) {
      setIsAdminUnlocked(false);
      localStorage.removeItem(adminStorageKey);
      pushToast("error", error instanceof Error ? error.message : "Invalid admin password.");
    } finally {
      setIsUnlockingAdmin(false);
    }
  }

  function handleLockAdmin() {
    setIsAdminUnlocked(false);
    localStorage.removeItem(adminStorageKey);
    pushToast("success", "Admin panel locked.");
  }

  async function handleExportCsv() {
    if (!isAdminUnlocked) {
      return;
    }

    setIsExportingCsv(true);

    try {
      const blob = await api.exportCsv(adminPassword, { ...filters, search: debouncedSearch });
      downloadBlob(blob, "kingshot-vikings-registrations.csv");
      pushToast("success", "CSV export generated.");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to export CSV.");
    } finally {
      setIsExportingCsv(false);
    }
  }

  async function handleResetWeek() {
    if (!isAdminUnlocked) {
      return;
    }

    if (!window.confirm("Reset the entire list for a new week?")) {
      return;
    }

    setIsResettingWeek(true);

    try {
      await api.resetRegistrations(adminPassword);
      setEditingRegistration(null);
      setFilters(defaultFilters);
      pushToast("success", "The list has been reset.");
      await refreshAll(defaultFilters);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to reset the list.");
    } finally {
      setIsResettingWeek(false);
    }
  }

  return (
    <div className="min-h-screen bg-abyss bg-hero-glow text-mist">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
                <Crown className="h-4 w-4" />
                Kingshot Vikings Planner
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-frost sm:text-5xl">
                Organize Viking sign-ups without friction.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                A shared sign-up board built for mobile, with troop tracking, availability filters,
                and protected admin actions.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={githubIssuesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                >
                  <Github className="h-4 w-4" />
                  Report bugs or request features
                </a>
              </div>
            </div>

            <button
              type="button"
              className="secondary-button w-full xl:w-auto"
              onClick={() => refreshAll()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <StatsCards stats={stats} warningMessage={statsErrorMessage} />

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div ref={formPanelRef} className="space-y-6">
            <RegistrationForm
              editingRegistration={editingRegistration}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onCancelEdit={() => setEditingRegistration(null)}
            />

            <AdminPanel
              adminPassword={adminPassword}
              isAdminUnlocked={isAdminUnlocked}
              isUnlocking={isUnlockingAdmin}
              isExporting={isExportingCsv}
              isResetting={isResettingWeek}
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
              isLoadingPartners={isLoadingPartners}
              partnerWarningMessage={partnersErrorMessage}
              onChange={setFilters}
              onReset={() => setFilters(defaultFilters)}
            />

            <RegistrationList
              registrations={registrations}
              isLoading={isLoading}
              isAdminUnlocked={isAdminUnlocked}
              editingRegistrationId={editingRegistration?.id ?? null}
              errorMessage={registrationsErrorMessage}
              onEdit={setEditingRegistration}
              onDelete={handleDelete}
            />

            {stats.topPartners.length > 0 ? (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
                <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Most selected partners</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {stats.topPartners.map((partner) => (
                    <div
                      key={partner.partnerName}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                    >
                      <p className="text-base font-semibold text-frost">{partner.partnerName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {partner.count} registration{partner.count > 1 ? "s" : ""}
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
