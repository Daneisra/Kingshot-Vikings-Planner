import { Medal, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import type { PlayerProfileSummary } from "../types/registration";

interface PlayerProfileSummaryPanelProps {
  profiles: PlayerProfileSummary[];
  isAdminUnlocked: boolean;
  isLoading: boolean;
  errorMessage: string;
}

export function PlayerProfileSummaryPanel({
  profiles,
  isAdminUnlocked,
  isLoading,
  errorMessage
}: PlayerProfileSummaryPanelProps) {
  const visibleProfiles = profiles.slice(0, 12);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Player profiles</p>
        <h2 className="mt-2 text-xl font-semibold text-frost">Individual archive summaries</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Uses archived weeks to summarize each player&apos;s latest score, best score, average score, and participation.
        </p>
      </div>

      {!isAdminUnlocked ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Unlock the admin panel to review individual player profiles.
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
      ) : profiles.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-5 text-sm text-slate-400">
          No player profiles yet. Archive at least one week to build participation history.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {visibleProfiles.map((profile) => (
            <PlayerProfileCard key={profile.nickname.toLowerCase()} profile={profile} />
          ))}
        </div>
      )}
    </section>
  );
}

function PlayerProfileCard({ profile }: { profile: PlayerProfileSummary }) {
  const availabilityRate =
    profile.participationCount > 0 ? Math.round((profile.availableCount / profile.participationCount) * 100) : 0;
  const TrendIcon = profile.scoreDelta === null || profile.scoreDelta >= 0 ? TrendingUp : TrendingDown;

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-amber-300" />
            <h3 className="text-base font-semibold text-frost">{profile.nickname}</h3>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
            Last seen {formatArchiveDate(profile.latestArchivedAt)}
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
          {profile.participationCount} week{profile.participationCount > 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ProfileMetric label="Latest score" value={formatScore(profile.latestScore)} />
        <ProfileMetric label="Best score" value={formatScore(profile.bestScore)} />
        <ProfileMetric label="Average score" value={formatScore(profile.averageScore)} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Score change</p>
          <p
            className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${
              profile.scoreDelta === null
                ? "text-slate-300"
                : profile.scoreDelta >= 0
                  ? "text-emerald-200"
                  : "text-rose-200"
            }`}
          >
            {profile.scoreDelta === null ? null : <TrendIcon className="h-4 w-4" />}
            {formatDelta(profile.scoreDelta)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Availability</p>
          <p className="mt-2 text-sm font-semibold text-frost">
            {profile.availableCount}/{profile.participationCount} weeks / {availabilityRate}%
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="flex items-center gap-2">
          <Medal className="h-4 w-4 text-amber-300" />
          <p className="text-sm font-semibold text-frost">Latest roster snapshot</p>
        </div>
        <div className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          <p>
            <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Troops</span>
            {profile.latestTroopCount.toLocaleString("en-US")}
          </p>
          <p>
            <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Top tier</span>
            T{profile.latestTroopLevel}
          </p>
          <p>
            <span className="block text-xs uppercase tracking-[0.18em] text-slate-500">Partners</span>
            {profile.latestPartners.length > 0 ? profile.latestPartners.join(", ") : "None"}
          </p>
        </div>
      </div>
    </article>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-frost">{value}</p>
    </div>
  );
}

function formatScore(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return value.toLocaleString("en-US");
}

function formatDelta(value: number | null) {
  if (value === null) {
    return "Needs 2 scored weeks";
  }

  return `${value >= 0 ? "+" : ""}${value.toLocaleString("en-US")}`;
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
