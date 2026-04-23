import { pool } from "../db/pool";
import type {
  PersonalScoreTrend,
  RegistrationRecord,
  WeeklyArchiveDetail,
  WeeklyArchiveSummary
} from "../types/registration";
import { HttpError } from "../utils/http-error";

export async function listWeeklyArchives(): Promise<WeeklyArchiveSummary[]> {
  const result = await pool.query<WeeklyArchiveSummary>(
    `
      SELECT
        id,
        archived_at AS "archivedAt",
        registration_count AS "registrationCount",
        total_troops AS "totalTroops",
        available_participants AS "availableParticipants"
      FROM weekly_archives
      ORDER BY archived_at DESC
      LIMIT 30
    `
  );

  return result.rows;
}

export async function getWeeklyArchive(id: string): Promise<WeeklyArchiveDetail> {
  const result = await pool.query<WeeklyArchiveDetail & { registrations: unknown }>(
    `
      SELECT
        id,
        archived_at AS "archivedAt",
        registration_count AS "registrationCount",
        total_troops AS "totalTroops",
        available_participants AS "availableParticipants",
        registrations
      FROM weekly_archives
      WHERE id = $1
    `,
    [id]
  );

  const archive = result.rows[0];

  if (!archive) {
    throw new HttpError(404, "Archive not found.");
  }

  return {
    ...archive,
    registrations: normalizeArchivedRegistrations(archive.registrations)
  };
}

export async function listPersonalScoreTrends(): Promise<PersonalScoreTrend[]> {
  const result = await pool.query<
    WeeklyArchiveSummary & {
      registrations: unknown;
    }
  >(
    `
      SELECT
        id,
        archived_at AS "archivedAt",
        registration_count AS "registrationCount",
        total_troops AS "totalTroops",
        available_participants AS "availableParticipants",
        registrations
      FROM weekly_archives
      ORDER BY archived_at DESC
      LIMIT 2
    `
  );

  const [currentArchive, previousArchive] = result.rows;

  if (!currentArchive || !previousArchive) {
    return [];
  }

  const currentRegistrations = normalizeArchivedRegistrations(currentArchive.registrations);
  const previousRegistrations = normalizeArchivedRegistrations(previousArchive.registrations);
  const previousScoresByNickname = new Map(
    previousRegistrations
      .filter((registration) => registration.personalScore !== null)
      .map((registration) => [registration.nickname.trim().toLowerCase(), registration.personalScore as number])
  );

  return currentRegistrations
    .filter((registration) => registration.personalScore !== null)
    .flatMap((registration) => {
      const previousScore = previousScoresByNickname.get(registration.nickname.trim().toLowerCase());

      if (typeof previousScore !== "number") {
        return [];
      }

      const currentScore = registration.personalScore as number;

      return [
        {
          nickname: registration.nickname,
          currentScore,
          previousScore,
          scoreDelta: currentScore - previousScore,
          currentArchivedAt: currentArchive.archivedAt,
          previousArchivedAt: previousArchive.archivedAt
        }
      ];
    })
    .sort((left, right) => right.scoreDelta - left.scoreDelta || right.currentScore - left.currentScore)
    .slice(0, 10);
}

function normalizeArchivedRegistrations(value: unknown): RegistrationRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }

    const registration = entry as Partial<RegistrationRecord>;

    if (
      typeof registration.id !== "string" ||
      typeof registration.nickname !== "string" ||
      typeof registration.partnerName !== "string"
    ) {
      return [];
    }

    return [
      {
        id: registration.id,
        nickname: registration.nickname,
        partnerName: registration.partnerName,
        partnerNames: Array.isArray(registration.partnerNames)
          ? registration.partnerNames.filter((partnerName): partnerName is string => typeof partnerName === "string")
          : [registration.partnerName],
        troopCount: Number(registration.troopCount ?? 0),
        troopLevel: Number(registration.troopLevel ?? 0),
        troopLoadout: Array.isArray(registration.troopLoadout) ? registration.troopLoadout : [],
        personalScore:
          typeof registration.personalScore === "number" && Number.isFinite(registration.personalScore)
            ? registration.personalScore
            : null,
        comment: typeof registration.comment === "string" ? registration.comment : null,
        isAvailable: Boolean(registration.isAvailable),
        createdAt: String(registration.createdAt ?? ""),
        updatedAt: String(registration.updatedAt ?? "")
      }
    ];
  });
}
