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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || "The request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
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
    return request<void>("/admin/reset", {
      method: "POST",
      adminPassword
    });
  },
  async exportCsv(adminPassword: string, filters: RegistrationFilters) {
    const response = await fetch(`${API_BASE_URL}/admin/export.csv${buildQuery(filters)}`, {
      headers: {
        "x-admin-password": adminPassword
      }
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message || "Unable to export CSV.");
    }

    return response.blob();
  }
};
