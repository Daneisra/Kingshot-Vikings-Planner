import { RefreshCw, ShieldCheck, Trophy } from "lucide-react";
import type { PersonalScoreTrend, PlayerProfileSummary, WeeklyArchiveSummary } from "../types/registration";
import { AllianceScoreTrendPanel } from "./AllianceScoreTrendPanel";
import { ArchiveAnalyticsPanel } from "./ArchiveAnalyticsPanel";
import { DifficultyScoreTrendPanel } from "./DifficultyScoreTrendPanel";
import { ParticipationTrendPanel } from "./ParticipationTrendPanel";
import { PersonalScoreTrendPanel } from "./PersonalScoreTrendPanel";
import { PlayerProfileSummaryPanel } from "./PlayerProfileSummaryPanel";

interface ScorePageProps {
  archives: WeeklyArchiveSummary[];
  personalScoreTrends: PersonalScoreTrend[];
  playerProfiles: PlayerProfileSummary[];
  isLoading: boolean;
  errorMessage: string;
  onRefresh: () => void;
}

export function ScorePage({
  archives,
  personalScoreTrends,
  playerProfiles,
  isLoading,
  errorMessage,
  onRefresh
}: ScorePageProps) {
  const scoredWeeks = archives.filter((archive) => archive.allianceScore !== null).length;
  const latestScoredArchive = archives.find((archive) => archive.allianceScore !== null) ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 shadow-panel backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Public score board</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-frost">Viking Vengeance score history</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-50/85">
              Public score trends and player summaries live here so the admin workspace can stay focused on protected
              tools, exports, and maintenance.
            </p>
          </div>

          <button type="button" className="secondary-button w-full lg:w-auto" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Refreshing..." : "Refresh scores"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ScoreHighlight label="Archived weeks" value={String(archives.length)} helper="Saved Viking cycles" />
          <ScoreHighlight label="Scored weeks" value={String(scoredWeeks)} helper="Archives with alliance score" />
          <ScoreHighlight
            label="Latest score"
            value={latestScoredArchive?.allianceScore?.toLocaleString("en-US") ?? "Not set"}
            helper={latestScoredArchive ? formatArchiveDate(latestScoredArchive.archivedAt) : "Archive a scored week first"}
          />
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
          <p className="text-sm leading-6 text-slate-300">
            This page uses read-only public score endpoints. Admin-only exports, archive editing, reset actions, and
            maintenance tools remain protected on the Admin page.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <ArchiveAnalyticsPanel archives={archives} isAdminUnlocked isLoading={isLoading} errorMessage={errorMessage} />
          <AllianceScoreTrendPanel archives={archives} isAdminUnlocked isLoading={isLoading} errorMessage={errorMessage} />
          <DifficultyScoreTrendPanel archives={archives} isAdminUnlocked isLoading={isLoading} errorMessage={errorMessage} />
          <PersonalScoreTrendPanel
            trends={personalScoreTrends}
            isAdminUnlocked
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        </div>

        <div className="space-y-6">
          <ParticipationTrendPanel archives={archives} isAdminUnlocked isLoading={isLoading} errorMessage={errorMessage} />
          <PlayerProfileSummaryPanel
            profiles={playerProfiles}
            isAdminUnlocked
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </div>
  );
}

function ScoreHighlight({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-200" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold text-frost">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </article>
  );
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
