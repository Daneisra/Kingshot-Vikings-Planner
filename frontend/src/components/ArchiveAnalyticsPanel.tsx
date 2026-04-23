import { BarChart3, TrendingUp } from "lucide-react";
import type { WeeklyArchiveSummary } from "../types/registration";

interface ArchiveAnalyticsPanelProps {
  archives: WeeklyArchiveSummary[];
  isAdminUnlocked: boolean;
  isLoading: boolean;
  errorMessage: string;
}

interface DifficultySummary {
  difficultyLevel: string;
  weekCount: number;
  averageScore: number;
  averageGain: number | null;
}

interface ScoredArchive {
  id: string;
  archivedAt: string;
  allianceScore: number;
  difficultyLevel: string | null;
}

interface ArchiveHighlights {
  totalArchivedWeeks: number;
  scoredWeeks: number;
  averageAvailabilityRate: number | null;
  bestScoreArchive: ScoredArchive | null;
  biggestGain: number | null;
}

export function ArchiveAnalyticsPanel({
  archives,
  isAdminUnlocked,
  isLoading,
  errorMessage
}: ArchiveAnalyticsPanelProps) {
  const scoredArchives = getScoredArchives(archives);
  const timeline = scoredArchives.slice(0, 8).reverse();
  const difficultySummaries = buildDifficultySummaries(scoredArchives);
  const highlights = buildArchiveHighlights(archives, scoredArchives);
  const maxScore = timeline.reduce((currentMax, archive) => Math.max(currentMax, archive.allianceScore), 0);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Archive analytics</p>
        <h2 className="mt-2 text-xl font-semibold text-frost">Historical score view</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Tracks the alliance score timeline and the average score gain observed at each recorded difficulty.
        </p>
      </div>

      {!isAdminUnlocked ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Unlock the admin panel to review archive analytics.
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
      ) : scoredArchives.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-5 text-sm text-slate-400">
          No historical score analytics yet. Add alliance scores to archived weeks first.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Archived weeks</p>
              <p className="mt-2 text-2xl font-semibold text-frost">{highlights.totalArchivedWeeks}</p>
              <p className="mt-1 text-xs text-slate-400">Weekly snapshots currently retained in the archive.</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Scored weeks</p>
              <p className="mt-2 text-2xl font-semibold text-frost">{highlights.scoredWeeks}</p>
              <p className="mt-1 text-xs text-slate-400">Archived weeks with a recorded alliance score.</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Best score</p>
              <p className="mt-2 text-2xl font-semibold text-frost">
                {highlights.bestScoreArchive
                  ? compactScore(highlights.bestScoreArchive.allianceScore)
                  : "N/A"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {highlights.bestScoreArchive
                  ? `Reached on ${formatArchiveDateLong(highlights.bestScoreArchive.archivedAt)}`
                  : "Add scored archives to unlock this highlight."}
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average availability</p>
              <p className="mt-2 text-2xl font-semibold text-frost">
                {highlights.averageAvailabilityRate === null
                  ? "N/A"
                  : `${Math.round(highlights.averageAvailabilityRate)}%`}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Based on archived player availability across all saved weeks.
              </p>
            </article>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-300" />
              <p className="text-sm font-semibold text-frost">Recent score timeline</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
              {timeline.map((archive) => {
                const heightPercent = maxScore > 0 ? Math.max(14, Math.round((archive.allianceScore / maxScore) * 100)) : 14;

                return (
                  <div key={archive.id} className="flex flex-col gap-2">
                    <div className="flex h-36 items-end rounded-2xl border border-white/10 bg-slate-900/80 p-2">
                      <div
                        className="w-full rounded-xl bg-gradient-to-t from-amber-400 via-amber-300 to-yellow-200"
                        style={{ height: `${heightPercent}%` }}
                        title={`${archive.allianceScore.toLocaleString("en-US")}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-frost">
                        {compactScore(archive.allianceScore)}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        {formatTimelineDate(archive.archivedAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-300" />
              <p className="text-sm font-semibold text-frost">Cross-week highlights</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Biggest weekly gain</p>
                <p className="mt-2 text-xl font-semibold text-frost">
                  {highlights.biggestGain === null
                    ? "N/A"
                    : `${highlights.biggestGain >= 0 ? "+" : ""}${Math.round(highlights.biggestGain).toLocaleString(
                        "en-US"
                      )}`}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Largest score jump measured between two consecutive scored archive weeks.
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Tracked scope</p>
                <p className="mt-2 text-xl font-semibold text-frost">
                  {timeline.length > 0 ? `${timeline.length} recent scored weeks` : "No scored weeks"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Timeline visual uses the latest scored archives while difficulty averages use the full scored history.
                </p>
              </article>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-300" />
              <p className="text-sm font-semibold text-frost">Difficulty performance</p>
            </div>
            {difficultySummaries.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                Add difficulty labels to scored archives to compare average score and average gain by difficulty.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {difficultySummaries.map((summary) => (
                  <article
                    key={summary.difficultyLevel}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-frost">{summary.difficultyLevel}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {summary.weekCount} scored week{summary.weekCount > 1 ? "s" : ""}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average score</p>
                        <p className="mt-1 text-lg font-semibold text-frost">
                          {summary.averageScore.toLocaleString("en-US")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average gain</p>
                        <p
                          className={`mt-1 text-lg font-semibold ${
                            summary.averageGain === null
                              ? "text-slate-400"
                              : summary.averageGain >= 0
                                ? "text-emerald-200"
                                : "text-rose-200"
                          }`}
                        >
                          {summary.averageGain === null
                            ? "N/A"
                            : `${summary.averageGain >= 0 ? "+" : ""}${Math.round(summary.averageGain).toLocaleString(
                                "en-US"
                              )}`}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function buildArchiveHighlights(
  archives: WeeklyArchiveSummary[],
  scoredArchives: ScoredArchive[]
): ArchiveHighlights {
  const archivesWithParticipants = archives.filter((archive) => archive.registrationCount > 0);
  const bestScoreArchive = scoredArchives.reduce<ScoredArchive | null>(
    (currentBest, archive) =>
      !currentBest || archive.allianceScore > currentBest.allianceScore ? archive : currentBest,
    null
  );

  const averageAvailabilityRate =
    archivesWithParticipants.length > 0
      ? archivesWithParticipants.reduce(
          (totalRate, archive) => totalRate + (archive.availableParticipants / archive.registrationCount) * 100,
          0
        ) / archivesWithParticipants.length
      : null;

  let biggestGain: number | null = null;

  for (let index = 0; index < scoredArchives.length - 1; index += 1) {
    const gain = scoredArchives[index].allianceScore - scoredArchives[index + 1].allianceScore;
    biggestGain = biggestGain === null ? gain : Math.max(biggestGain, gain);
  }

  return {
    totalArchivedWeeks: archives.length,
    scoredWeeks: scoredArchives.length,
    averageAvailabilityRate,
    bestScoreArchive,
    biggestGain
  };
}

function getScoredArchives(archives: WeeklyArchiveSummary[]): ScoredArchive[] {
  return archives
    .filter((archive): archive is WeeklyArchiveSummary & { allianceScore: number } => typeof archive.allianceScore === "number")
    .sort((left, right) => new Date(right.archivedAt).getTime() - new Date(left.archivedAt).getTime())
    .map((archive) => ({
      id: archive.id,
      archivedAt: archive.archivedAt,
      allianceScore: archive.allianceScore,
      difficultyLevel: archive.difficultyLevel
    }));
}

function buildDifficultySummaries(scoredArchives: ScoredArchive[]): DifficultySummary[] {
  const summaryMap = new Map<
    string,
    {
      totalScore: number;
      totalGain: number;
      gainCount: number;
      weekCount: number;
    }
  >();

  scoredArchives.forEach((archive, index) => {
    const difficultyLevel = archive.difficultyLevel?.trim();

    if (!difficultyLevel) {
      return;
    }

    const currentSummary = summaryMap.get(difficultyLevel) ?? {
      totalScore: 0,
      totalGain: 0,
      gainCount: 0,
      weekCount: 0
    };

    currentSummary.totalScore += archive.allianceScore;
    currentSummary.weekCount += 1;

    const previousArchive = scoredArchives[index + 1];

    if (previousArchive) {
      currentSummary.totalGain += archive.allianceScore - previousArchive.allianceScore;
      currentSummary.gainCount += 1;
    }

    summaryMap.set(difficultyLevel, currentSummary);
  });

  return Array.from(summaryMap.entries())
    .map(([difficultyLevel, summary]) => ({
      difficultyLevel,
      weekCount: summary.weekCount,
      averageScore: Math.round(summary.totalScore / summary.weekCount),
      averageGain: summary.gainCount > 0 ? summary.totalGain / summary.gainCount : null
    }))
    .sort((left, right) => right.averageScore - left.averageScore || right.weekCount - left.weekCount);
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

function formatArchiveDateLong(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
