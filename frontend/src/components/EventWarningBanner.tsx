import { AlertTriangle, BellRing, ShieldAlert, Sword } from "lucide-react";
import { useEffect, useState } from "react";
import type { EventWarningSettings } from "../types/settings";

interface WarningItem {
  id: string;
  title: string;
  description: string;
  accentClassName: string;
  icon: typeof AlertTriangle;
}

const warningItems: WarningItem[] = [
  {
    id: "empty-city",
    title: "Empty your city before the event starts",
    description: "Move troops out before the first wave so reinforcements collect the kills in your city.",
    accentClassName: "from-rose-500/25 via-amber-400/20 to-transparent",
    icon: AlertTriangle
  },
  {
    id: "online-waves",
    title: "Stay online for waves 7, 14, and 17",
    description: "These waves only target online players, so your attendance changes the whole reinforcement plan.",
    accentClassName: "from-cyan-500/25 via-sky-400/20 to-transparent",
    icon: BellRing
  },
  {
    id: "hq-waves",
    title: "Prepare HQ defense for waves 10 and 20",
    description: "If you are assigned to HQ, do not overcommit elsewhere right before these waves hit.",
    accentClassName: "from-indigo-500/25 via-violet-400/20 to-transparent",
    icon: ShieldAlert
  },
  {
    id: "healing",
    title: "Do not heal mid-event unless leadership says so",
    description: "Healing can send troops back home too early and reduce the value of allied reinforcements.",
    accentClassName: "from-amber-400/30 via-orange-400/20 to-transparent",
    icon: Sword
  }
];

const rotationIntervalMs = 4500;

interface EventWarningBannerProps {
  customWarning?: EventWarningSettings;
}

export function EventWarningBanner({ customWarning }: EventWarningBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasCustomWarning = Boolean(
    customWarning?.isEnabled && customWarning.title.trim() && customWarning.message.trim()
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % warningItems.length);
    }, rotationIntervalMs);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeWarning = warningItems[activeIndex];
  const ActiveIcon = activeWarning.icon;

  return (
    <section className="rounded-3xl border border-rose-400/20 bg-slate-950/70 p-4 shadow-panel backdrop-blur">
      {hasCustomWarning ? (
        <div className="mb-4 rounded-[1.5rem] border border-amber-300/30 bg-amber-300/10 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-amber-200/20 bg-slate-950/60 p-3 text-amber-100">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                Leadership alert
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-frost">{customWarning?.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-50/90">{customWarning?.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`warning-banner relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-r ${activeWarning.accentClassName} p-5`}
      >
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
              <span className="warning-dot h-2.5 w-2.5 rounded-full bg-rose-300" />
              Event reminder
            </div>
            <div className="mt-4 flex items-start gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-rose-100">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-frost">{activeWarning.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">{activeWarning.description}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px]">
            {warningItems.map((warning, index) => {
              const WarningIcon = warning.icon;
              const isActive = index === activeIndex;

              return (
                <div
                  key={warning.id}
                  className={`rounded-2xl border px-3 py-3 transition ${
                    isActive
                      ? "border-rose-300/35 bg-white/10 text-frost"
                      : "border-white/10 bg-slate-950/55 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <WarningIcon className={`h-4 w-4 ${isActive ? "text-rose-200" : "text-slate-400"}`} />
                    <p className="text-sm font-medium leading-5">{warning.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {warningItems.map((warning, index) => (
            <span
              key={warning.id}
              className={`h-1.5 rounded-full transition ${
                index === activeIndex ? "bg-rose-300" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
