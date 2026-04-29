import { AlertTriangle, Crown, ShieldAlert, Users2 } from "lucide-react";
import type { Registration } from "../types/registration";

interface HqDefensePlannerPanelProps {
  registrations: Registration[];
}

interface HqWavePlan {
  wave: 10 | 20;
  title: string;
  description: string;
  anchors: Registration[];
  support: Registration[];
  backups: Registration[];
}

export function HqDefensePlannerPanel({ registrations }: HqDefensePlannerPanelProps) {
  const availablePlayers = registrations
    .filter((registration) => registration.isAvailable)
    .sort(sortByHqPriority);
  const wave10Plan = buildHqWavePlan(10, availablePlayers);
  const wave20Plan = buildHqWavePlan(20, availablePlayers);
  const totalAvailableTroops = availablePlayers.reduce((sum, registration) => sum + registration.troopCount, 0);

  return (
    <section className="rounded-3xl border border-indigo-300/15 bg-slate-950/70 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">HQ defense planner</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-frost">Wave 10 and 20 assignments</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Suggested HQ anchors and support players based on availability, troops, tier, and personal score.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Available players</p>
            <p className="mt-1 text-2xl font-semibold text-frost">{availablePlayers.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Available troops</p>
            <p className="mt-1 text-2xl font-semibold text-frost">{totalAvailableTroops.toLocaleString("en-US")}</p>
          </div>
        </div>
      </div>

      {availablePlayers.length < 3 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-base font-semibold text-frost">Not enough available players for an HQ plan</p>
          <p className="mt-2 text-sm text-slate-400">
            Add at least three available players to create useful HQ anchor and support suggestions.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <HqWaveCard plan={wave10Plan} />
          <HqWaveCard plan={wave20Plan} />
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
          <div>
            <p className="text-sm font-semibold text-amber-100">Leadership check</p>
            <p className="mt-1 text-sm leading-6 text-amber-50/80">
              Treat this as a planning aid. Final HQ calls should still account for who is online, march timing, and last-minute event instructions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HqWaveCard({ plan }: { plan: HqWavePlan }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wave {plan.wave}</p>
          <h3 className="mt-1 text-xl font-semibold text-frost">{plan.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{plan.description}</p>
        </div>
        <div className="rounded-2xl border border-indigo-300/20 bg-indigo-300/10 p-3 text-indigo-100">
          <ShieldAlert className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <AssignmentBlock
          title="Anchors"
          description="Strongest players to prioritize for HQ defense."
          players={plan.anchors}
          tone="gold"
        />
        <AssignmentBlock
          title="Support"
          description="Secondary wave coverage and reinforcement support."
          players={plan.support}
          tone="blue"
        />
        <AssignmentBlock
          title="Backups"
          description="Fallback players if an anchor is late or unavailable."
          players={plan.backups}
          tone="slate"
        />
      </div>
    </article>
  );
}

function AssignmentBlock({
  title,
  description,
  players,
  tone
}: {
  title: string;
  description: string;
  players: Registration[];
  tone: "gold" | "blue" | "slate";
}) {
  const toneClassName =
    tone === "gold"
      ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
      : tone === "blue"
        ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
        : "border-white/10 bg-white/5 text-slate-200";

  return (
    <div>
      <div className="flex items-center gap-2">
        {tone === "gold" ? <Crown className="h-4 w-4 text-amber-300" /> : <Users2 className="h-4 w-4 text-slate-300" />}
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">{title}</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-3 grid gap-2">
        {players.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-sm text-slate-500">
            No player available for this slot.
          </p>
        ) : (
          players.map((player) => (
            <div key={`${title}-${player.id}`} className={`rounded-xl border px-3 py-2 ${toneClassName}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{player.nickname}</p>
                <p className="text-xs">
                  {player.troopCount.toLocaleString("en-US")} troops - T{player.troopLevel}
                </p>
              </div>
              <p className="mt-1 text-xs opacity-80">
                Partners: {player.partnerNames.length > 0 ? player.partnerNames.join(", ") : "None listed"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function buildHqWavePlan(wave: 10 | 20, players: Registration[]): HqWavePlan {
  const anchorCount = wave === 20 ? 3 : 2;
  const supportCount = wave === 20 ? 4 : 3;
  const anchors = players.slice(0, anchorCount);
  const support = players.slice(anchorCount, anchorCount + supportCount);
  const backups = players.slice(anchorCount + supportCount, anchorCount + supportCount + 3);

  return {
    wave,
    title: wave === 20 ? "Final HQ hold" : "First HQ defense check",
    description:
      wave === 20
        ? "Use the strongest available anchors and keep enough backups ready for the final HQ hit."
        : "Keep the first HQ assignment tight so the rest of the event does not lose city coverage.",
    anchors,
    support,
    backups
  };
}

function sortByHqPriority(left: Registration, right: Registration) {
  return getHqPriorityScore(right) - getHqPriorityScore(left);
}

function getHqPriorityScore(registration: Registration) {
  const scoreValue = registration.personalScore ?? 0;
  return registration.troopCount * 0.6 + registration.troopLevel * 50000 + scoreValue * 0.15;
}
