import { BarChart3, Crown, Shield, Sparkles, Swords, Users2 } from "lucide-react";
import { useMemo } from "react";
import type { Registration, StatsResponse } from "../types/registration";

const GROUP_SIZE = 7;

interface ReinforcementGroupsPanelProps {
  registrations: Registration[];
  hasActiveFilters: boolean;
  topPartners: StatsResponse["topPartners"];
}

interface SuggestedGroup {
  id: string;
  members: Registration[];
  totalTroops: number;
  highestTier: number;
  balanceLabel: string;
  balanceScore: number;
  missingSlots: number;
  reasons: string[];
}

interface GroupDraft {
  members: Registration[];
  totalStrength: number;
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
  hasActiveFilters,
  topPartners
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
            Suggested 6-march cells
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Each target group aims for 7 available players: one city owner plus 6 reinforcement partners, matching the
            alliance strategy of emptying cities and deploying all marches.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Available pool</p>
            <p className="mt-1 text-2xl font-semibold text-frost">{availableRegistrations.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">6-march cells</p>
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
            Add available registrations to generate 6-march reinforcement cells.
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
                      <p className="text-base font-semibold text-frost">Cell {index + 1}</p>
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                        {group.missingSlots === 0 ? "Full 7-player cell" : `${group.missingSlots} slot${group.missingSlots > 1 ? "s" : ""} open`}
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

                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                    <MetricCard label="Members" value={`${group.members.length}/${GROUP_SIZE}`} />
                    <MetricCard label="Group troops" value={group.totalTroops.toLocaleString("en-US")} />
                    <MetricCard label="Highest tier" value={`T${group.highestTier}`} />
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
                      {registration.troopCount.toLocaleString("en-US")} troops / T{registration.troopLevel}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <TopPartnersPanel topPartners={topPartners} />

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-emerald-200">
                <Swords className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">How cells are scored</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                <li>Groups target 7 players so each member can reinforce the other 6 players.</li>
                <li>Partner preferences are kept inside the same cell when possible.</li>
                <li>Troop totals, top tiers, and personal scores are normalized before balancing.</li>
                <li>Incomplete cells show the number of missing players so leadership can fill gaps quickly.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function buildSuggestedGroups(registrations: Registration[]): SuggestedGroup[] {
  if (registrations.length === 0) {
    return [];
  }

  const pairingContext = buildPairingContext(registrations);
  const groupCount = Math.ceil(registrations.length / GROUP_SIZE);
  const drafts: GroupDraft[] = Array.from({ length: groupCount }, () => ({
    members: [],
    totalStrength: 0
  }));

  [...registrations].sort(sortByTroopStrength).forEach((registration) => {
    const targetDraft = selectBestDraft(registration, drafts, pairingContext);
    targetDraft.members.push(registration);
    targetDraft.totalStrength += getPlayerStrengthScore(registration, pairingContext);
  });

  return drafts
    .filter((draft) => draft.members.length > 0)
    .map((draft) => createGroup(draft.members, pairingContext));
}

function selectBestDraft(registration: Registration, drafts: GroupDraft[], pairingContext: PairingContext) {
  const availableDrafts = drafts.filter((draft) => draft.members.length < GROUP_SIZE);

  return availableDrafts.reduce((bestDraft, currentDraft) =>
    getDraftAssignmentScore(registration, currentDraft, pairingContext) <
    getDraftAssignmentScore(registration, bestDraft, pairingContext)
      ? currentDraft
      : bestDraft
  );
}

function getDraftAssignmentScore(registration: Registration, draft: GroupDraft, pairingContext: PairingContext) {
  const preferenceMatches = draft.members.reduce(
    (count, member) => count + getPreferenceMatchCount(registration, member),
    0
  );
  const projectedStrength = draft.totalStrength + getPlayerStrengthScore(registration, pairingContext);

  return projectedStrength - preferenceMatches * 0.6 + draft.members.length * 0.03;
}

function createGroup(members: Registration[], pairingContext: PairingContext): SuggestedGroup {
  const orderedMembers = [...members].sort(sortByTroopStrength);
  const missingSlots = Math.max(0, GROUP_SIZE - orderedMembers.length);
  const balanceScore = getGroupBalanceScore(orderedMembers, pairingContext);

  return {
    id: orderedMembers.map((member) => member.id).join(":"),
    members: orderedMembers,
    totalTroops: orderedMembers.reduce((sum, member) => sum + member.troopCount, 0),
    highestTier: orderedMembers.reduce((highestTier, member) => Math.max(highestTier, member.troopLevel), 0),
    balanceLabel: getBalanceLabel(balanceScore),
    balanceScore,
    missingSlots,
    reasons: getGroupReasons(orderedMembers, missingSlots)
  };
}

function getGroupReasons(members: Registration[], missingSlots: number) {
  const preferenceMatches = countPreferenceMatches(members);
  const reasons = [
    missingSlots === 0
      ? "Full 6-march cell: each player has six partners inside the group."
      : `Partial 6-march cell: add ${missingSlots} more player${missingSlots > 1 ? "s" : ""}.`,
    "Balanced by troop strength, top tier, personal score, and availability."
  ];

  if (preferenceMatches > 0) {
    reasons.push(`${preferenceMatches} partner preference match${preferenceMatches > 1 ? "es" : ""} kept inside the cell.`);
  } else {
    reasons.push("No existing partner preference match inside this cell yet.");
  }

  return reasons;
}

function countPreferenceMatches(members: Registration[]) {
  let preferenceMatches = 0;

  for (let index = 0; index < members.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < members.length; innerIndex += 1) {
      preferenceMatches += getPreferenceMatchCount(members[index], members[innerIndex]);
    }
  }

  return preferenceMatches;
}

function getPreferenceMatchCount(left: Registration, right: Registration) {
  const leftPrefersRight = left.partnerNames.some((partnerName) => matchesNickname(partnerName, right.nickname));
  const rightPrefersLeft = right.partnerNames.some((partnerName) => matchesNickname(partnerName, left.nickname));

  return Number(leftPrefersRight) + Number(rightPrefersLeft);
}

function buildPairingContext(registrations: Registration[]): PairingContext {
  return {
    maxTroopCount: Math.max(...registrations.map((registration) => registration.troopCount), 1),
    maxPersonalScore: Math.max(...registrations.map((registration) => registration.personalScore ?? 0), 1)
  };
}

function getPlayerStrengthScore(registration: Registration, pairingContext: PairingContext) {
  const troopScore = registration.troopCount / pairingContext.maxTroopCount;
  const tierScore = Math.min(1, Math.max(0, registration.troopLevel - 6) / 10);
  const personalScore = registration.personalScore === null ? 0.5 : registration.personalScore / pairingContext.maxPersonalScore;

  return troopScore * 0.55 + tierScore * 0.25 + personalScore * 0.2;
}

function getGroupBalanceScore(members: Registration[], pairingContext: PairingContext) {
  if (members.length <= 1) {
    return 35;
  }

  const strengths = members.map((member) => getPlayerStrengthScore(member, pairingContext));
  const strongest = Math.max(...strengths);
  const weakest = Math.min(...strengths);
  const gap = Math.min(1, strongest - weakest);
  const completionScore = (members.length / GROUP_SIZE) * 25;

  return Math.max(0, Math.round((1 - gap) * 75 + completionScore));
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

  if (member.id === strongestMember.id) {
    return {
      label: "Cell anchor",
      description: "Strongest profile in this 6-march cell."
    };
  }

  if (hasHighestTier) {
    return {
      label: "Critical wave helper",
      description: "High-tier support for difficult waves."
    };
  }

  if (group.missingSlots > 0) {
    return {
      label: "Coverage partner",
      description: "Helps stabilize an incomplete cell."
    };
  }

  return {
    label: "March partner",
    description: "Reinforce the other 6 members during the event."
  };
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-frost">{value}</p>
    </div>
  );
}

