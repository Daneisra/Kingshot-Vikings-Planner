import { TrendingDown, TrendingUp, Trophy } from "lucide-react";
import type { WeeklyArchiveSummary } from "../types/registration";

interface AllianceScoreTrendPanelProps {
  archives: WeeklyArchiveSummary[];
  isAdminUnlocked: boolean;
  isLoading: boolean;
  errorMessage: string;
}

interface ArchiveScoreTrend {
  current: WeeklyArchiveSummary;
  previous: WeeklyArchiveSummary;
  delta: number;
}

export function AllianceScoreTrendPanel({
  archives,
  isAdminUnlocked,
  isLoading,
  errorMessage
}: AllianceScoreTrendPanelProps) {
  const trends = buildArchiveScoreTrends(archives);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Alliance score trends</p>
        <h2 className="mt-2 text-xl font-semibold text-frost">Weekly score comparisons</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Compares each scored archive against the previous scored week to track alliance progress.
        </p>
      </div>

      {!isAdminUnlocked ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Unlock the admin panel to compare archived alliance scores.
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
      ) : trends.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-5 text-sm text-slate-400">
          No alliance score comparisons yet. Add alliance scores to at least two archived weeks.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {trends.map((trend) => {
            const isPositive = trend.delta >= 0;
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;

            return (
              <article
                key={`${trend.current.id}-${trend.previous.id}`}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-300" />
                      <p className="text-sm font-semibold text-frost">
                        {formatArchiveDate(trend.previous.archivedAt)} to {formatArchiveDate(trend.current.archivedAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatScore(trend.previous.allianceScore)} to {formatScore(trend.current.allianceScore)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                      {trend.current.difficultyLevel ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Current difficulty: {trend.current.difficultyLevel}
                        </span>
                      ) : null}
                      {trend.previous.difficultyLevel ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Previous difficulty: {trend.previous.difficultyLevel}
                        </span>
                      ) : null}
                    </div>
                    {trend.current.difficultyNote ? (
                      <p className="mt-2 text-xs text-slate-500">{trend.current.difficultyNote}</p>
                    ) : null}
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
                      isPositive ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"
                    }`}
                  >
                    <TrendIcon className="h-4 w-4" />
                    {isPositive ? "+" : ""}
                    {trend.delta.toLocaleString("en-US")}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function buildArchiveScoreTrends(archives: WeeklyArchiveSummary[]): ArchiveScoreTrend[] {
  const scoredArchives = archives
    .filter((archive) => typeof archive.allianceScore === "number")
    .sort((left, right) => new Date(right.archivedAt).getTime() - new Date(left.archivedAt).getTime());

  const trends: ArchiveScoreTrend[] = [];

  for (let index = 0; index < scoredArchives.length - 1; index += 1) {
    const current = scoredArchives[index];
    const previous = scoredArchives[index + 1];

    if (current.allianceScore === null || previous.allianceScore === null) {
      continue;
    }

    trends.push({
      current,
      previous,
      delta: current.allianceScore - previous.allianceScore
    });
  }

  return trends.slice(0, 6);
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatScore(value: number | null) {
  if (value === null) {
    return "No score";
  }

  return value.toLocaleString("en-US");
}
