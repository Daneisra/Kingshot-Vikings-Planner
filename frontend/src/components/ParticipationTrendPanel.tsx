import { Activity, BarChart3, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import type { WeeklyArchiveSummary } from "../types/registration";

interface ParticipationTrendPanelProps {
  archives: WeeklyArchiveSummary[];
  isAdminUnlocked: boolean;
  isLoading: boolean;
  errorMessage: string;
}

interface ParticipationHighlight {
  trackedWeeks: number;
  averageParticipants: number;
  averageAvailabilityRate: number | null;
  bestParticipationWeek: WeeklyArchiveSummary | null;
}

export function ParticipationTrendPanel({
  archives,
  isAdminUnlocked,
  isLoading,
  errorMessage
}: ParticipationTrendPanelProps) {
  const participationArchives = archives
    .filter((archive) => archive.registrationCount > 0)
    .sort((left, right) => new Date(right.archivedAt).getTime() - new Date(left.archivedAt).getTime());
  const timeline = participationArchives.slice(0, 10).reverse();
  const maxParticipants = timeline.reduce(
    (currentMax, archive) => Math.max(currentMax, archive.registrationCount),
    0
  );
  const highlights = buildParticipationHighlights(participationArchives);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Participation trends</p>
        <h2 className="mt-2 text-xl font-semibold text-frost">Weekly attendance view</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Tracks archived sign-ups and availability so leadership can see whether weekly attendance is improving.
        </p>
      </div>

      {!isAdminUnlocked ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Unlock the admin panel to review participation trends.
        </p>
      ) : isLoading ? (
        <div className="mt-4 grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-slate-950/70" />
          ))}
        </div>
      ) : errorMessage ? (
        <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-100">
          {errorMessage}
        </p>
      ) : participationArchives.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-5 text-sm text-slate-400">
          No participation history yet. Archive at least one week to build the trend chart.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <HighlightCard
              icon={<UsersRound className="h-4 w-4" />}
              label="Tracked weeks"
              value={String(highlights.trackedWeeks)}
              detail="Archived weeks with at least one registration."
            />
            <HighlightCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Avg participants"
              value={String(highlights.averageParticipants)}
              detail="Average sign-ups across tracked weeks."
            />
            <HighlightCard
              icon={<Activity className="h-4 w-4" />}
              label="Avg availability"
              value={
                highlights.averageAvailabilityRate === null
                  ? "N/A"
                  : `${Math.round(highlights.averageAvailabilityRate)}%`
              }
              detail="Average available players among sign-ups."
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-300" />
              <p className="text-sm font-semibold text-frost">Recent participation timeline</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 xl:grid-cols-10">
              {timeline.map((archive) => {
                const totalHeight = getHeightPercent(archive.registrationCount, maxParticipants);
                const availableHeight = getHeightPercent(archive.availableParticipants, maxParticipants);
                const availabilityRate = Math.round((archive.availableParticipants / archive.registrationCount) * 100);

                return (
                  <div key={archive.id} className="flex flex-col gap-2">
                    <div className="flex h-36 items-end gap-1 rounded-2xl border border-white/10 bg-slate-900/80 p-2">
                      <div
                        className="flex-1 rounded-xl bg-slate-500/70"
                        style={{ height: `${totalHeight}%` }}
                        title={`${archive.registrationCount} participants`}
                      />
                      <div
                        className="flex-1 rounded-xl bg-gradient-to-t from-emerald-500 to-cyan-200"
                        style={{ height: `${availableHeight}%` }}
                        title={`${archive.availableParticipants} available`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-frost">
                        {archive.availableParticipants}/{archive.registrationCount}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        {formatTimelineDate(archive.archivedAt)}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-emerald-200">{availabilityRate}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-slate-500/70" />
                Total sign-ups
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-300" />
                Available players
              </span>
            </div>
          </div>

          {highlights.bestParticipationWeek ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Best participation week</p>
              <p className="mt-2 text-lg font-semibold text-frost">
                {highlights.bestParticipationWeek.registrationCount} sign-ups on{" "}
                {formatArchiveDateLong(highlights.bestParticipationWeek.archivedAt)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {highlights.bestParticipationWeek.availableParticipants} players were marked available.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function HighlightCard({
  icon,
  label,
  value,
  detail
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-frost">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </article>
  );
}

function buildParticipationHighlights(archives: WeeklyArchiveSummary[]): ParticipationHighlight {
  const totalParticipants = archives.reduce((total, archive) => total + archive.registrationCount, 0);
  const totalAvailabilityRate = archives.reduce(
    (total, archive) => total + (archive.availableParticipants / archive.registrationCount) * 100,
    0
  );
  const bestParticipationWeek = archives.reduce<WeeklyArchiveSummary | null>(
    (currentBest, archive) =>
      !currentBest || archive.registrationCount > currentBest.registrationCount ? archive : currentBest,
    null
  );

  return {
    trackedWeeks: archives.length,
    averageParticipants: archives.length > 0 ? Math.round(totalParticipants / archives.length) : 0,
    averageAvailabilityRate: archives.length > 0 ? totalAvailabilityRate / archives.length : null,
    bestParticipationWeek
  };
}

function getHeightPercent(value: number, maxValue: number) {
  if (maxValue <= 0 || value <= 0) {
    return 6;
  }

  return Math.max(8, Math.round((value / maxValue) * 100));
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatArchiveDateLong(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
