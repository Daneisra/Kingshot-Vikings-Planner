import { Crown, Shield, Sparkles, Swords, Users2 } from "lucide-react";
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
  balanceLabel: string;
  balanceScore: number;
  reasons: string[];
}

interface PairCandidate {
  members: [Registration, Registration];
  score: number;
  reasons: string[];
}

interface PairingContext {
  maxTroopCount: number;
  maxPersonalScore: number;
}

interface MemberRole {
  label: string;
  description: string;
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
            Suggestions are based on availability, partner preferences, troop strength, top tier, personal score, and fair distribution.
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
                        {group.members.length === 3 ? "Trio fallback" : group.members.length === 1 ? "Single fallback" : "Balanced pair"}
                      </span>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                        {group.balanceLabel} balance
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Score {group.balanceScore}/100
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
                    <MemberCard
                      key={`${group.id}-${member.id}-details`}
                      member={member}
                      role={getMemberRole(member, group)}
                    />
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
                <li>Troop totals, top tiers, and personal scores are normalized before pairing.</li>
                <li>Similar player strength is favored to avoid weak links.</li>
                <li>Fallback players are assigned to the weakest group first.</li>
                <li>Each player gets a role hint to make the suggestion easier to act on.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function buildSuggestedGroups(registrations: Registration[]): SuggestedGroup[] {
  const pairingContext = buildPairingContext(registrations);
  const pairCandidates = buildPairCandidates(registrations, pairingContext);
  const usedRegistrationIds = new Set<string>();
  const groups: SuggestedGroup[] = [];

  pairCandidates.forEach((candidate) => {
    const [left, right] = candidate.members;

    if (usedRegistrationIds.has(left.id) || usedRegistrationIds.has(right.id)) {
      return;
    }

    usedRegistrationIds.add(left.id);
    usedRegistrationIds.add(right.id);

    groups.push(createGroup([left, right], candidate.reasons, pairingContext));
  });

  const leftovers = registrations.filter((registration) => !usedRegistrationIds.has(registration.id));

  if (leftovers.length === 1 && groups.length > 0) {
    const leftover = leftovers[0];
    const targetGroup = groups.reduce((bestGroup, currentGroup) =>
      currentGroup.totalTroops < bestGroup.totalTroops ? currentGroup : bestGroup
    );

    targetGroup.members.push(leftover);
    targetGroup.members.sort(sortByTroopStrength);
    targetGroup.totalTroops += leftover.troopCount;
    targetGroup.highestTier = Math.max(targetGroup.highestTier, leftover.troopLevel);
    targetGroup.balanceScore = getGroupBalanceScore(targetGroup.members, pairingContext);
    targetGroup.balanceLabel = getBalanceLabel(targetGroup.balanceScore);
    targetGroup.reasons = [...targetGroup.reasons, "Odd roster fallback assigned to the weakest group."];
    return groups;
  }

  leftovers.forEach((registration) => {
    groups.push(createGroup([registration], ["Fallback single slot. Add more available players for pairing."], pairingContext));
  });

  return groups;
}

function buildPairCandidates(registrations: Registration[], pairingContext: PairingContext): PairCandidate[] {
  const candidates: PairCandidate[] = [];

  for (let index = 0; index < registrations.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < registrations.length; innerIndex += 1) {
      const left = registrations[index];
      const right = registrations[innerIndex];
      const reasons = getCompatibilityReasons(left, right);

      candidates.push({
        members: [left, right],
        score: getPairScore(left, right, reasons, pairingContext),
        reasons
      });
    }
  }

  return candidates.sort((left, right) => right.score - left.score);
}

function getPairScore(left: Registration, right: Registration, reasons: string[], pairingContext: PairingContext) {
  const strengthGap = Math.abs(getPlayerStrengthScore(left, pairingContext) - getPlayerStrengthScore(right, pairingContext));
  const strengthBalanceScore = Math.round((1 - strengthGap) * 110);
  const tierBalanceScore = Math.max(0, 35 - Math.abs(left.troopLevel - right.troopLevel) * 12);
  const personalScoreBonus =
    left.personalScore !== null && right.personalScore !== null
      ? Math.max(
          0,
          35 - (Math.abs(left.personalScore - right.personalScore) / Math.max(pairingContext.maxPersonalScore, 1)) * 35
        )
      : 0;
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

    if (reason.includes("Close personal")) {
      return score + 25;
    }

    return score;
  }, 0);

  return preferenceScore + strengthBalanceScore + tierBalanceScore + personalScoreBonus;
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

  if (left.personalScore !== null && right.personalScore !== null) {
    const personalScoreGapRatio = Math.abs(left.personalScore - right.personalScore) / Math.max(left.personalScore, right.personalScore, 1);

    if (personalScoreGapRatio <= 0.25) {
      reasons.push("Close personal score range.");
    }
  }

  if (reasons.length === 0) {
    reasons.push("Closest available strength balance.");
  }

  return reasons;
}

