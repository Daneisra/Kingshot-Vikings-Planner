import { BookOpenCheck, Gauge, Medal, ScrollText, TrendingUp, Users2 } from "lucide-react";
import type { WeeklyArchiveSummary } from "../types/registration";

interface PostEventResultPanelProps {
  archives: WeeklyArchiveSummary[];
  isAdminUnlocked: boolean;
  isLoading: boolean;
  errorMessage: string;
}

export function PostEventResultPanel({
  archives,
  isAdminUnlocked,
  isLoading,
  errorMessage
}: PostEventResultPanelProps) {
  const latestArchive = archives[0] ?? null;
  const availabilityRate =
    latestArchive && latestArchive.registrationCount > 0
      ? Math.round((latestArchive.availableParticipants / latestArchive.registrationCount) * 100)
      : null;

  return (
    <section className="rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-300/10 via-slate-950/80 to-slate-950/90 p-5 shadow-panel backdrop-blur">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Post-event result</p>
        <h2 className="mt-2 text-xl font-semibold text-frost">Latest Viking Vengeance recap</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          A quick result screen for the latest archived week: score, difficulty, participation, notes, and lessons learned.
        </p>
      </div>

      {!isAdminUnlocked ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Unlock the admin panel to review the latest post-event result.
        </p>
      ) : isLoading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-slate-950/70" />
          ))}
        </div>
      ) : errorMessage ? (
        <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-100">
          {errorMessage}
        </p>
      ) : !latestArchive ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-6 text-center">
          <BookOpenCheck className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-frost">No post-event result yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Start a new week after the event to create an archive, then fill the result fields.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResultMetricCard
              icon={Medal}
              label="Alliance score"
              value={latestArchive.allianceScore === null ? "Not set" : latestArchive.allianceScore.toLocaleString("en-US")}
              helper={formatArchiveDate(latestArchive.archivedAt)}
            />
            <ResultMetricCard
              icon={Gauge}
              label="Difficulty"
              value={latestArchive.difficultyLevel || "Not set"}
              helper="Tracked on the latest archive"
            />
            <ResultMetricCard
              icon={Users2}
              label="Available players"
              value={`${latestArchive.availableParticipants}/${latestArchive.registrationCount}`}
              helper={availabilityRate === null ? "No participants archived" : `${availabilityRate}% availability`}
            />
            <ResultMetricCard
              icon={TrendingUp}
              label="Troops registered"
              value={latestArchive.totalTroops.toLocaleString("en-US")}
              helper="From the archived sign-up sheet"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-cyan-200">
                <ScrollText className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em]">Leadership notes</p>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                {latestArchive.eventLog || "No weekly event log saved yet. Add notes in the archive editor below."}
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-amber-200">
                <BookOpenCheck className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em]">Lessons learned</p>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
                {latestArchive.difficultyNote ||
                  "No lesson or difficulty note saved yet. Record what changed, what worked, and what should improve next week."}
              </p>
            </article>
          </div>

          {latestArchive.manualStats.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {latestArchive.manualStats.map((stat) => (
                <article key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-xl font-semibold text-frost">{stat.value.toLocaleString("en-US")}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

interface ResultMetricCardProps {
  icon: typeof Medal;
  label: string;
  value: string;
  helper: string;
}

function ResultMetricCard({ icon: Icon, label, value, helper }: ResultMetricCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-amber-300" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-frost">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </article>
  );
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
