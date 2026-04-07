import { Download, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";

interface AdminPanelProps {
  adminPassword: string;
  isAdminUnlocked: boolean;
  isBusy: boolean;
  onPasswordChange: (value: string) => void;
  onUnlock: () => Promise<void>;
  onLock: () => void;
  onExport: () => Promise<void>;
  onReset: () => Promise<void>;
}

export function AdminPanel({
  adminPassword,
  isAdminUnlocked,
  isBusy,
  onPasswordChange,
  onUnlock,
  onLock,
  onExport,
  onReset
}: AdminPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Admin</p>
          <h2 className="mt-2 text-xl font-semibold text-frost">Protected actions</h2>
          <p className="mt-2 text-sm text-slate-400">
            The admin password unlocks deletion, CSV export, and weekly reset actions.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            isAdminUnlocked
              ? "bg-emerald-500/15 text-emerald-200"
              : "bg-slate-800 text-slate-300"
          }`}
        >
          {isAdminUnlocked ? <ShieldCheck className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
          {isAdminUnlocked ? "Unlocked" : "Locked"}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row">
        <label className="flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-300">Admin password</span>
          <input
            type="password"
            value={adminPassword}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Enter admin password"
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            className="primary-button"
            onClick={onUnlock}
            disabled={isBusy || adminPassword.trim().length === 0}
          >
            <ShieldCheck className="h-4 w-4" />
            Unlock
          </button>

          <button type="button" className="secondary-button" onClick={onLock}>
            Lock
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="secondary-button"
          onClick={onExport}
          disabled={!isAdminUnlocked || isBusy}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>

        <button
          type="button"
          className="danger-button"
          onClick={onReset}
          disabled={!isAdminUnlocked || isBusy}
        >
          <RotateCcw className="h-4 w-4" />
          New week
        </button>
      </div>
    </section>
  );
}
