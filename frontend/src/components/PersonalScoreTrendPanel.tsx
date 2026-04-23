import { TrendingDown, TrendingUp, Trophy } from "lucide-react";
import type { PersonalScoreTrend } from "../types/registration";

interface PersonalScoreTrendPanelProps {
  trends: PersonalScoreTrend[];
  isAdminUnlocked: boolean;
  isLoading: boolean;
  errorMessage: string;
}

export function PersonalScoreTrendPanel({
  trends,
  isAdminUnlocked,
  isLoading,
  errorMessage
}: PersonalScoreTrendPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Personal score trends</p>
        <h2 className="mt-2 text-xl font-semibold text-frost">Latest weekly score changes</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Compares players who entered a personal score in the last two archived weeks.
        </p>
      </div>

      {!isAdminUnlocked ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Unlock the admin panel to compare personal score changes.
        </p>
      ) : isLoading ? (
        <div className="mt-4 grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-slate-950/70" />
          ))}
        </div>
      ) : errorMessage ? (
        <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-100">
          {errorMessage}
        </p>
      ) : trends.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-5 text-sm text-slate-400">
          No comparable personal scores yet. Players need scores in at least two archived weeks.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {trends.map((trend) => {
            const isPositive = trend.scoreDelta >= 0;
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;

            return (
              <article
                key={`${trend.nickname}-${trend.currentArchivedAt}`}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-300" />
                      <p className="text-sm font-semibold text-frost">{trend.nickname}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {trend.previousScore.toLocaleString("en-US")} → {trend.currentScore.toLocaleString("en-US")}
                    </p>
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
                      isPositive
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-rose-500/15 text-rose-200"
                    }`}
                  >
                    <TrendIcon className="h-4 w-4" />
                    {isPositive ? "+" : ""}
                    {trend.scoreDelta.toLocaleString("en-US")}
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
