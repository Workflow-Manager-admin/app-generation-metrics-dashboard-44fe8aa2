import React, { useEffect, useState, useMemo } from "react";
import "./App.css";

// Table Columns
const COLUMNS = [
  { key: "app_name", name: "App Name", sortable: true, filter: true },
  { key: "elapsed_time", name: "Elapsed Time (s)", sortable: true, filter: false },
  { key: "total_cost", name: "Total Cost ($)", sortable: true, filter: false },
  { key: "date", name: "Date", sortable: true, filter: false },
  { key: "project_link", name: "Project Link", sortable: false, filter: false },
  { key: "cga_version", name: "CGA Version", sortable: true, filter: true },
  { key: "model", name: "Model", sortable: true, filter: true },
  { key: "streaming", name: "Streaming", sortable: true, filter: true }
];

// PUBLIC_INTERFACE
function App() {
  // App theme (light/dark)
  const [theme, setTheme] = useState("light");

  // Table/filter state
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    model: "",
    cga_version: "",
    streaming: "",
    app_name: "",
  });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch metrics from backend API
  useEffect(() => {
    setLoading(true);
    // TODO: Adjust API endpoint if needed for deployment
    fetch("/metrics")
      .then((resp) => {
        if (!resp.ok) throw new Error("Failed to fetch metrics");
        return resp.json();
      })
      .then((data) => {
        setMetrics(Array.isArray(data) ? data : (data.metrics || []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Theme switching
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  // --- Filtering logic ---
  const filteredMetrics = useMemo(() => {
    let filtered = [...metrics];
    // Global Search
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(row =>
        COLUMNS.some(col =>
          typeof row[col.key] === "string" &&
          row[col.key].toLowerCase().includes(s)
        )
      );
    }
    // Attribute filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "ALL") {
        filtered = filtered.filter(row =>
          (row[key] || "").toLowerCase() === value.toLowerCase()
        );
      }
    });
    // Date range
    if (dateRange.start) {
      filtered = filtered.filter(row => row.date >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter(row => row.date <= dateRange.end);
    }
    return filtered;
  }, [metrics, search, filters, dateRange]);

  // --- Sorting logic ---
  const sortedMetrics = useMemo(() => {
    const { key, direction } = sortConfig;
    const sorted = [...filteredMetrics].sort((a, b) => {
      let vA = a[key], vB = b[key];
      // Date
      if (key === "date") {
        vA = new Date(vA); vB = new Date(vB);
        return direction === "asc" ? vA - vB : vB - vA;
      }
      // Number
      if (["elapsed_time", "total_cost"].includes(key)) {
        vA = Number(vA); vB = Number(vB);
        return direction === "asc" ? vA - vB : vB - vA;
      }
      // String/default
      vA = (vA || "").toString().toLowerCase();
      vB = (vB || "").toString().toLowerCase();
      if (vA < vB) return direction === "asc" ? -1 : 1;
      if (vA > vB) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredMetrics, sortConfig]);

  // --- Pagination logic ---
  const pagedMetrics = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedMetrics.slice(start, start + rowsPerPage);
  }, [sortedMetrics, page, rowsPerPage]);

  const totalPages = Math.ceil(sortedMetrics.length / rowsPerPage);

  // --- Event Handlers ---
  function handleSort(colKey) {
    setSortConfig(cfg => {
      if (cfg.key === colKey) {
        return { key: colKey, direction: cfg.direction === "asc" ? "desc" : "asc" };
      }
      return { key: colKey, direction: "asc" };
    });
  }
  function handleFilterChange(key, value) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  }
  function handleDateRangeChange(field, value) {
    setDateRange(dr => ({ ...dr, [field]: value }));
    setPage(1);
  }
  function handleRowsPerPage(ev) {
    setRowsPerPage(Number(ev.target.value));
    setPage(1);
  }
  function handleSearch(ev) {
    setSearch(ev.target.value);
    setPage(1);
  }

  // Helper for getting distinct values for filter dropdowns
  function distinctValues(colKey) {
    const vals = metrics.map(m => m[colKey]).filter(Boolean);
    return [...new Set(vals)].sort();
  }

  // --- Summary Stats ---
  const stats = useMemo(() => {
    const count = filteredMetrics.length;
    const sumTime = filteredMetrics.reduce((sum, row) => sum + Number(row.elapsed_time || 0), 0);
    const sumCost = filteredMetrics.reduce((sum, row) => sum + Number(row.total_cost || 0), 0);
    return {
      count,
      avgTime: count ? (sumTime / count).toFixed(1) : "-",
      totalCost: sumCost.toFixed(2),
      minDate: filteredMetrics.length ? filteredMetrics.reduce((min, row) => !min || row.date < min ? row.date : min, null) : "-",
      maxDate: filteredMetrics.length ? filteredMetrics.reduce((max, row) => !max || row.date > max ? row.date : max, null) : "-",
    };
  }, [filteredMetrics]);


  // --- RENDERING ---

  return (
    <div className="App">
      <header className="kt-header">
        <div className="kt-title-section">
          <span className="kt-title">App Generation Metrics Dashboard</span>
          <span className="kt-subtitle">Track, filter & analyze your KAVIA app generations</span>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </header>

      {/* --- Stats --- */}
      <section className="kt-stats">
        <Stat label="Visible Records" value={stats.count} />
        <Stat label="Average Time (s)" value={stats.avgTime} />
        <Stat label="Total Cost ($)" value={stats.totalCost} />
        <Stat label="Earliest Date" value={stats.minDate} />
        <Stat label="Latest Date" value={stats.maxDate} />
      </section>

      {/* --- Controls --- */}
      <section className="kt-controls">
        <input
          className="kt-search"
          type="search"
          value={search}
          onChange={handleSearch}
          placeholder="🔎 Search…"
        />
        <div className="kt-selects">
          {/* Dynamic filters */}
          <Select
            label="Model"
            value={filters.model}
            onChange={v => handleFilterChange("model", v)}
            options={["ALL", ...distinctValues("model")]}
          />
          <Select
            label="Version"
            value={filters.cga_version}
            onChange={v => handleFilterChange("cga_version", v)}
            options={["ALL", ...distinctValues("cga_version")]}
          />
          <Select
            label="Streaming"
            value={filters.streaming}
            onChange={v => handleFilterChange("streaming", v)}
            options={["ALL", ...distinctValues("streaming")]}
          />
        </div>
        <div className="kt-date-range">
          <label>
            From: <input type="date"
              value={dateRange.start}
              onChange={ev => handleDateRangeChange("start", ev.target.value)}
            />
          </label>
          <label>
            To: <input type="date"
              value={dateRange.end}
              onChange={ev => handleDateRangeChange("end", ev.target.value)}
            />
          </label>
        </div>
      </section>

      {/* --- Table --- */}
      <div className="kt-table-area">
        {loading
          ? <div className="kt-loading">Loading metrics…</div>
          : <MetricsTable
              metrics={pagedMetrics}
              columns={COLUMNS}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
        }
        {!loading && !pagedMetrics.length && (
          <div className="kt-no-data">No metrics to display. Adjust your filters.</div>
        )}
      </div>

      {/* --- Pagination --- */}
      <footer className="kt-footer">
        <Pagination
          page={page}
          totalPages={totalPages}
          setPage={setPage}
        />
        <select className="kt-rows-per-page" value={rowsPerPage} onChange={handleRowsPerPage}>
          {[10, 20, 50, 100].map(v => (
            <option key={v} value={v}>{v} rows/page</option>
          ))}
        </select>
      </footer>

      <div className="kt-powered">Powered by <a href="https://kavia.ai" target="_blank" rel="noopener noreferrer">KAVIA</a></div>
    </div>
  );
}

// --- Stat Widget ---
function Stat({ label, value }) {
  return <div className="kt-stat">
    <div className="kt-stat-label">{label}</div>
    <div className="kt-stat-value">{value}</div>
  </div>;
}

// --- Select helper ---
function Select({ label, value, onChange, options }) {
  return (
    <label className="kt-select-label">
      {label}
      <select className="kt-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt =>
          <option value={opt} key={opt}>{opt}</option>
        )}
      </select>
    </label>
  );
}

