import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Crown, Github, RefreshCw } from "lucide-react";
import { AdminPanel } from "./components/AdminPanel";
import { ArchivesPanel } from "./components/ArchivesPanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { EventGuidePanel } from "./components/EventGuidePanel";
import { EventWarningBanner } from "./components/EventWarningBanner";
import { FiltersBar } from "./components/FiltersBar";
import { PersonalScoreTrendPanel } from "./components/PersonalScoreTrendPanel";
import { RegistrationForm } from "./components/RegistrationForm";
import { RegistrationList } from "./components/RegistrationList";
import { ReinforcementGroupsPanel } from "./components/ReinforcementGroupsPanel";
import { StatsCards } from "./components/StatsCards";
import { ToastStack } from "./components/ToastStack";
import type { ToastItem } from "./components/ToastStack";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { ApiError, api } from "./lib/api";
import { APP_VERSION_LABEL } from "./lib/app-version";
import type { AdminSessionResponse } from "./lib/api";
import type {
  Registration,
  RegistrationFilters,
  RegistrationPayload,
  StatsResponse,
  PersonalScoreTrend,
  WeeklyArchiveSummary
} from "./types/registration";

const defaultFilters: RegistrationFilters = {
  search: "",
  partner: "",
  available: "all"
};

const emptyStats: StatsResponse = {
  totalParticipants: 0,
  availableParticipants: 0,
  totalTroops: 0,
  availableTroops: 0,
  averageTroopLevel: 0,
  topPartners: []
};

const adminStorageKey = "kingshot-vikings-admin-password";
const ADMIN_SESSION_TIMEOUT_MINUTES = 20;
const ADMIN_SESSION_TIMEOUT_MS = ADMIN_SESSION_TIMEOUT_MINUTES * 60 * 1000;
const githubIssuesUrl = "https://github.com/Daneisra/Kingshot-Vikings-Planner/issues";
const vikingVengeanceGuideUrl =
  "https://github.com/Daneisra/Kingshot-Vikings-Planner/blob/main/docs/VIKING_VENGEANCE_GUIDE.md";

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "default";
  isConfirming: boolean;
  onConfirm: () => Promise<void>;
}

interface StoredAdminSession {
  token: string;
  expiresAt: number;
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

function readStoredAdminSession(): StoredAdminSession | null {
  const rawValue = localStorage.getItem(adminStorageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredAdminSession;

    if (
      typeof parsedValue.token !== "string" ||
      typeof parsedValue.expiresAt !== "number" ||
      parsedValue.expiresAt <= Date.now()
    ) {
      localStorage.removeItem(adminStorageKey);
      return null;
    }

    return parsedValue;
  } catch {
    localStorage.removeItem(adminStorageKey);
    return null;
  }
}

function writeStoredAdminSession(token: string, expiresAt: number) {
  localStorage.setItem(
    adminStorageKey,
    JSON.stringify({
      token,
      expiresAt
    } satisfies StoredAdminSession)
  );
}

function clearStoredAdminSession() {
  localStorage.removeItem(adminStorageKey);
}

function formatSessionHint(isAdminUnlocked: boolean, remainingMs: number | null) {
  if (!isAdminUnlocked || remainingMs === null) {
    return `Admin access creates a temporary token and auto-locks after ${ADMIN_SESSION_TIMEOUT_MINUTES} minutes.`;
  }

  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `Temporary admin token active. Auto-lock in ${minutes}m ${String(seconds).padStart(2, "0")}s.`;
  }

  return `Temporary admin token active. Auto-lock in ${seconds}s.`;
}

