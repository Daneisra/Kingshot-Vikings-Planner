import type { RegistrationFilters } from "../types/registration";

interface FiltersBarProps {
  filters: RegistrationFilters;
  partners: string[];
  onChange: (filters: RegistrationFilters) => void;
  onReset: () => void;
}

export function FiltersBar({ filters, partners, onChange, onReset }: FiltersBarProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row">
        <label className="flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-300">Search by nickname</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="e.g. Ragnar"
          />
        </label>

        <label className="flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-300">Filter by partner</span>
          <select
            value={filters.partner}
            onChange={(event) => onChange({ ...filters, partner: event.target.value })}
          >
            <option value="">All partners</option>
            {partners.map((partner) => (
              <option key={partner} value={partner}>
                {partner}
              </option>
            ))}
          </select>
        </label>

        <label className="flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-300">Availability</span>
          <select
            value={filters.available}
            onChange={(event) =>
              onChange({
                ...filters,
                available: event.target.value as RegistrationFilters["available"]
              })
            }
          >
            <option value="all">All</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" className="secondary-button" onClick={onReset}>
          Reset filters
        </button>
      </div>
    </section>
  );
}
