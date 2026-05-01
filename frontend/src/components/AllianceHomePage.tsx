import { BookOpen, ClipboardCheck, Coffee, Github, HeartHandshake, MessageCircle, ShieldCheck, Users2 } from "lucide-react";
import type { HealthResponse } from "../lib/api";
import type { StatsResponse } from "../types/registration";
import type { EventConfigurationSettings, EventWarningSettings } from "../types/settings";

type HomeTargetView = "planner" | "prep" | "groups" | "guide" | "admin";

interface AllianceHomePageProps {
  eventConfiguration: EventConfigurationSettings;
  eventWarning: EventWarningSettings;
  stats: StatsResponse;
  health: HealthResponse | null;
  githubIssuesUrl: string;
  discordUrl: string;
  paypalUrl: string;
  kofiUrl: string;
  onNavigate: (view: HomeTargetView) => void;
}

const shortcutItems: Array<{
  view: HomeTargetView;
  label: string;
  description: string;
  icon: typeof Users2;
}> = [
  {
    view: "planner",
    label: "Open planner",
    description: "Register or update a Viking sign-up.",
    icon: Users2
  },
  {
    view: "prep",
    label: "Prep checklist",
    description: "Review readiness and critical waves.",
    icon: ClipboardCheck
  },
  {
    view: "groups",
    label: "Auto groups",
    description: "Review reinforcement and HQ suggestions.",
    icon: ShieldCheck
  },
  {
    view: "guide",
    label: "Viking guide",
    description: "Open event rules and alliance notes.",
    icon: BookOpen
  }
];

export function AllianceHomePage({
  eventConfiguration,
  eventWarning,
  stats,
  health,
  githubIssuesUrl,
  discordUrl,
  paypalUrl,
  kofiUrl,
  onNavigate
}: AllianceHomePageProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-cyan-300/15 bg-cyan-300/10 p-6 shadow-panel backdrop-blur">
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-200">Alliance hub</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-frost">
            {eventConfiguration.eventName || "Viking Vengeance"} coordination center
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-cyan-50/85">
            Start from the planner, prepare the alliance for critical waves, or jump into admin reporting when
            leadership needs history and exports.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {eventConfiguration.activeWeek ? (
              <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
                {eventConfiguration.activeWeek}
              </span>
            ) : null}
            {eventConfiguration.difficultyLevel ? (
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                {eventConfiguration.difficultyLevel}
              </span>
            ) : null}
            {health ? (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  health.status === "ok"
                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                    : "border-red-300/25 bg-red-500/10 text-red-100"
                }`}
              >
                API {health.status}
              </span>
            ) : null}
          </div>

          {eventConfiguration.allianceNotes ? (
            <p className="mt-5 whitespace-pre-line rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm leading-6 text-slate-200">
              {eventConfiguration.allianceNotes}
            </p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Quick status</p>
          <div className="mt-4 grid gap-3">
            <StatusRow label="Participants" value={String(stats.totalParticipants)} />
            <StatusRow label="Available" value={String(stats.availableParticipants)} />
            <StatusRow label="Total troops" value={stats.totalTroops.toLocaleString("en-US")} />
            <StatusRow label="Average tier" value={stats.averageTroopLevel.toFixed(1)} />
          </div>
        </div>
      </section>

      {eventWarning.isEnabled ? (
        <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 shadow-panel backdrop-blur">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Active announcement</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">{eventWarning.title}</h3>
          <p className="mt-2 text-sm leading-6 text-amber-50/85">{eventWarning.message}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {shortcutItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.view}
              type="button"
              className="group rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-slate-900/90"
              onClick={() => onNavigate(item.view)}
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-4 block text-lg font-semibold text-frost">{item.label}</span>
              <span className="mt-2 block text-sm leading-6 text-slate-400">{item.description}</span>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <a
          href={githubIssuesUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel transition hover:border-amber-300/30 hover:bg-white/10"
        >
          <Github className="h-5 w-5 text-amber-300" />
          <p className="mt-3 text-lg font-semibold text-frost">Report bugs or request features</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use GitHub Issues to share bugs, ideas, balancing problems, or future event requests.
          </p>
        </a>

        {discordUrl ? (
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel transition hover:border-cyan-300/30 hover:bg-white/10"
          >
            <MessageCircle className="h-5 w-5 text-cyan-300" />
            <p className="mt-3 text-lg font-semibold text-frost">Join Discord</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open the alliance Discord for live calls, coordination, and leadership announcements.
            </p>
          </a>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-5 shadow-panel">
            <MessageCircle className="h-5 w-5 text-slate-500" />
            <p className="mt-3 text-lg font-semibold text-frost">Discord link not configured</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Add `VITE_DISCORD_URL` to the frontend environment to show a public Discord shortcut here.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 shadow-panel backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Support the project</p>
            <h3 className="mt-2 text-xl font-semibold text-frost">Help keep the planner improving</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-50/85">
              If the tool helps your alliance coordinate Viking Vengeance, you can support future fixes,
              hosting, and feature work.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={paypalUrl} target="_blank" rel="noreferrer" className="primary-button">
              <HeartHandshake className="h-4 w-4" />
              PayPal
            </a>
            <a href={kofiUrl} target="_blank" rel="noreferrer" className="secondary-button">
              <Coffee className="h-4 w-4" />
              Ko-fi
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="text-base font-semibold text-frost">{value}</span>
    </div>
  );
}
