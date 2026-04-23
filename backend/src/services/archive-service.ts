import { pool } from "../db/pool";
import type {
  ManualArchiveStat,
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
        available_participants AS "availableParticipants",
        alliance_score AS "allianceScore",
        difficulty_level AS "difficultyLevel",
        difficulty_note AS "difficultyNote",
        event_log AS "eventLog",
        manual_stats AS "manualStats"
      FROM weekly_archives
      ORDER BY archived_at DESC
      LIMIT 30
    `
  );

  return result.rows.map((archive) => ({
    ...archive,
    manualStats: normalizeManualStats(archive.manualStats)
  }));
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
        alliance_score AS "allianceScore",
        difficulty_level AS "difficultyLevel",
        difficulty_note AS "difficultyNote",
        event_log AS "eventLog",
        manual_stats AS "manualStats",
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
    manualStats: normalizeManualStats(archive.manualStats),
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
        alliance_score AS "allianceScore",
        difficulty_level AS "difficultyLevel",
        difficulty_note AS "difficultyNote",
        event_log AS "eventLog",
        manual_stats AS "manualStats",
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

export async function updateWeeklyArchiveMetadata(
  id: string,
  input: {
    allianceScore: number | null;
    difficultyLevel: string | null;
    difficultyNote: string | null;
    eventLog: string | null;
    manualStats: ManualArchiveStat[];
  }
): Promise<WeeklyArchiveSummary> {
  const result = await pool.query<WeeklyArchiveSummary>(
    `
      UPDATE weekly_archives
      SET
        alliance_score = $2,
        difficulty_level = $3,
        difficulty_note = $4,
        event_log = $5,
        manual_stats = $6::jsonb
      WHERE id = $1
      RETURNING
        id,
        archived_at AS "archivedAt",
        registration_count AS "registrationCount",
        total_troops AS "totalTroops",
        available_participants AS "availableParticipants",
        alliance_score AS "allianceScore",
        difficulty_level AS "difficultyLevel",
        difficulty_note AS "difficultyNote",
        event_log AS "eventLog",
        manual_stats AS "manualStats"
    `,
    [
      id,
      input.allianceScore,
      input.difficultyLevel,
      input.difficultyNote,
      input.eventLog,
      JSON.stringify(input.manualStats)
    ]
  );

  const archive = result.rows[0];

  if (!archive) {
    throw new HttpError(404, "Archive not found.");
  }

  return {
    ...archive,
    manualStats: normalizeManualStats(archive.manualStats)
  };
}

function normalizeManualStats(value: unknown): ManualArchiveStat[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }

    const stat = entry as Partial<ManualArchiveStat>;

    if (typeof stat.label !== "string" || typeof stat.value !== "number" || !Number.isFinite(stat.value)) {
      return [];
    }

    const label = stat.label.trim();

    if (!label) {
      return [];
    }

    return [
      {
        label,
        value: stat.value
      }
    ];
  });
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
