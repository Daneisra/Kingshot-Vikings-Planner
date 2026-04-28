import { CheckCircle2, ClipboardCheck, ShieldCheck, Swords, Timer, Users2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const storageKey = "kingshot-vikings-pre-event-checklist";

const checklistItems = [
  {
    id: "empty-city",
    title: "Empty your city troops",
    description: "Send troops away before the first wave so allied reinforcements get the kills in your city.",
    icon: Swords
  },
  {
    id: "heroes-ready",
    title: "Keep your best heroes ready",
    description: "Avoid changing your defensive setup at the last second unless leadership asks for it.",
    icon: ShieldCheck
  },
  {
    id: "availability",
    title: "Confirm your availability",
    description: "Make sure your sign-up still reflects whether you can participate this week.",
    icon: ClipboardCheck
  },
  {
    id: "partners",
    title: "Check your partner plan",
    description: "Know who you reinforce first and who your fallback partner is if targets change.",
    icon: Users2
  },
  {
    id: "join-early",
    title: "Be ready before start",
    description: "Open the game early enough to react before wave 1 and stay online for key waves.",
    icon: Timer
  }
];

function readChecklistState() {
  const rawValue = localStorage.getItem(storageKey);

  if (!rawValue) {
    return new Set<string>();
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return new Set<string>();
    }

    return new Set(parsedValue.filter((entry): entry is string => typeof entry === "string"));
  } catch {
    localStorage.removeItem(storageKey);
    return new Set<string>();
  }
}

export function PreEventChecklistPanel() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => readChecklistState());
  const completedCount = checkedItems.size;
  const completionPercent = Math.round((completedCount / checklistItems.length) * 100);
  const isComplete = completedCount === checklistItems.length;

  const checkedItemIds = useMemo(() => Array.from(checkedItems), [checkedItems]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checkedItemIds));
  }, [checkedItemIds]);

  function toggleItem(itemId: string) {
    setCheckedItems((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  function resetChecklist() {
    setCheckedItems(new Set());
  }

  return (
    <section className="rounded-3xl border border-emerald-300/15 bg-slate-950/70 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Pre-event checklist</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-frost">Ready before wave 1</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            A short personal checklist for the most common Viking Vengeance preparation mistakes.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Progress</p>
          <p className="mt-1 text-2xl font-semibold text-frost">
            {completedCount}/{checklistItems.length}
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-amber-300 transition-all duration-300"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-5">
        {checklistItems.map((item) => {
          const Icon = item.icon;
          const isChecked = checkedItems.has(item.id);

          return (
            <button
              key={item.id}
              type="button"
              className={`rounded-2xl border p-4 text-left transition ${
                isChecked
                  ? "border-emerald-300/30 bg-emerald-300/10"
                  : "border-white/10 bg-slate-950/70 hover:border-amber-300/30 hover:bg-white/5"
              }`}
              onClick={() => toggleItem(item.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`rounded-2xl border p-3 ${
                    isChecked
                      ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-100"
                      : "border-white/10 bg-white/5 text-amber-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <CheckCircle2 className={`h-5 w-5 ${isChecked ? "text-emerald-200" : "text-slate-600"}`} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-frost">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${isComplete ? "text-emerald-200" : "text-slate-400"}`}>
          {isComplete
            ? "Checklist complete. You are ready for the event."
            : "This checklist is saved on this device only."}
        </p>
        <button type="button" className="secondary-button" onClick={resetChecklist} disabled={completedCount === 0}>
          Reset checklist
        </button>
      </div>
    </section>
  );
}