function TopPartnersPanel({ topPartners }: { topPartners: StatsResponse["topPartners"] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-center gap-2 text-amber-200">
        <BarChart3 className="h-4 w-4" />
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">Most selected partners</p>
      </div>

      {topPartners.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-400">
          No partner stats yet. Add registrations to reveal repeated partner choices.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {topPartners.slice(0, 6).map((partner) => (
            <div key={partner.partnerName} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm font-semibold text-frost">{partner.partnerName}</p>
              <p className="mt-1 text-xs text-slate-400">
                {partner.count} registration{partner.count > 1 ? "s" : ""} /{" "}
                {partner.availableTroops.toLocaleString("en-US")} available troops
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, role }: { member: Registration; role: MemberRole }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-frost">{member.nickname}</p>
          <p className="mt-1 text-sm text-slate-300">
            {member.troopCount.toLocaleString("en-US")} troops / T{member.troopLevel}
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
      <p className="mt-1 text-sm text-slate-300">{member.partnerNames.length > 0 ? member.partnerNames.join(", ") : "None"}</p>
    </div>
  );
}

function sortByTroopStrength(left: Registration, right: Registration) {
  return right.troopCount - left.troopCount || right.troopLevel - left.troopLevel;
}

function matchesNickname(partnerName: string, nickname: string) {
  return partnerName.trim().toLowerCase() === nickname.trim().toLowerCase();
}