// --- Table ---

function MetricsTable({ metrics, columns, sortConfig, onSort }) {
  return (
    <table className="kt-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th
              key={col.key}
              className={col.sortable ? "sortable" : ""}
              onClick={() => col.sortable && onSort(col.key)}
              aria-sort={
                sortConfig.key === col.key
                  ? (sortConfig.direction === "asc" ? "ascending" : "descending")
                  : "none"
              }
              tabIndex={col.sortable ? 0 : undefined}
            >
              {col.name}
              {col.sortable && sortConfig.key === col.key &&
                (sortConfig.direction === "asc" ? " ▲" : " ▼")}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {metrics.map((row, idx) => (
          <tr key={row.id || idx}>
            {columns.map(col => (
              <td key={col.key + idx}>
                {col.key === "project_link"
                  ? (row.project_link
                      ? <a className="kt-link" href={row.project_link} target="_blank" rel="noopener noreferrer">
                          {row.project_link}
                        </a>
                      : "")
                  : col.key === "streaming"
                      ? (row[col.key] ? "Yes" : "No")
                      : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --- Pagination ---
function Pagination({ page, totalPages, setPage }) {
  if (!totalPages) return null;
  function toPage(p) {
    setPage(Math.max(1, Math.min(totalPages, p)));
  }
  // Show up to +/-2 pages range
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, page + 2);
  if (end - start < 4) {
    if (start === 1) end = Math.min(totalPages, start + 4);
    else if (end === totalPages) start = Math.max(1, end - 4);
  }
  let nums = [];
  for (let i = start; i <= end; ++i) nums.push(i);
  return (
    <nav className="kt-pagination" aria-label="Table navigation">
      <button disabled={page === 1} onClick={() => toPage(1)}>&laquo;</button>
      <button disabled={page === 1} onClick={() => toPage(page - 1)}>&lsaquo;</button>
      {nums.map(pn =>
        <button
          className={pn === page ? "active" : ""}
          key={pn}
          onClick={() => toPage(pn)}
        >{pn}</button>
      )}
      <button disabled={page === totalPages} onClick={() => toPage(page + 1)}>&rsaquo;</button>
      <button disabled={page === totalPages} onClick={() => toPage(totalPages)}>&raquo;</button>
    </nav>
  );
}

export default App;