export default function App() {
  const initialAdminSessionRef = useRef<StoredAdminSession | null>(readStoredAdminSession());
  const formPanelRef = useRef<HTMLDivElement | null>(null);
  const hasRegistrationsRef = useRef(false);
  const [filters, setFilters] = useState<RegistrationFilters>(defaultFilters);
  const [partners, setPartners] = useState<string[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRegistrationId, setDeletingRegistrationId] = useState<string | null>(null);
  const [isUnlockingAdmin, setIsUnlockingAdmin] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [exportingArchiveId, setExportingArchiveId] = useState<string | null>(null);
  const [isResettingWeek, setIsResettingWeek] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminToken, setAdminToken] = useState(() => initialAdminSessionRef.current?.token ?? "");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => Boolean(initialAdminSessionRef.current));
  const [adminSessionExpiresAt, setAdminSessionExpiresAt] = useState<number | null>(
    () => initialAdminSessionRef.current?.expiresAt ?? null
  );
  const [partnersErrorMessage, setPartnersErrorMessage] = useState("");
  const [registrationsErrorMessage, setRegistrationsErrorMessage] = useState("");
  const [statsErrorMessage, setStatsErrorMessage] = useState("");
  const [archivesErrorMessage, setArchivesErrorMessage] = useState("");
  const [archives, setArchives] = useState<WeeklyArchiveSummary[]>([]);
  const [scoreTrendErrorMessage, setScoreTrendErrorMessage] = useState("");
  const [scoreTrends, setScoreTrends] = useState<PersonalScoreTrend[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const [adminSessionRemainingMs, setAdminSessionRemainingMs] = useState<number | null>(
    () =>
      initialAdminSessionRef.current
        ? Math.max(0, initialAdminSessionRef.current.expiresAt - Date.now())
        : null
  );

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

  const getDisplayMessage = useCallback((error: unknown, fallback: string) => {
    if (error instanceof ApiError || error instanceof Error) {
      return error.message;
    }

    return fallback;
  }, []);

  useEffect(() => {
    hasRegistrationsRef.current = registrations.length > 0;
  }, [registrations.length]);

  const hasActiveFilters =
    Boolean(filters.search.trim()) || Boolean(filters.partner.trim()) || filters.available !== "all";

  const adminSessionHint = formatSessionHint(isAdminUnlocked, adminSessionRemainingMs);

  const refreshAdminSession = useCallback((session: AdminSessionResponse) => {
    const serverExpiresAt = Date.parse(session.expiresAt);
    const nextExpiresAt = Math.min(Date.now() + ADMIN_SESSION_TIMEOUT_MS, serverExpiresAt);
    setAdminToken(session.token);
    setAdminSessionExpiresAt(nextExpiresAt);
    setAdminSessionRemainingMs(Math.max(0, nextExpiresAt - Date.now()));
    writeStoredAdminSession(session.token, nextExpiresAt);
  }, []);

  const lockAdminSession = useCallback(
    (message?: string, tone: ToastItem["tone"] = "success") => {
      setIsAdminUnlocked(false);
      setAdminSessionExpiresAt(null);
      setAdminSessionRemainingMs(null);
      setAdminToken("");
      setConfirmDialog(null);
      setDeletingRegistrationId(null);
      clearStoredAdminSession();

      if (message) {
        pushToast(tone, message);
      }
    },
    [pushToast]
  );

  async function loadPartners() {
    setIsLoadingPartners(true);
    setPartnersErrorMessage("");

    try {
      const nextPartners = await api.getPartners();
      setPartners(nextPartners);
    } catch (error) {
      setPartnersErrorMessage(
        `Partner filter options could not be refreshed. ${getDisplayMessage(
          error,
          "The rest of the board is still usable."
        )}`
      );
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
            hasRegistrationsRef.current
              ? `Could not refresh the player list. Showing the last known data. ${getDisplayMessage(
                  registrationsResult.reason,
                  ""
                )}`.trim()
              : getDisplayMessage(
                  registrationsResult.reason,
                  "The player list is temporarily unavailable. Try refreshing again in a moment."
                )
          );
        }

        if (statsResult.status === "fulfilled") {
          setStats(statsResult.value);
        } else {
          setStatsErrorMessage(
            `Stats could not be refreshed. ${getDisplayMessage(
              statsResult.reason,
              "The player list may still be current."
            )}`
          );
        }
      });
    } finally {
      setIsLoading(false);
    }
  }

  const loadArchives = useCallback(async () => {
    if (!adminToken.trim()) {
      return;
    }

    setIsLoadingArchives(true);
    setArchivesErrorMessage("");
    setScoreTrendErrorMessage("");

    try {
      const [nextArchives, nextTrends] = await Promise.all([
        api.listArchives(adminToken),
        api.listPersonalScoreTrends(adminToken)
      ]);
      setArchives(nextArchives);
      setScoreTrends(nextTrends);
    } catch (error) {
      const message = getDisplayMessage(error, "Unable to load weekly archives.");
      setArchivesErrorMessage(message);
      setScoreTrendErrorMessage(message);
    } finally {
      setIsLoadingArchives(false);
    }
  }, [adminToken, getDisplayMessage]);

  useEffect(() => {
    void loadPartners();
  }, []);

  useEffect(() => {
    const storedSession = initialAdminSessionRef.current;

    if (!storedSession?.token) {
      setIsAdminUnlocked(false);
      return;
    }

    api.verifyAdminToken(storedSession.token)
      .then((session) => {
        setIsAdminUnlocked(true);
        refreshAdminSession(session);
      })
      .catch(() => {
        setAdminPassword("");
        lockAdminSession();
      });
  }, [lockAdminSession, refreshAdminSession]);

  useEffect(() => {
    if (!isAdminUnlocked || !adminToken.trim()) {
      setArchives([]);
      setArchivesErrorMessage("");
      setScoreTrends([]);
      setScoreTrendErrorMessage("");
      return;
    }

    void loadArchives();
  }, [adminToken, isAdminUnlocked, loadArchives]);

  useEffect(() => {
    void loadDashboard({ ...filters, search: debouncedSearch });
  }, [debouncedSearch, filters.available, filters.partner, getDisplayMessage]);

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

  useEffect(() => {
    if (!isAdminUnlocked || !adminSessionExpiresAt) {
      return;
    }

    const syncSessionTimer = () => {
      const remaining = adminSessionExpiresAt - Date.now();

      if (remaining <= 0) {
        lockAdminSession(
          `Admin session timed out after ${ADMIN_SESSION_TIMEOUT_MINUTES} minutes of inactivity.`,
          "error"
        );
        return;
      }

      setAdminSessionRemainingMs(remaining);
    };

    syncSessionTimer();
    const intervalId = window.setInterval(syncSessionTimer, 1000);

    return () => window.clearInterval(intervalId);
  }, [adminSessionExpiresAt, isAdminUnlocked, lockAdminSession]);

  useEffect(() => {
    if (!isAdminUnlocked || !adminToken.trim()) {
      return;
    }

    const extendSession = () => {
      const expiresAt = adminSessionExpiresAt ?? Date.now();
      const nextExpiresAt = Math.min(Date.now() + ADMIN_SESSION_TIMEOUT_MS, expiresAt);
      setAdminSessionExpiresAt(nextExpiresAt);
      setAdminSessionRemainingMs(Math.max(0, nextExpiresAt - Date.now()));
      writeStoredAdminSession(adminToken, nextExpiresAt);
    };

    window.addEventListener("pointerdown", extendSession);
    window.addEventListener("keydown", extendSession);

    return () => {
      window.removeEventListener("pointerdown", extendSession);
      window.removeEventListener("keydown", extendSession);
    };
  }, [adminSessionExpiresAt, adminToken, isAdminUnlocked]);

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
      pushToast("error", getDisplayMessage(error, "Unable to save the registration."));
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

    setConfirmDialog({
      title: "Delete registration?",
      description: `This will permanently remove ${registration.nickname}'s entry from the current week.`,
      confirmLabel: "Delete registration",
      tone: "danger",
      isConfirming: false,
      onConfirm: async () => {
        setDeletingRegistrationId(registration.id);

        try {
          await api.deleteRegistration(registration.id, adminToken);
          pushToast("success", "Registration deleted.");

          if (editingRegistration?.id === registration.id) {
            setEditingRegistration(null);
          }

          setConfirmDialog(null);
          await refreshAll();
        } catch (error) {
          pushToast("error", getDisplayMessage(error, "Unable to delete the registration."));
          setConfirmDialog(null);
        } finally {
          setDeletingRegistrationId(null);
        }
      }
    });
  }

  async function handleUnlockAdmin() {
    setIsUnlockingAdmin(true);

    try {
      const session = await api.verifyAdminPassword(adminPassword);
      setIsAdminUnlocked(true);
      setAdminPassword("");
      refreshAdminSession(session);
      pushToast("success", "Admin panel unlocked with a temporary token.");
    } catch (error) {
      lockAdminSession();
      pushToast("error", getDisplayMessage(error, "Invalid admin password."));
    } finally {
      setIsUnlockingAdmin(false);
    }
  }

  function handleLockAdmin() {
    lockAdminSession("Admin panel locked.");
  }

  async function handleExportCsv() {
    if (!isAdminUnlocked) {
      return;
    }

    setIsExportingCsv(true);

    try {
      const { blob, filename } = await api.exportCsv(adminToken, { ...filters, search: debouncedSearch });
      downloadBlob(blob, filename);
      pushToast("success", "CSV export generated.");
    } catch (error) {
      pushToast("error", getDisplayMessage(error, "Unable to export CSV."));
    } finally {
      setIsExportingCsv(false);
    }
  }

  async function handleExportArchiveCsv(archiveId: string) {
    if (!isAdminUnlocked) {
      return;
    }

    setExportingArchiveId(archiveId);

    try {
      const { blob, filename } = await api.exportArchiveCsv(adminToken, archiveId);
      downloadBlob(blob, filename);
      pushToast("success", "Archive CSV export generated.");
    } catch (error) {
      pushToast("error", getDisplayMessage(error, "Unable to export archive CSV."));
    } finally {
      setExportingArchiveId(null);
    }
  }

  async function handleResetWeek() {
    if (!isAdminUnlocked) {
      return;
    }

    try {
      const currentWeekStats = await api.getStats(defaultFilters);

      if (currentWeekStats.totalParticipants === 0) {
        pushToast("success", "The list is already empty. No reset was needed.");
        return;
      }

      const description =
        currentWeekStats.totalParticipants === 1
          ? "This will permanently clear 1 registration from the current week."
          : `This will permanently clear ${currentWeekStats.totalParticipants} registrations from the current week.`;

      setConfirmDialog({
        title: "Start a new week?",
        description,
        confirmLabel: "Reset weekly board",
        tone: "danger",
        isConfirming: false,
        onConfirm: async () => {
          setIsResettingWeek(true);

          try {
            const result = await api.resetRegistrations(adminToken);
            setEditingRegistration(null);
            setFilters(defaultFilters);
            pushToast(
              "success",
              result.deletedCount === 1
                ? `The list has been reset. 1 registration was archived and removed.`
                : `The list has been reset. ${result.deletedCount} registrations were archived and removed.`
            );
            setConfirmDialog(null);
            await refreshAll(defaultFilters);
            await loadArchives();
          } catch (error) {
            pushToast("error", getDisplayMessage(error, "Unable to reset the list."));
            setConfirmDialog(null);
          } finally {
            setIsResettingWeek(false);
          }
        }
      });
    } catch (error) {
      pushToast("error", getDisplayMessage(error, "Unable to reset the list."));
    }
  }

  return (
    <div className="min-h-screen bg-abyss bg-hero-glow text-mist">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
        tone={confirmDialog?.tone ?? "default"}
        isConfirming={Boolean(confirmDialog?.isConfirming)}
        onCancel={() => {
          if (confirmDialog?.isConfirming) {
            return;
          }

          setConfirmDialog(null);
        }}
        onConfirm={() => {
          if (!confirmDialog || confirmDialog.isConfirming) {
            return;
          }

          setConfirmDialog((current) => (current ? { ...current, isConfirming: true } : current));
          void confirmDialog.onConfirm();
        }}
      />
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
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                  Version {APP_VERSION_LABEL}
                </span>
                <a
                  href={githubIssuesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                >
                  <Github className="h-4 w-4" />
                  Report bugs or request features
                </a>
                <a
                  href={vikingVengeanceGuideUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                >
                  <BookOpen className="h-4 w-4" />
                  Viking Vengeance guide
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

        <EventWarningBanner />

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
              sessionHint={adminSessionHint}
              onPasswordChange={setAdminPassword}
              onUnlock={handleUnlockAdmin}
              onLock={handleLockAdmin}
              onExport={handleExportCsv}
              onReset={handleResetWeek}
            />

            <ArchivesPanel
              archives={archives}
              isAdminUnlocked={isAdminUnlocked}
              isLoading={isLoadingArchives}
              exportingArchiveId={exportingArchiveId}
              errorMessage={archivesErrorMessage}
              onRefresh={loadArchives}
              onExport={handleExportArchiveCsv}
            />

            <PersonalScoreTrendPanel
              trends={scoreTrends}
              isAdminUnlocked={isAdminUnlocked}
              isLoading={isLoadingArchives}
              errorMessage={scoreTrendErrorMessage}
            />
          </div>

          <div className="space-y-6">
            <EventGuidePanel guideUrl={vikingVengeanceGuideUrl} />

            <FiltersBar
              filters={filters}
              partners={partners}
              isLoadingPartners={isLoadingPartners}
              partnerWarningMessage={partnersErrorMessage}
              onChange={setFilters}
              onReset={() => setFilters(defaultFilters)}
            />

            <ReinforcementGroupsPanel registrations={registrations} hasActiveFilters={hasActiveFilters} />

            <RegistrationList
              registrations={registrations}
              isLoading={isLoading}
              isAdminUnlocked={isAdminUnlocked}
              editingRegistrationId={editingRegistration?.id ?? null}
              deletingRegistrationId={deletingRegistrationId}
              errorMessage={registrationsErrorMessage}
              hasActiveFilters={hasActiveFilters}
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
                      <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                        <p>
                          <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Total Troops</span>
                          {partner.totalTroops.toLocaleString("en-US")}
                        </p>
                        <p>
                          <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">
                            Available Troops
                          </span>
                          {partner.availableTroops.toLocaleString("en-US")}
                        </p>
                      </div>
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
