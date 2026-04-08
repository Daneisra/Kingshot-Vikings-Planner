import type {
  Registration,
  RegistrationFilters,
  RegistrationPayload,
  StatsResponse
} from "../types/registration";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

interface RequestOptions extends RequestInit {
  adminPassword?: string;
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
  deleteRegistration(id: string, adminPassword: string) {
    return request<void>(`/registrations/${id}`, {
      method: "DELETE",
      adminPassword
    });
  },
  verifyAdminPassword(password: string) {
    return request<{ ok: true }>("/admin/verify", {
      method: "POST",
      adminPassword: password
    });
  },
  resetRegistrations(adminPassword: string) {
    return request<{ deletedCount: number }>("/admin/reset", {
      method: "POST",
      adminPassword
    });
  },
  async exportCsv(adminPassword: string, filters: RegistrationFilters) {
    const path = `/admin/export.csv${buildQuery(filters)}`;
    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          "x-admin-password": adminPassword
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

    return response.blob();
  }
};
