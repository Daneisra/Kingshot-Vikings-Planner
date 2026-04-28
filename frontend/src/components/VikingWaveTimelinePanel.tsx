import { AlertTriangle, Building2, RadioTower, ShieldAlert } from "lucide-react";

type WaveKind = "standard" | "online" | "hq";

interface WaveInfo {
  number: number;
  kind: WaveKind;
  title: string;
  description: string;
}

interface VikingWaveTimelinePanelProps {
  compact?: boolean;
}

function getWaveInfo(number: number): WaveInfo {
  if ([7, 14, 17].includes(number)) {
    return {
      number,
      kind: "online",
      title: "Online targets",
      description: "Only online players are targeted. Stay connected and ready to reinforce."
    };
  }

  if ([10, 20].includes(number)) {
    return {
      number,
      kind: "hq",
      title: number === 20 ? "Final HQ wave" : "HQ defense",
      description: "Alliance HQ is targeted. Follow leadership assignments and avoid overcommitting."
    };
  }

  return {
    number,
    kind: "standard",
    title: "City defense",
    description: "Standard city wave. Reinforce assigned players and keep your own city empty."
  };
}

const waves = Array.from({ length: 20 }, (_value, index) => getWaveInfo(index + 1));

const styleByKind: Record<
  WaveKind,
  {
    badgeClassName: string;
    cardClassName: string;
    icon: typeof Building2;
    label: string;
  }
> = {
  standard: {
    badgeClassName: "bg-slate-700/70 text-slate-200",
    cardClassName: "border-white/10 bg-slate-950/70",
    icon: Building2,
    label: "Standard"
  },
  online: {
    badgeClassName: "bg-cyan-300/15 text-cyan-100",
    cardClassName: "border-cyan-300/30 bg-cyan-300/10",
    icon: RadioTower,
    label: "Online"
  },
  hq: {
    badgeClassName: "bg-amber-300/15 text-amber-100",
    cardClassName: "border-amber-300/30 bg-amber-300/10",
    icon: ShieldAlert,
    label: "HQ"
  }
};

export function VikingWaveTimelinePanel({ compact = false }: VikingWaveTimelinePanelProps) {
  const visibleWaves = compact ? waves.filter((wave) => wave.kind !== "standard") : waves;

  return (
    <section className="rounded-3xl border border-cyan-300/15 bg-slate-950/70 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-300">
            {compact ? "Critical waves" : "Wave timeline"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-frost">
            {compact ? "Waves players should not miss" : "Viking Vengeance wave timeline"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            {compact
              ? "Keep these waves visible before and during the event. They change targeting and HQ defense priorities."
              : "Use this as a quick reference for standard city waves, online-only targeting, and Alliance HQ defense."}
          </p>
        </div>

        <div className="grid w-full gap-2 text-sm sm:w-auto sm:grid-cols-2">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
            <p className="font-semibold text-cyan-100">7, 14, 17</p>
            <p className="mt-1 text-xs text-cyan-50/75">Online players only</p>
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3">
            <p className="font-semibold text-amber-100">10, 20</p>
            <p className="mt-1 text-xs text-amber-50/75">Alliance HQ waves</p>
          </div>
        </div>
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"}`}>
        {visibleWaves.map((wave) => {
          const style = styleByKind[wave.kind];
          const Icon = style.icon;

          return (
            <article key={wave.number} className={`rounded-2xl border p-4 ${style.cardClassName}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wave</p>
                  <p className="mt-1 text-3xl font-semibold text-frost">{wave.number}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badgeClassName}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {style.label}
                </span>
              </div>

              <h3 className="mt-4 text-base font-semibold text-frost">{wave.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{wave.description}</p>

              {wave.kind !== "standard" ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  Leadership priority
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
