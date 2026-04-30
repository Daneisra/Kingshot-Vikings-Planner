import { BarChart3, Layers3, TrendingUp, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import type { WeeklyArchiveSummary } from "../types/registration";

interface DifficultyScoreTrendPanelProps {
  archives: WeeklyArchiveSummary[];
  isAdminUnlocked: boolean;
  isLoading: boolean;
  errorMessage: string;
}

interface ScoredArchive {
  id: string;
  archivedAt: string;
  allianceScore: number;
  difficultyLevel: string;
}

interface DifficultyTrend {
  difficultyLevel: string;
  archives: ScoredArchive[];
  averageScore: number;
  bestScore: number;
  averageGain: number | null;
}

export function DifficultyScoreTrendPanel({
  archives,
  isAdminUnlocked,
  isLoading,
  errorMessage
}: DifficultyScoreTrendPanelProps) {
  const trends = buildDifficultyTrends(archives);
  const maxScore = trends.reduce(
    (currentMax, trend) =>
      Math.max(currentMax, ...trend.archives.map((archive) => archive.allianceScore)),
    0
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Difficulty score trends</p>
        <h2 className="mt-2 text-xl font-semibold text-frost">Score by Viking difficulty</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Groups scored archives by difficulty level to compare score ceiling, consistency, and weekly gains.
        </p>
      </div>

      {!isAdminUnlocked ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Unlock the admin panel to review score trends by difficulty.
        </p>
      ) : isLoading ? (
        <div className="mt-4 grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-slate-950/70" />
          ))}
        </div>
      ) : errorMessage ? (
        <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-100">
          {errorMessage}
        </p>
      ) : trends.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-5 text-sm text-slate-400">
          No difficulty score trends yet. Add alliance scores and difficulty labels to archived weeks first.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {trends.map((trend) => (
              <article key={trend.difficultyLevel} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-amber-300" />
                      <h3 className="text-base font-semibold text-frost">{trend.difficultyLevel}</h3>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {trend.archives.length} scored week{trend.archives.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
                    Best {compactScore(trend.bestScore)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MetricCard
                    icon={<BarChart3 className="h-4 w-4" />}
                    label="Average"
                    value={compactScore(trend.averageScore)}
                  />
                  <MetricCard
                    icon={<Trophy className="h-4 w-4" />}
                    label="Best score"
                    value={compactScore(trend.bestScore)}
                  />
                  <MetricCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Avg gain"
                    value={
                      trend.averageGain === null
                        ? "N/A"
                        : `${trend.averageGain >= 0 ? "+" : ""}${compactScore(Math.round(trend.averageGain))}`
                    }
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent timeline</p>
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {trend.archives
                      .slice(0, 6)
                      .reverse()
                      .map((archive) => {
                        const heightPercent = getHeightPercent(archive.allianceScore, maxScore);

                        return (
                          <div key={archive.id} className="flex flex-col gap-2">
                            <div className="flex h-24 items-end rounded-xl border border-white/10 bg-slate-900/80 p-1.5">
                              <div
                                className="w-full rounded-lg bg-gradient-to-t from-amber-500 via-amber-300 to-cyan-100"
                                style={{ height: `${heightPercent}%` }}
                                title={archive.allianceScore.toLocaleString("en-US")}
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] font-semibold text-frost">{compactScore(archive.allianceScore)}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                                {formatTimelineDate(archive.archivedAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-frost">{value}</p>
    </div>
  );
}

function buildDifficultyTrends(archives: WeeklyArchiveSummary[]): DifficultyTrend[] {
  const grouped = new Map<string, ScoredArchive[]>();

  archives.forEach((archive) => {
    if (typeof archive.allianceScore !== "number") {
      return;
    }

    const difficultyLevel = archive.difficultyLevel?.trim();

    if (!difficultyLevel) {
      return;
    }

    const currentArchives = grouped.get(difficultyLevel) ?? [];
    currentArchives.push({
      id: archive.id,
      archivedAt: archive.archivedAt,
      allianceScore: archive.allianceScore,
      difficultyLevel
    });
    grouped.set(difficultyLevel, currentArchives);
  });

  return Array.from(grouped.entries())
    .map(([difficultyLevel, difficultyArchives]) => {
      const sortedArchives = difficultyArchives.sort(
        (left, right) => new Date(right.archivedAt).getTime() - new Date(left.archivedAt).getTime()
      );
      const totalScore = sortedArchives.reduce((total, archive) => total + archive.allianceScore, 0);
      const gains: number[] = [];

      for (let index = 0; index < sortedArchives.length - 1; index += 1) {
        gains.push(sortedArchives[index].allianceScore - sortedArchives[index + 1].allianceScore);
      }

      return {
        difficultyLevel,
        archives: sortedArchives,
        averageScore: Math.round(totalScore / sortedArchives.length),
        bestScore: Math.max(...sortedArchives.map((archive) => archive.allianceScore)),
        averageGain:
          gains.length > 0 ? gains.reduce((total, gain) => total + gain, 0) / gains.length : null
      };
    })
    .sort(
      (left, right) =>
        right.bestScore - left.bestScore ||
        right.averageScore - left.averageScore ||
        left.difficultyLevel.localeCompare(right.difficultyLevel)
    );
}

function getHeightPercent(value: number, maxValue: number) {
  if (maxValue <= 0 || value <= 0) {
    return 8;
  }

  return Math.max(10, Math.round((value / maxValue) * 100));
}

function compactScore(score: number) {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(score >= 10000000 ? 0 : 1)}M`;
  }

  if (score >= 1000) {
    return `${Math.round(score / 1000)}K`;
  }

  return score.toLocaleString("en-US");
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
