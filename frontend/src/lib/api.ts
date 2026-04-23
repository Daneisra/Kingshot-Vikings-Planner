import type {
  Registration,
  RegistrationFilters,
  RegistrationPayload,
  StatsResponse,
  PersonalScoreTrend,
  WeeklyArchiveSummary
} from "../types/registration";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

interface RequestOptions extends RequestInit {
  adminPassword?: string;
  adminToken?: string;
}

interface ErrorIssue {
  path?: string;
  message: string;
}

interface ErrorPayload {
  message?: string;
  requestId?: string;
  issues?: ErrorIssue[];
}

export interface AdminSessionResponse {
  ok: true;
  token: string;
  expiresAt: string;
}

export class ApiError extends Error {
  status?: number;
  path: string;
  requestId?: string;
  issues: ErrorIssue[];
  isNetworkError: boolean;

  constructor({
    message,
    path,
    status,
    requestId,
    issues = [],
    isNetworkError = false
  }: {
    message: string;
    path: string;
    status?: number;
    requestId?: string;
    issues?: ErrorIssue[];
    isNetworkError?: boolean;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.requestId = requestId;
    this.issues = issues;
    this.isNetworkError = isNetworkError;
  }
}

function buildQuery(filters?: Partial<RegistrationFilters>) {
  const params = new URLSearchParams();

  if (!filters) {
    return "";
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.partner?.trim()) {
    params.set("partner", filters.partner.trim());
  }

  if (filters.available && filters.available !== "all") {
    params.set("available", filters.available);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.adminPassword) {
    headers.set("x-admin-password", options.adminPassword);
  }

  if (options.adminToken) {
    headers.set("x-admin-token", options.adminToken);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    const apiError = new ApiError({
      message: "The API is unreachable. Check the server connection and try again.",
      path,
      isNetworkError: true
    });

    logApiError(apiError, error);
    throw apiError;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
    const apiError = new ApiError({
      message: buildErrorMessage(path, response.status, payload),
      path,
      status: response.status,
      requestId: payload?.requestId ?? response.headers.get("x-request-id") ?? undefined,
      issues: payload?.issues ?? []
    });

    logApiError(apiError);
    throw apiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildErrorMessage(path: string, status: number, payload: ErrorPayload | null) {
  const requestId = payload?.requestId;
  const baseMessage = payload?.message?.trim() || "The request failed.";

  if (status === 400 && payload?.issues?.length) {
    const issueSummary = payload.issues
      .slice(0, 2)
      .map((issue) => issue.message)
      .join(" ");

    return issueSummary ? `${baseMessage} ${issueSummary}` : baseMessage;
  }

  if (status >= 500) {
    return requestId ? `${baseMessage} Reference: ${requestId}.` : baseMessage;
  }

  if (status === 404 && path !== "/registrations") {
    return `${baseMessage} Endpoint: ${path}.`;
  }

  return baseMessage;
}

function logApiError(error: ApiError, cause?: unknown) {
  console.error("[api]", {
    path: error.path,
    status: error.status ?? "network",
    requestId: error.requestId ?? null,
    issues: error.issues,
    message: error.message,
    cause
  });
}

export const api = {
  listRegistrations(filters: RegistrationFilters) {
    return request<Registration[]>(`/registrations${buildQuery(filters)}`);
  },
  getStats(filters: RegistrationFilters) {
    return request<StatsResponse>(`/registrations/stats${buildQuery(filters)}`);
  },
  getPartners() {
    return request<string[]>("/registrations/partners");
  },
  createRegistration(payload: RegistrationPayload) {
    return request<Registration>("/registrations", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateRegistration(id: string, payload: RegistrationPayload) {
    return request<Registration>(`/registrations/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteRegistration(id: string, adminToken: string) {
    return request<void>(`/registrations/${id}`, {
      method: "DELETE",
      adminToken
    });
  },
  verifyAdminPassword(password: string) {
    return request<AdminSessionResponse>("/admin/verify", {
      method: "POST",
      adminPassword: password
    });
  },
  verifyAdminToken(token: string) {
    return request<AdminSessionResponse>("/admin/verify", {
      method: "POST",
      adminToken: token
    });
  },
  resetRegistrations(adminToken: string) {
    return request<{ deletedCount: number; archiveId: string | null }>("/admin/reset", {
      method: "POST",
      adminToken
    });
  },
  listArchives(adminToken: string) {
    return request<WeeklyArchiveSummary[]>("/admin/archives", {
      adminToken
    });
  },
  listPersonalScoreTrends(adminToken: string) {
    return request<PersonalScoreTrend[]>("/admin/archives/personal-score-trends", {
      adminToken
    });
  },
  updateArchive(
    adminToken: string,
    archiveId: string,
    payload: {
      allianceScore: number | null;
      difficultyLevel: string | null;
      difficultyNote: string | null;
      eventLog: string | null;
    }
  ) {
    return request<WeeklyArchiveSummary>(`/admin/archives/${archiveId}`, {
      method: "PATCH",
      adminToken,
      body: JSON.stringify(payload)
    });
  },
  async exportCsv(adminToken: string, filters: RegistrationFilters) {
    const path = `/admin/export.csv${buildQuery(filters)}`;
    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          "x-admin-token": adminToken
        }
      });
    } catch (error) {
      const apiError = new ApiError({
        message: "The API is unreachable. Check the server connection and try again.",
        path,
        isNetworkError: true
      });

      logApiError(apiError, error);
      throw apiError;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
      const apiError = new ApiError({
        message: buildErrorMessage(path, response.status, payload),
        path,
        status: response.status,
        requestId: payload?.requestId ?? response.headers.get("x-request-id") ?? undefined,
        issues: payload?.issues ?? []
      });

      logApiError(apiError);
      throw apiError;
    }

    return {
      blob: await response.blob(),
      filename: getFilenameFromDisposition(response.headers.get("content-disposition"))
    };
  },
  async exportArchiveCsv(adminToken: string, archiveId: string) {
    const path = `/admin/archives/${archiveId}/export.csv`;
    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          "x-admin-token": adminToken
        }
      });
    } catch (error) {
      const apiError = new ApiError({
        message: "The API is unreachable. Check the server connection and try again.",
        path,
        isNetworkError: true
      });

      logApiError(apiError, error);
      throw apiError;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
      const apiError = new ApiError({
        message: buildErrorMessage(path, response.status, payload),
        path,
        status: response.status,
        requestId: payload?.requestId ?? response.headers.get("x-request-id") ?? undefined,
        issues: payload?.issues ?? []
      });

      logApiError(apiError);
      throw apiError;
    }

    return {
      blob: await response.blob(),
      filename: getFilenameFromDisposition(response.headers.get("content-disposition"))
    };
  }
};

function getFilenameFromDisposition(contentDisposition: string | null) {
  if (!contentDisposition) {
    return "kingshot-vikings-registrations.csv";
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);

  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() || "kingshot-vikings-registrations.csv";
}
