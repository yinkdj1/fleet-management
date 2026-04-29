"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../../lib/api";

type TrendPoint = {
  label: string;
  bookings: number;
  revenue: number;
};

type VehicleRow = {
  vehicleId: number;
  make: string;
  model: string;
  plateNumber: string;
  dailyRate: number;
  weekly: { bookings: number; revenue: number; discountPercentage: number };
  monthly: { bookings: number; revenue: number; discountPercentage: number };
};

type PeriodStats = {
  totalBookings: number;
  totalRevenue: number;
};

type ReportData = {
  weekly: PeriodStats;
  monthly: PeriodStats;
  vehicleTable: VehicleRow[];
  weeklyTrend: TrendPoint[];
  weeklyTrendDetails: Array<{
    label: string;
    bookings: number;
    revenue: number;
    vehicleTable: Array<{
      vehicleId: number;
      make: string;
      model: string;
      plateNumber: string;
      dailyRate: number;
      bookingCount: number;
      revenue: number;
      discountPercentage: number;
    }>;
  }>;
  monthlyTrend: TrendPoint[];
  monthlyTrendDetails: Array<{
    label: string;
    bookings: number;
    revenue: number;
    vehicleTable: Array<{
      vehicleId: number;
      make: string;
      model: string;
      plateNumber: string;
      dailyRate: number;
      bookingCount: number;
      revenue: number;
      discountPercentage: number;
    }>;
  }>;
};

type Period = "weekly" | "monthly";

function fmt(n: number) {
  const normalized = Number.isFinite(Number(n)) ? Number(n) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(normalized);
}

