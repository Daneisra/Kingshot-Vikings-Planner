import { Activity, Database, RefreshCw, Rocket, Server } from "lucide-react";
import type { ReactNode } from "react";
import type { HealthResponse } from "../lib/api";

interface AdminHealthPanelProps {
  health: HealthResponse | null;
  isLoading: boolean;
  errorMessage: string;
  onRefresh: () => Promise<void>;
}

export function AdminHealthPanel({ health, isLoading, errorMessage, onRefresh }: AdminHealthPanelProps) {
  const apiStatus = health?.status ?? "degraded";
  const databaseStatus = health?.database.status ?? "error";

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">System health</p>
          <h2 className="mt-2 text-xl font-semibold text-frost">Runtime status</h2>
          <p className="mt-2 text-sm text-slate-400">
            Quick production diagnostics for API version, database reachability, and deploy metadata.
          </p>
        </div>

        <button type="button" className="secondary-button" onClick={() => void onRefresh()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Checking..." : "Check"}
        </button>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <HealthMetric
          icon={<Activity className="h-4 w-4" />}
          label="API"
          value={health ? health.status.toUpperCase() : "Unknown"}
          tone={apiStatus === "ok" ? "success" : "danger"}
        />
        <HealthMetric
          icon={<Database className="h-4 w-4" />}
          label="Database"
          value={
            health?.database.latencyMs !== null && health?.database.latencyMs !== undefined
              ? `${health.database.status.toUpperCase()} · ${health.database.latencyMs}ms`
              : databaseStatus.toUpperCase()
          }
          tone={databaseStatus === "ok" ? "success" : "danger"}
        />
        <HealthMetric icon={<Server className="h-4 w-4" />} label="API version" value={health?.version ?? "Unknown"} />
        <HealthMetric
          icon={<Rocket className="h-4 w-4" />}
          label="Latest deploy"
          value={formatDateTime(health?.deployedAt) ?? "Not exposed"}
        />
      </div>

      <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
        <p>Started: {formatDateTime(health?.startedAt) ?? "Unknown"}</p>
        <p>Uptime: {formatUptime(health?.uptimeSeconds)}</p>
        <p className="sm:col-span-2">Commit: {formatCommitSha(health?.commitSha)}</p>
      </div>
    </section>
  );
}

function HealthMetric({
  icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "success" | "danger" | "neutral";
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
      : tone === "danger"
        ? "border-red-400/25 bg-red-500/10 text-red-100"
        : "border-white/10 bg-slate-950/70 text-frost";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatUptime(value: number | undefined) {
  if (typeof value !== "number") {
    return "Unknown";
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatCommitSha(value: string | null | undefined) {
  if (!value) {
    return "Not exposed";
  }

  return value.length > 12 ? value.slice(0, 12) : value;
}
