import { BarChart3, Shield, Swords, Users } from "lucide-react";
import type { StatsResponse } from "../types/registration";

interface StatsCardsProps {
  stats: StatsResponse;
  warningMessage?: string;
}

const formatter = new Intl.NumberFormat("en-US");

export function StatsCards({ stats, warningMessage }: StatsCardsProps) {
  const cards = [
    {
      label: "Participants",
      value: formatter.format(stats.totalParticipants),
      icon: Users
    },
    {
      label: "Total Troops",
      value: formatter.format(stats.totalTroops),
      icon: Swords
    },
    {
      label: "Average Level",
      value: stats.averageTroopLevel.toFixed(1),
      icon: Shield
    },
    {
      label: "Top Partners",
      value: formatter.format(stats.topPartners.length),
      icon: BarChart3
    }
  ];

  return (
    <section className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold text-frost">{card.value}</p>
              </div>
              <card.icon className="h-8 w-8 text-amber-300" />
            </div>
          </article>
        ))}
      </div>

      {warningMessage ? (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-100">
          {warningMessage}
        </p>
      ) : null}
    </section>
  );
}
