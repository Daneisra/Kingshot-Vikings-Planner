import { Shield, Sparkles, Swords, Users2 } from "lucide-react";
import { useMemo } from "react";
import type { Registration } from "../types/registration";

interface ReinforcementGroupsPanelProps {
  registrations: Registration[];
  hasActiveFilters: boolean;
}

interface SuggestedGroup {
  id: string;
  members: Registration[];
  totalTroops: number;
  highestTier: number;
  reasons: string[];
}

interface PairCandidate {
  members: [Registration, Registration];
  score: number;
  reasons: string[];
}

export function ReinforcementGroupsPanel({
  registrations,
  hasActiveFilters
}: ReinforcementGroupsPanelProps) {
  const availableRegistrations = useMemo(
    () =>
      registrations
        .filter((registration) => registration.isAvailable)
        .sort((left, right) => right.troopCount - left.troopCount || right.troopLevel - left.troopLevel),
    [registrations]
  );

  const suggestedGroups = useMemo(() => buildSuggestedGroups(availableRegistrations), [availableRegistrations]);
  const hqAnchors = availableRegistrations.slice(0, 2);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Auto groups</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-frost">
            Suggested reinforcement groups
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Suggestions are based on current availability, troop strength, top tier, and partner preferences.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Available pool</p>
            <p className="mt-1 text-2xl font-semibold text-frost">{availableRegistrations.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Suggested groups</p>
            <p className="mt-1 text-2xl font-semibold text-frost">{suggestedGroups.length}</p>
          </div>
        </div>
      </div>

      {hasActiveFilters ? (
        <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-100">
          Current filters are active. Group suggestions only use the players currently visible on the board.
        </p>
      ) : null}

      {availableRegistrations.length < 2 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-6 text-center">
          <Users2 className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-base font-semibold text-frost">Not enough available players yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Add at least two available registrations to generate reinforcement groups.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            {suggestedGroups.map((group, index) => (
              <article
                key={group.id}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-frost">Group {index + 1}</p>
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                        {group.members.length === 3 ? "Trio fallback" : "Balanced pair"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.members.map((member) => (
                        <span
                          key={member.id}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-frost"
                        >
                          {member.nickname}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[260px]">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Group troops</p>
                      <p className="mt-1 text-lg font-semibold text-frost">
                        {group.totalTroops.toLocaleString("en-US")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Highest tier</p>
                      <p className="mt-1 text-lg font-semibold text-frost">T{group.highestTier}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.members.map((member) => (
                    <div
                      key={`${group.id}-${member.id}-details`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-frost">{member.nickname}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {member.troopCount.toLocaleString("en-US")} troops · T{member.troopLevel}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Partner pool</p>
                      <p className="mt-1 text-sm text-slate-300">{member.partnerNames.join(", ")}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {group.reasons.map((reason) => (
                    <span
                      key={`${group.id}-${reason}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      {reason}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-indigo-200">
                <Shield className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">HQ anchors</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The strongest available players are the safest first pick for waves 10 and 20.
              </p>
              <div className="mt-4 space-y-3">
                {hqAnchors.map((registration) => (
                  <div
                    key={`${registration.id}-hq`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-frost">{registration.nickname}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {registration.troopCount.toLocaleString("en-US")} troops · T{registration.troopLevel}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-emerald-200">
                <Swords className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">How groups are scored</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                <li>Mutual partner preferences are weighted highest.</li>
                <li>Similar troop totals are favored to avoid weak links.</li>
                <li>Close top tiers improve balance for the same wave load.</li>
                <li>Odd rosters create one trio fallback instead of a dead slot.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function buildSuggestedGroups(registrations: Registration[]): SuggestedGroup[] {
  const pairCandidates = buildPairCandidates(registrations);
  const usedRegistrationIds = new Set<string>();
  const groups: SuggestedGroup[] = [];

  pairCandidates.forEach((candidate) => {
    const [left, right] = candidate.members;

    if (usedRegistrationIds.has(left.id) || usedRegistrationIds.has(right.id)) {
      return;
    }

    usedRegistrationIds.add(left.id);
    usedRegistrationIds.add(right.id);

    groups.push(createGroup([left, right], candidate.reasons));
  });

  const leftovers = registrations.filter((registration) => !usedRegistrationIds.has(registration.id));

  if (leftovers.length === 1 && groups.length > 0) {
    const leftover = leftovers[0];
    const targetGroup = groups.reduce((bestGroup, currentGroup) => {
      const currentGap = Math.abs(currentGroup.totalTroops - leftover.troopCount);
      const bestGap = Math.abs(bestGroup.totalTroops - leftover.troopCount);
      return currentGap < bestGap ? currentGroup : bestGroup;
    });

    targetGroup.members.push(leftover);
    targetGroup.members.sort((left, right) => right.troopCount - left.troopCount);
    targetGroup.totalTroops += leftover.troopCount;
    targetGroup.highestTier = Math.max(targetGroup.highestTier, leftover.troopLevel);
    targetGroup.reasons = [...targetGroup.reasons, "Odd roster fallback with the closest available fit."];
    return groups;
  }

  if (leftovers.length > 0) {
    leftovers.forEach((registration) => {
      groups.push(createGroup([registration], ["Fallback single slot. Add more available players for pairing."]));
    });
  }

  return groups;
}

function buildPairCandidates(registrations: Registration[]): PairCandidate[] {
  const candidates: PairCandidate[] = [];

  for (let index = 0; index < registrations.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < registrations.length; innerIndex += 1) {
      const left = registrations[index];
      const right = registrations[innerIndex];
      const reasons = getCompatibilityReasons(left, right);

      candidates.push({
        members: [left, right],
        score: getPairScore(left, right, reasons),
        reasons
      });
    }
  }

  return candidates.sort((left, right) => right.score - left.score);
}

function getPairScore(left: Registration, right: Registration, reasons: string[]) {
  const troopGapRatio = Math.abs(left.troopCount - right.troopCount) / Math.max(left.troopCount, right.troopCount, 1);
  const troopBalanceScore = Math.round((1 - troopGapRatio) * 90);
  const tierBalanceScore = Math.max(0, 35 - Math.abs(left.troopLevel - right.troopLevel) * 12);
  const preferenceScore = reasons.reduce((score, reason) => {
    if (reason.includes("Mutual")) {
      return score + 140;
    }

    if (reason.includes("Partner preference")) {
      return score + 80;
    }

    if (reason.includes("Balanced")) {
      return score + 40;
    }

    if (reason.includes("Similar")) {
      return score + 30;
    }

    return score;
  }, 0);

  return preferenceScore + troopBalanceScore + tierBalanceScore;
}

function getCompatibilityReasons(left: Registration, right: Registration) {
  const reasons: string[] = [];
  const leftPrefersRight = left.partnerNames.some((partnerName) => matchesNickname(partnerName, right.nickname));
  const rightPrefersLeft = right.partnerNames.some((partnerName) => matchesNickname(partnerName, left.nickname));
  const troopGapRatio = Math.abs(left.troopCount - right.troopCount) / Math.max(left.troopCount, right.troopCount, 1);
  const tierGap = Math.abs(left.troopLevel - right.troopLevel);

  if (leftPrefersRight && rightPrefersLeft) {
    reasons.push("Mutual partner preference match.");
  } else if (leftPrefersRight || rightPrefersLeft) {
    reasons.push("Partner preference match.");
  }

  if (troopGapRatio <= 0.22) {
    reasons.push("Balanced troop counts.");
  }

  if (tierGap <= 1) {
    reasons.push("Similar top troop tiers.");
  }

  if (reasons.length === 0) {
    reasons.push("Closest available strength balance.");
  }

  return reasons;
}

function createGroup(members: Registration[], reasons: string[]): SuggestedGroup {
  const orderedMembers = [...members].sort((left, right) => right.troopCount - left.troopCount);

  return {
    id: orderedMembers.map((member) => member.id).join(":"),
    members: orderedMembers,
    totalTroops: orderedMembers.reduce((sum, member) => sum + member.troopCount, 0),
    highestTier: orderedMembers.reduce((highestTier, member) => Math.max(highestTier, member.troopLevel), 0),
    reasons
  };
}

function matchesNickname(partnerName: string, nickname: string) {
  return partnerName.trim().toLowerCase() === nickname.trim().toLowerCase();
}