function createGroup(members: Registration[], reasons: string[], pairingContext: PairingContext): SuggestedGroup {
  const orderedMembers = [...members].sort(sortByTroopStrength);
  const balanceScore = getGroupBalanceScore(orderedMembers, pairingContext);

  return {
    id: orderedMembers.map((member) => member.id).join(":"),
    members: orderedMembers,
    totalTroops: orderedMembers.reduce((sum, member) => sum + member.troopCount, 0),
    highestTier: orderedMembers.reduce((highestTier, member) => Math.max(highestTier, member.troopLevel), 0),
    balanceLabel: getBalanceLabel(balanceScore),
    balanceScore,
    reasons
  };
}

function buildPairingContext(registrations: Registration[]): PairingContext {
  return {
    maxTroopCount: Math.max(...registrations.map((registration) => registration.troopCount), 1),
    maxPersonalScore: Math.max(...registrations.map((registration) => registration.personalScore ?? 0), 1)
  };
}

function getPlayerStrengthScore(registration: Registration, pairingContext: PairingContext) {
  const troopScore = registration.troopCount / pairingContext.maxTroopCount;
  const tierScore = Math.max(0, registration.troopLevel - 6) / 5;
  const personalScore = registration.personalScore === null ? 0.5 : registration.personalScore / pairingContext.maxPersonalScore;

  return troopScore * 0.55 + tierScore * 0.25 + personalScore * 0.2;
}

function getGroupBalanceScore(members: Registration[], pairingContext: PairingContext) {
  if (members.length <= 1) {
    return 45;
  }

  const strengths = members.map((member) => getPlayerStrengthScore(member, pairingContext));
  const strongest = Math.max(...strengths);
  const weakest = Math.min(...strengths);
  const gap = Math.min(1, strongest - weakest);

  return Math.max(0, Math.round((1 - gap) * 100));
}

function getBalanceLabel(balanceScore: number) {
  if (balanceScore >= 85) {
    return "Strong";
  }

  if (balanceScore >= 70) {
    return "Good";
  }

  if (balanceScore >= 55) {
    return "Uneven";
  }

  return "Fallback";
}

function getMemberRole(member: Registration, group: SuggestedGroup): MemberRole {
  const strongestMember = group.members[0];
  const hasHighestTier = member.troopLevel === group.highestTier;
  const lowestTroopCount = Math.min(...group.members.map((groupMember) => groupMember.troopCount));

  if (member.id === strongestMember.id) {
    return {
      label: "Rally lead",
      description: "Highest troop anchor for the group."
    };
  }

  if (hasHighestTier) {
    return {
      label: "HQ helper",
      description: "Strong tier profile for critical waves."
    };
  }

  if (member.troopCount === lowestTroopCount && group.members.length === 3) {
    return {
      label: "Backup",
      description: "Fallback support for odd roster coverage."
    };
  }

  return {
    label: "Support",
    description: "Reinforce assigned targets and follow the lead."
  };
}

function MemberCard({ member, role }: { member: Registration; role: MemberRole }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-frost">{member.nickname}</p>
          <p className="mt-1 text-sm text-slate-300">
            {member.troopCount.toLocaleString("en-US")} troops · T{member.troopLevel}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-100">
          <Crown className="h-3.5 w-3.5" />
          {role.label}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{role.description}</p>
      {member.personalScore !== null ? (
        <p className="mt-2 text-xs text-slate-400">Personal score: {member.personalScore.toLocaleString("en-US")}</p>
      ) : null}
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Partner pool</p>
      <p className="mt-1 text-sm text-slate-300">{member.partnerNames.join(", ")}</p>
    </div>
  );
}

function sortByTroopStrength(left: Registration, right: Registration) {
  return right.troopCount - left.troopCount || right.troopLevel - left.troopLevel;
}

function matchesNickname(partnerName: string, nickname: string) {
  return partnerName.trim().toLowerCase() === nickname.trim().toLowerCase();
}
