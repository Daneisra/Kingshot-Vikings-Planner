import { AlertTriangle, ExternalLink, Shield, Swords, TimerReset, XCircle } from "lucide-react";
import type { GuideNotesSettings } from "../types/settings";

const quickRules = [
  "Empty your city before the event starts so reinforcements get the kills.",
  "Defend other players to maximize your personal score.",
  "Stay online for waves 7, 14, and 17 because only online players are targeted.",
  "Be ready for HQ waves 10 and 20 if leadership assigns you there.",
  "Do not heal during the event unless your leadership explicitly calls for it."
];

const checklist = [
  "Assign a primary partner and a fallback partner.",
  "Move troops out of your city before the first wave.",
  "Keep your strongest defensive setup ready.",
  "Stay close enough to reinforce your assigned targets quickly."
];

const waveStrategy = [
  {
    title: "Waves 1-6",
    focus: "Settle the rotation",
    detail: "Reinforce assigned partners, confirm everyone emptied their city, and avoid burning all marches too early."
  },
  {
    title: "Wave 7",
    focus: "Online-only check",
    detail: "Only online players are targeted. Stay connected and watch for missing players or last-second swaps."
  },
  {
    title: "Waves 8-9",
    focus: "Stabilize before HQ",
    detail: "Return to normal city coverage and keep HQ-assigned players ready for the next wave."
  },
  {
    title: "Wave 10",
    focus: "First HQ defense",
    detail: "Follow leadership calls. HQ anchors should not overcommit to city defense right before this wave."
  },
  {
    title: "Waves 11-16",
    focus: "Maintain coverage",
    detail: "Keep reinforcing partners, track weak spots, and stay online for wave 14."
  },
  {
    title: "Waves 17-20",
    focus: "Final stretch",
    detail: "Wave 17 targets online players, then the event builds toward the final HQ defense on wave 20."
  }
];

const commonMistakes = [
  "Leaving troops at home and stealing kills from allied reinforcements.",
  "Going offline before waves 7, 14, or 17.",
  "Healing mid-event without a leadership call.",
  "Sending HQ-assigned marches away right before waves 10 or 20.",
  "Changing partner targets without telling the group."
];

interface EventGuidePanelProps {
  guideUrl: string;
  guideNotes?: GuideNotesSettings;
}

export function EventGuidePanel({ guideUrl, guideNotes }: EventGuidePanelProps) {
  const hasGuideNotes = Boolean(guideNotes?.isEnabled && guideNotes.title.trim() && guideNotes.notes.trim());

  return (
    <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-slate-950/80 to-slate-950/90 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.22em] text-amber-300">Viking Vengeance guide</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-frost">
            What players should do before the event starts
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            This quick guide turns the main event strategy into simple rules players can follow without
            reading a long doc mid-event.
          </p>
        </div>

        <a href={guideUrl} target="_blank" rel="noreferrer" className="secondary-button shrink-0">
          <ExternalLink className="h-4 w-4" />
          Open full guide
        </a>
      </div>

      <div className="mt-5 space-y-4">
        {hasGuideNotes ? (
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <div className="flex items-center gap-2 text-cyan-100">
              <Shield className="h-4 w-4" />
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">Alliance notes</p>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-frost">{guideNotes?.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-cyan-50/90">{guideNotes?.notes}</p>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-amber-400/20 bg-slate-950/75 p-4">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">Quick rules</p>
            </div>
            <div className="mt-4 space-y-3">
              {quickRules.map((rule) => (
                <div key={rule} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-sm leading-6 text-slate-200">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-4">
              <div className="flex items-center gap-2 text-emerald-200">
                <Swords className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">Scoring focus</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Players score best when they reinforce other cities instead of leaving their own troops at home.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-4">
              <div className="flex items-center gap-2 text-indigo-200">
                <Shield className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">Leader checklist</p>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/75 p-4">
          <div className="flex items-center gap-2 text-cyan-200">
            <TimerReset className="h-4 w-4" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">Wave-by-wave strategy</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {waveStrategy.map((step) => (
              <article key={step.title} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">{step.title}</p>
                <h3 className="mt-2 text-base font-semibold text-frost">{step.focus}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-300/15 bg-rose-300/10 p-4">
          <div className="flex items-center gap-2 text-rose-100">
            <XCircle className="h-4 w-4" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">Common mistakes</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {commonMistakes.map((mistake) => (
              <div key={mistake} className="rounded-2xl border border-rose-100/10 bg-slate-950/55 px-4 py-3">
                <p className="text-sm leading-6 text-rose-50/90">{mistake}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