function BarChart({
  data,
  metric,
  selectedLabel,
  hoveredLabel,
  onHoverLabel,
  onLeave,
  onSelectLabel,
}: {
  data: TrendPoint[];
  metric: "bookings" | "revenue";
  selectedLabel: string | null;
  hoveredLabel: string | null;
  onHoverLabel: (label: string) => void;
  onLeave: () => void;
  onSelectLabel: (label: string) => void;
}) {
  const values = data.map((d) => (metric === "bookings" ? d.bookings : d.revenue));
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-2 h-36 mt-4">
      {data.map((point, i) => {
        const val = metric === "bookings" ? point.bookings : point.revenue;
        const pct = (val / max) * 100;
        const isActive = selectedLabel === point.label;
        const isHovered = hoveredLabel === point.label;
        return (
          <button
            key={i}
            type="button"
            onMouseEnter={() => onHoverLabel(point.label)}
            onMouseLeave={onLeave}
            onClick={() => onSelectLabel(point.label)}
            className="flex-1 flex flex-col items-center gap-1 h-full justify-end rounded-md px-1 transition hover:bg-amber-50/50"
            aria-pressed={isActive}
            title={`Select ${point.label}`}
          >
            <span className="text-[10px] text-zinc-500 font-medium">
              {metric === "revenue" ? (val > 0 ? `$${Math.round(val)}` : "—") : val || "—"}
            </span>
            <div
              className={`w-full rounded-t-md transition-all duration-300 ${
                isActive
                  ? "bg-amber-600 opacity-100"
                  : isHovered
                  ? "bg-amber-500 opacity-95"
                  : "bg-[var(--color-accent)] opacity-90"
              }`}
              style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
            />
            <span
              className={`text-[9px] text-center leading-tight ${
                isActive ? "font-semibold text-zinc-700" : "text-zinc-400"
              }`}
            >
              {point.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TrendPieChart({
  data,
  metric,
}: {
  data: TrendPoint[];
  metric: "bookings" | "revenue";
}) {
  const palette = [
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#f97316",
    "#64748b",
  ];

  const values = data.map((point) =>
    metric === "bookings" ? Number(point.bookings || 0) : Number(point.revenue || 0)
  );
  const total = values.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return (
      <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-amber-900/10 bg-white/70 text-sm text-zinc-500">
        No trend data available
      </div>
    );
  }

  let runningPercent = 0;
  const gradientStops = values
    .map((value, index) => {
      const percent = (value / total) * 100;
      const start = runningPercent;
      runningPercent += percent;
      const color = palette[index % palette.length];
      return `${color} ${start.toFixed(2)}% ${runningPercent.toFixed(2)}%`;
    })
    .join(", ");

  const chartBg = {
    background: `conic-gradient(${gradientStops})`,
  } as React.CSSProperties;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr] lg:items-center">
      <div className="mx-auto h-44 w-44 rounded-full p-6 shadow-inner" style={chartBg}>
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Total</p>
            <p className="text-sm font-semibold text-zinc-900">
              {metric === "revenue" ? fmt(total) : total.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        {data.map((point, index) => {
          const raw = metric === "bookings" ? Number(point.bookings || 0) : Number(point.revenue || 0);
          const pct = total > 0 ? (raw / total) * 100 : 0;
          const color = palette[index % palette.length];

          return (
            <div key={`${point.label}-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-zinc-600">{point.label}</span>
              </div>
              <div className="shrink-0 font-medium text-zinc-700">
                {metric === "revenue" ? fmt(raw) : raw} ({pct.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [chartMetric, setChartMetric] = useState<"bookings" | "revenue">("revenue");
  const [sortCol, setSortCol] = useState<"revenue" | "bookings">("revenue");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<number>>(new Set());
  const [selectedTrendLabel, setSelectedTrendLabel] = useState<string | null>(null);
  const [hoveredTrendLabel, setHoveredTrendLabel] = useState<string | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get("/reports")
      .then((res) => {
        const nextData = res.data?.data;

        if (!nextData) {
          setData(null);
          return;
        }

        setData({
          ...nextData,
          vehicleTable: Array.isArray(nextData.vehicleTable)
            ? nextData.vehicleTable.map((vehicle: VehicleRow) => ({
                ...vehicle,
                dailyRate: Number.isFinite(Number(vehicle?.dailyRate))
                  ? Number(vehicle.dailyRate)
                  : 0,
                weekly: {
                  bookings: Number(vehicle?.weekly?.bookings || 0),
                  revenue: Number(vehicle?.weekly?.revenue || 0),
                  discountPercentage: Number(vehicle?.weekly?.discountPercentage || 0),
                },
                monthly: {
                  bookings: Number(vehicle?.monthly?.bookings || 0),
                  revenue: Number(vehicle?.monthly?.revenue || 0),
                  discountPercentage: Number(vehicle?.monthly?.discountPercentage || 0),
                },
              }))
            : [],
        });
      })
      .catch(() => setError("Failed to load report data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSelectedTrendLabel(null);
    setHoveredTrendLabel(null);
    setSelectedVehicleIds(new Set());
  }, [period]);

  const Stats = data ? (period === "weekly" ? data.weekly : data.monthly) : null;
  const trend = data ? (period === "weekly" ? data.weeklyTrend : data.monthlyTrend) : [];
  const trendDetails = data
    ? period === "weekly"
      ? data.weeklyTrendDetails || []
      : data.monthlyTrendDetails || []
    : [];

  const selectedBucket = selectedTrendLabel
    ? trendDetails.find((bucket) => bucket.label === selectedTrendLabel) || null
    : null;

  const activeVehicleTable = selectedBucket
    ? selectedBucket.vehicleTable.map((item) => ({
        vehicleId: item.vehicleId,
        make: item.make,
        model: item.model,
        plateNumber: item.plateNumber,
        dailyRate: Number(item.dailyRate || 0),
        weekly:
          period === "weekly"
            ? {
                bookings: Number(item.bookingCount || 0),
                revenue: Number(item.revenue || 0),
                discountPercentage: Number(item.discountPercentage || 0),
              }
            : { bookings: 0, revenue: 0, discountPercentage: 0 },
        monthly:
          period === "monthly"
            ? {
                bookings: Number(item.bookingCount || 0),
                revenue: Number(item.revenue || 0),
                discountPercentage: Number(item.discountPercentage || 0),
              }
            : { bookings: 0, revenue: 0, discountPercentage: 0 },
      }))
    : data?.vehicleTable || [];

  const sortedVehicles = data
    ? [...activeVehicleTable].sort(
        (a, b) =>
          (b[period][sortCol] ?? 0) - (a[period][sortCol] ?? 0)
      )
    : [];

    // Update "Select All" checkbox indeterminate state
    useEffect(() => {
      if (selectAllCheckboxRef.current) {
        selectAllCheckboxRef.current.indeterminate =
          selectedVehicleIds.size > 0 && selectedVehicleIds.size < sortedVehicles.length;
      }
    }, [selectedVehicleIds, sortedVehicles.length]);

  const activeTotalBookings = selectedBucket
    ? Number(selectedBucket.bookings || 0)
    : Stats?.totalBookings || 0;
  const activeTotalRevenue = selectedBucket
    ? Number(selectedBucket.revenue || 0)
    : Stats?.totalRevenue || 0;

  const avgPerBooking =
    activeTotalBookings > 0
      ? activeTotalRevenue / activeTotalBookings
      : 0;

  const periodLabel = period === "weekly" ? "Last 7 Days" : "Last 30 Days";

  const downloadVehicleBreakdown = () => {
    const vehiclesToExport = selectedVehicleIds.size > 0 
      ? sortedVehicles.filter((v) => selectedVehicleIds.has(v.vehicleId))
      : sortedVehicles;

    if (!data || vehiclesToExport.length === 0) return;

    const primaryPeriodLabel = period === "weekly" ? "7-Day" : "30-Day";
    const secondaryPeriodLabel = period === "weekly" ? "30-Day" : "7-Day";

    // Build CSV header
    const headers = [
      "Vehicle",
      "Make",
      "Model",
      "Plate Number",
      "Daily Rate",
      "Discount %",
      `${primaryPeriodLabel} Bookings`,
      `${primaryPeriodLabel} Revenue`,
      `${secondaryPeriodLabel} Bookings`,
      `${secondaryPeriodLabel} Revenue`,
      "Revenue Share %",
    ];

    // Build CSV rows
    const rows = vehiclesToExport.map((v) => {
      const primary = v[period];
      const secondary = period === "weekly" ? v.monthly : v.weekly;
      const totalRevenue = Stats?.totalRevenue ?? 0;
      const share = totalRevenue > 0 ? ((primary.revenue / totalRevenue) * 100).toFixed(1) : "0.0";

      return [
        `${v.make} ${v.model}`,
        v.make,
        v.model,
        v.plateNumber,
        v.dailyRate.toFixed(2),
        primary.discountPercentage.toFixed(2),
        primary.bookings.toString(),
        primary.revenue.toFixed(2),
        secondary.bookings.toString(),
        secondary.revenue.toFixed(2),
        share,
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Generate filename with timestamp and period
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10);
    const filename = `vehicle-breakdown-${period}-${timestamp}.csv`;

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleVehicleSelection = (vehicleId: number) => {
    setSelectedVehicleIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedVehicleIds.size === sortedVehicles.length) {
      setSelectedVehicleIds(new Set());
    } else {
      setSelectedVehicleIds(new Set(sortedVehicles.map((v) => v.vehicleId)));
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-playfair)] text-zinc-900">
              Reports
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Booking and revenue metrics across all vehicles
            </p>
            {selectedBucket && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Viewing details for {selectedBucket.label}
              </p>
            )}
          </div>
          {/* Period toggle */}
          <div className="flex rounded-xl overflow-hidden border border-amber-900/15 self-start sm:self-auto">
            {(["weekly", "monthly"] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-5 py-2 text-sm font-medium transition ${
                  period === p
                    ? "bg-[var(--color-accent)] text-zinc-900"
                    : "bg-white/70 text-zinc-600 hover:bg-white"
                }`}
              >
                {p === "weekly" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-sm text-zinc-500 animate-pulse">Loading report data…</div>
        )}

        {!loading && data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Total Bookings",
                  value: activeTotalBookings,
                  sub: selectedBucket ? `Selected: ${selectedBucket.label}` : periodLabel,
                  fmt: (v: number) => String(v),
                },
                {
                  label: "Total Revenue",
                  value: activeTotalRevenue,
                  sub: selectedBucket ? `Selected: ${selectedBucket.label}` : periodLabel,
                  fmt,
                },
                {
                  label: "Avg per Booking",
                  value: avgPerBooking,
                  sub: selectedBucket ? `Selected: ${selectedBucket.label}` : periodLabel,
                  fmt,
                },
                {
                  label: "Active Vehicles",
                  value: activeVehicleTable.filter(
                    (v) => v[period].bookings > 0
                  ).length,
                  sub: "With bookings in period",
                  fmt: (v: number) => String(v),
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-amber-900/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
                >
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-zinc-900">
                    {card.fmt(card.value)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Trend chart */}
            <div className="rounded-2xl border border-amber-900/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                <h2 className="text-base font-semibold text-zinc-800">
                  {period === "weekly" ? "8-Week Trend" : "6-Month Trend"}
                </h2>
                <div className="flex rounded-lg overflow-hidden border border-amber-900/15 self-start">
                  {(["revenue", "bookings"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setChartMetric(m)}
                      className={`px-3 py-1.5 text-xs font-medium capitalize transition ${
                        chartMetric === m
                          ? "bg-[var(--color-accent)] text-zinc-900"
                          : "bg-white/70 text-zinc-600 hover:bg-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTrendLabel(null);
                    setHoveredTrendLabel(null);
                    setSelectedVehicleIds(new Set());
                  }}
                  disabled={!selectedBucket}
                  className="self-start rounded-lg border border-amber-900/20 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear selection
                </button>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Bar View</p>
                  <BarChart
                    data={trend}
                    metric={chartMetric}
                    selectedLabel={selectedTrendLabel}
                    hoveredLabel={hoveredTrendLabel}
                    onHoverLabel={setHoveredTrendLabel}
                    onLeave={() => setHoveredTrendLabel(null)}
                    onSelectLabel={(label) => {
                      setSelectedTrendLabel((prev) => (prev === label ? null : label));
                      setSelectedVehicleIds(new Set());
                    }}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pie View</p>
                  <TrendPieChart data={trend} metric={chartMetric} />
                </div>
              </div>
            </div>

            {/* Per-vehicle table */}
            <div className="rounded-2xl border border-amber-900/10 bg-white/80 shadow-sm backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-amber-900/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-zinc-800">
                  Vehicle Breakdown
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 text-xs">
                  <div className="text-zinc-600">
                    {selectedVehicleIds.size > 0 ? (
                      <span className="font-medium">{selectedVehicleIds.size} selected</span>
                    ) : (
                      <span className="text-zinc-500">All vehicles</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={downloadVehicleBreakdown}
                    disabled={!data || (selectedVehicleIds.size === 0 && sortedVehicles.length === 0)}
                    className="px-3 py-1.5 rounded-lg font-medium bg-green-500/80 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    ↓ Download CSV
                  </button>
                  <div className="flex items-center gap-2 text-zinc-500">
                    Sort by:
                  {(["revenue", "bookings"] as const).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSortCol(col)}
                      className={`px-3 py-1 rounded-lg font-medium capitalize transition border ${
                        sortCol === col
                          ? "bg-[var(--color-accent)] border-amber-400/50 text-zinc-900"
                          : "border-amber-900/15 bg-white/70 text-zinc-600 hover:bg-white"
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              {sortedVehicles.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-zinc-400">
                  No bookings found in this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-amber-900/10 text-xs uppercase tracking-wider text-zinc-500">
                        <th className="px-3 py-3 text-left w-8">
                          <input
                            ref={selectAllCheckboxRef}
                            type="checkbox"
                            checked={selectedVehicleIds.size > 0 && selectedVehicleIds.size === sortedVehicles.length}
                            onChange={toggleSelectAll}
                            className="rounded border-amber-900/30 cursor-pointer"
                          />
                        </th>
                        <th className="px-5 py-3 text-left font-medium">Vehicle</th>
                        <th className="px-5 py-3 text-left font-medium">Plate</th>
                        <th className="px-5 py-3 text-right font-medium">Daily Rate</th>
                        <th className="px-5 py-3 text-right font-medium">Discount</th>
                        <th className="px-5 py-3 text-right font-medium">
                          {period === "weekly" ? "7-Day" : "30-Day"} Bookings
                        </th>
                        <th className="px-5 py-3 text-right font-medium">
                          {period === "weekly" ? "7-Day" : "30-Day"} Revenue
                        </th>
                        <th className="px-5 py-3 text-right font-medium hidden md:table-cell">
                          {period === "weekly" ? "30-Day" : "7-Day"} Bookings
                        </th>
                        <th className="px-5 py-3 text-right font-medium hidden md:table-cell">
                          {period === "weekly" ? "30-Day" : "7-Day"} Revenue
                        </th>
                        <th className="px-5 py-3 text-right font-medium hidden lg:table-cell">Revenue Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-900/5">
                      {sortedVehicles.map((v, idx) => {
                        const primary = v[period];
                        const secondary = period === "weekly" ? v.monthly : v.weekly;
                        const totalRevenue = Stats?.totalRevenue ?? 0;
                        const share =
                          totalRevenue > 0
                            ? ((primary.revenue / totalRevenue) * 100).toFixed(1)
                            : "0.0";
                        return (
                          <tr
                            key={v.vehicleId}
                            className={`transition hover:bg-amber-50/50 ${
                              idx % 2 === 0 ? "bg-white/50" : "bg-white/20"
                            }`}
                          >
                            <td className="px-3 py-3 text-left w-8">
                              <input
                                type="checkbox"
                                checked={selectedVehicleIds.has(v.vehicleId)}
                                onChange={() => toggleVehicleSelection(v.vehicleId)}
                                className="rounded border-amber-900/30 cursor-pointer"
                              />
                            </td>
                            <td className="px-5 py-3 font-medium text-zinc-900">
                              {v.make} {v.model}
                            </td>
                            <td className="px-5 py-3 text-zinc-500 font-mono text-xs">
                              {v.plateNumber}
                            </td>
                            <td className="px-5 py-3 text-right text-zinc-700 font-semibold">
                              {fmt(v.dailyRate)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {primary.discountPercentage > 0 ? (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  {primary.discountPercentage}% off
                                </span>
                              ) : (
                                <span className="text-zinc-400">None</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right text-zinc-800 font-semibold">
                              {primary.bookings}
                            </td>
                            <td className="px-5 py-3 text-right text-zinc-800 font-semibold">
                              {fmt(primary.revenue)}
                            </td>
                            <td className="px-5 py-3 text-right text-zinc-400 hidden md:table-cell">
                              {secondary.bookings}
                            </td>
                            <td className="px-5 py-3 text-right text-zinc-400 hidden md:table-cell">
                              {fmt(secondary.revenue)}
                            </td>
                            <td className="px-5 py-3 text-right hidden lg:table-cell">
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-1.5 w-20 rounded-full bg-amber-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[var(--color-accent)]"
                                    style={{ width: `${share}%` }}
                                  />
                                </div>
                                <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">
                                  {share}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
