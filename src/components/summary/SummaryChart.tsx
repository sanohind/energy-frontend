import React, { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import api from "../../lib/api";
import { PowerMeter } from "../../types/powerMeter";
import { useTheme } from "../../context/ThemeContext";
import DatePicker from "../form/date-picker";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

interface RawPowerData {
  id: number;
  power_meter_id: number;
  voltage: number;
  current: number;
  power: number;
  total_kwh: number;
  recorded_at: string;
}

interface DailyShiftSummary {
  date: string;
  formattedDate: string;
  morningKwh: number;
  nightKwh: number;
  totalKwh: number;
}

type ShiftFilter = "all" | "morning" | "night";

export default function SummaryChart() {
  const { theme } = useTheme();

  // Master power meters
  const [masterMeters, setMasterMeters] = useState<PowerMeter[]>([]);
  const [selectedMeterId, setSelectedMeterId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Date range filter: default to last 7 days up to today
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().substring(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });

  // Shift filter: 'all' | 'morning' | 'night'
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>("all");

  // Raw data & loading state
  const [rawHistory, setRawHistory] = useState<RawPowerData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Fetch Master Power Meters on mount
  useEffect(() => {
    const fetchMeters = async () => {
      try {
        const response = await api.get("/power-meters");
        const meters: PowerMeter[] = Array.isArray(response.data)
          ? response.data
          : response.data.data;
        setMasterMeters(meters);
        if (meters.length > 0) {
          setSelectedMeterId(meters[0].id);
        }
      } catch (error) {
        console.error("Failed to load master meters", error);
      }
    };
    fetchMeters();
  }, []);

  // 2. Fetch raw 5-minute data for selected meter & date range
  useEffect(() => {
    if (!selectedMeterId) return;

    const fetchRangeData = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(
          `/power-data/${selectedMeterId}?start_date=${startDate}&end_date=${endDate}`
        );

        const data: RawPowerData[] = response.data.map((item: RawPowerData) => ({
          ...item,
          recorded_at: item.recorded_at.substring(0, 19).replace("T", " "),
        }));

        // Ensure chronological ascending order
        data.sort(
          (a, b) =>
            new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );

        setRawHistory(data);
      } catch (error) {
        console.error("Failed to fetch summary power data", error);
        setRawHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRangeData();
  }, [selectedMeterId, startDate, endDate]);

  // Helper: Generate array of dates from startDate to endDate (inclusive)
  const daysList = useMemo(() => {
    const dates: string[] = [];
    if (!startDate || !endDate) return dates;
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, "0");
      const dd = String(current.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  // Helper: Compute consumption (kWh) within a specific time window
  const computeShiftConsumption = (
    records: RawPowerData[],
    windowStart: string,
    windowEnd: string
  ): number => {
    const inside = records.filter(
      (r) => r.recorded_at >= windowStart && r.recorded_at <= windowEnd
    );

    let items = [...inside];
    // Baseline detection: if earliest reading is after windowStart, pick the last reading within 15 min prior
    if (items.length > 0 && items[0].recorded_at > windowStart) {
      const prior = records
        .filter((r) => r.recorded_at < windowStart)
        .slice(-1)[0];
      if (prior) {
        const priorMs = new Date(prior.recorded_at).getTime();
        const startMs = new Date(windowStart).getTime();
        if (startMs - priorMs <= 15 * 60 * 1000) {
          items = [prior, ...items];
        }
      }
    }

    if (items.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < items.length; i++) {
      const diff = items[i].total_kwh - items[i - 1].total_kwh;
      if (diff > 0 && diff < 1000) {
        total += diff;
      }
    }
    return Number(total.toFixed(2));
  };

  // 3. Aggregate daily shift summary data
  const dailySummaries: DailyShiftSummary[] = useMemo(() => {
    if (daysList.length === 0 || rawHistory.length === 0) return [];

    return daysList.map((dayStr) => {
      // Calculate next day string for night shift (20:00 to 05:00 next day)
      const dObj = new Date(dayStr);
      dObj.setDate(dObj.getDate() + 1);
      const nextDayStr = dObj.toISOString().substring(0, 10);

      // Morning shift: 07:00:00 to 16:00:00 on dayStr
      const morningStart = `${dayStr} 07:00:00`;
      const morningEnd = `${dayStr} 16:00:00`;
      const morningKwh = computeShiftConsumption(rawHistory, morningStart, morningEnd);

      // Night shift: 20:00:00 on dayStr to 05:00:00 on nextDayStr
      const nightStart = `${dayStr} 20:00:00`;
      const nightEnd = `${nextDayStr} 05:00:00`;
      const nightKwh = computeShiftConsumption(rawHistory, nightStart, nightEnd);

      const totalKwh = Number((morningKwh + nightKwh).toFixed(2));

      // Format date for chart labels e.g. "27 Oct"
      const dateParts = dayStr.split("-");
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const monthIndex = parseInt(dateParts[1], 10) - 1;
      const formattedDate = `${parseInt(dateParts[2], 10)} ${monthNames[monthIndex]}`;

      return {
        date: dayStr,
        formattedDate,
        morningKwh,
        nightKwh,
        totalKwh,
      };
    });
  }, [daysList, rawHistory]);

  // Overall metric totals
  const totalMorning = dailySummaries.reduce((sum, d) => sum + d.morningKwh, 0);
  const totalNight = dailySummaries.reduce((sum, d) => sum + d.nightKwh, 0);
  const grandTotal =
    shiftFilter === "morning"
      ? totalMorning
      : shiftFilter === "night"
      ? totalNight
      : totalMorning + totalNight;
  const avgDaily =
    dailySummaries.length > 0
      ? grandTotal / dailySummaries.length
      : 0;

  // Active power meter details
  const activeMeter = masterMeters.find((m) => m.id === selectedMeterId);
  const selectedMeterName = activeMeter?.name || "Power Meter";

  // Preset date range helpers
  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setStartDate(start.toISOString().substring(0, 10));
    setEndDate(end.toISOString().substring(0, 10));
  };

  // 4. Build Combo Bar + Line Chart Options & Series
  const chartCategories = dailySummaries.map((d) => d.formattedDate);

  let series: { name: string; type: "column" | "line"; data: number[] }[] = [];
  let seriesColors: string[] = [];
  let strokeWidths: number[] = [];
  let markerSizes: number[] = [];

  if (shiftFilter === "morning") {
    const data = dailySummaries.map((d) => d.morningKwh);
    series = [
      { name: "Morning Trend", type: "column", data },
      { name: "Morning Trend Line", type: "line", data },
    ];
    seriesColors = ["#465FFF", "#465FFF"];
    strokeWidths = [0, 3];
    markerSizes = [0, 5];
  } else if (shiftFilter === "night") {
    const data = dailySummaries.map((d) => d.nightKwh);
    series = [
      { name: "Night Trend", type: "column", data },
      { name: "Night Trend Line", type: "line", data },
    ];
    seriesColors = ["#F59E0B", "#F59E0B"];
    strokeWidths = [0, 3];
    markerSizes = [0, 5];
  } else {
    // All shifts: Grouped Morning bar, Night bar, with trend lines on the endpoints of each
    const morningData = dailySummaries.map((d) => d.morningKwh);
    const nightData = dailySummaries.map((d) => d.nightKwh);

    series = [
      { name: "Morning Trend", type: "column", data: morningData },
      { name: "Night Trend", type: "column", data: nightData },
      { name: "Morning Trend Line", type: "line", data: morningData },
      { name: "Night Trend Line", type: "line", data: nightData },
    ];
    seriesColors = ["#465FFF", "#F59E0B", "#465FFF", "#F59E0B"];
    strokeWidths = [0, 0, 2.5, 2.5];
    markerSizes = [0, 0, 5, 5];
  }

  const textColor = theme === "dark" ? "#9CA3AF" : "#6B7280";
  const gridColor = theme === "dark" ? "#374151" : "#E5E7EB";

  const chartOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "line",
      height: 380,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: seriesColors,
    stroke: {
      width: strokeWidths,
      curve: "smooth",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: shiftFilter === "all" ? "42%" : "36%",
        borderRadius: 4,
        borderRadiusApplication: "end",
      },
    },
    fill: {
      opacity: shiftFilter === "all" ? [0.9, 0.9, 1, 1] : [0.9, 1],
    },
    markers: {
      size: markerSizes,
      strokeWidth: 2,
      strokeColors: "#FFFFFF",
      hover: { size: 7 },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: chartCategories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: textColor,
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    yaxis: {
      title: {
        text: "Energy Consumption (kWh)",
        style: {
          color: textColor,
          fontSize: "13px",
          fontWeight: 600,
        },
      },
      labels: {
        style: {
          colors: textColor,
          fontSize: "12px",
        },
        formatter: (val: number) => (val !== undefined ? `${val.toFixed(1)}` : "0.0"),
      },
      min: 0,
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      shared: true,
      intersect: false,
      custom: function ({ dataPointIndex, w }) {
        const category =
          w.globals.categoryLabels?.[dataPointIndex] ||
          w.globals.labels?.[dataPointIndex] ||
          dailySummaries[dataPointIndex]?.formattedDate ||
          "";

        let rowsHtml = "";
        if (shiftFilter === "morning" || shiftFilter === "all") {
          const val = dailySummaries[dataPointIndex]?.morningKwh ?? 0;
          rowsHtml += `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:3px 0;">
              <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:${textColor};">
                <span style="width:8px;height:8px;border-radius:9999px;background-color:#465FFF;display:inline-block;"></span>
                Morning Trend:
              </span>
              <span style="font-size:13px;font-weight:700;font-family:monospace;color:${
                theme === "dark" ? "#FFFFFF" : "#111827"
              };">${val.toFixed(2)} kWh</span>
            </div>
          `;
        }

        if (shiftFilter === "night" || shiftFilter === "all") {
          const val = dailySummaries[dataPointIndex]?.nightKwh ?? 0;
          rowsHtml += `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:3px 0;">
              <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:${textColor};">
                <span style="width:8px;height:8px;border-radius:9999px;background-color:#F59E0B;display:inline-block;"></span>
                Night Trend:
              </span>
              <span style="font-size:13px;font-weight:700;font-family:monospace;color:${
                theme === "dark" ? "#FFFFFF" : "#111827"
              };">${val.toFixed(2)} kWh</span>
            </div>
          `;
        }

        return `
          <div style="padding:10px 14px;min-width:160px;">
            <div style="font-size:12px;font-weight:600;padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid ${gridColor};color:${textColor};">
              ${category}
            </div>
            ${rowsHtml}
          </div>
        `;
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit, sans-serif",
      fontSize: "13px",
      fontWeight: 500,
      customLegendItems:
        shiftFilter === "morning"
          ? ["Morning Trend"]
          : shiftFilter === "night"
          ? ["Night Trend"]
          : ["Morning Trend", "Night Trend"],
      markers: {
        fillColors:
          shiftFilter === "morning"
            ? ["#465FFF"]
            : shiftFilter === "night"
            ? ["#F59E0B"]
            : ["#465FFF", "#F59E0B"],
        size: 5,
        shape: "circle",
        strokeWidth: 0,
      },
      labels: {
        colors: textColor,
      },
      itemMargin: {
        horizontal: 12,
        vertical: 4,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER FILTER BAR */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-xs">
        
        {/* Power Meter Selector */}
        <div className="relative">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Power Meter
          </label>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="dropdown-toggle flex items-center justify-between w-full sm:w-[240px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            <span className="truncate">{selectedMeterName}</span>
            <svg
              className="w-4 h-4 ml-2 transition"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <Dropdown
            isOpen={isDropdownOpen}
            onClose={() => setIsDropdownOpen(false)}
            className="w-full sm:w-[240px]"
          >
            {masterMeters.map((meter) => {
              const isSelected = selectedMeterId === meter.id;
              const itemStyle = isSelected
                ? "block w-full text-left px-4 py-2 text-sm font-semibold text-brand-500 bg-brand-50 dark:text-brand-400 dark:bg-brand-900/20"
                : "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white";
              return (
                <DropdownItem
                  key={meter.id}
                  baseClassName={itemStyle}
                  onItemClick={() => {
                    setSelectedMeterId(meter.id);
                    setIsDropdownOpen(false);
                  }}
                >
                  {meter.name}
                </DropdownItem>
              );
            })}
          </Dropdown>
        </div>

        {/* Date Range Selection & Quick Presets */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              From Date
            </label>
            <div className="w-full sm:w-[150px]">
              <DatePicker
                id="summary-start-date"
                placeholder="Start Date"
                defaultDate={startDate}
                onChange={(selectedDates) => {
                  if (selectedDates.length > 0) {
                    const d = selectedDates[0];
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    setStartDate(`${yyyy}-${mm}-${dd}`);
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              To Date
            </label>
            <div className="w-full sm:w-[150px]">
              <DatePicker
                id="summary-end-date"
                placeholder="End Date"
                defaultDate={endDate}
                onChange={(selectedDates) => {
                  if (selectedDates.length > 0) {
                    const d = selectedDates[0];
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    setEndDate(`${yyyy}-${mm}-${dd}`);
                  }
                }}
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 mb-1">
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => applyPreset(14)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              14D
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              30D
            </button>
          </div>
        </div>

        {/* Shift Filter Tabs */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Shift View
          </label>
          <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setShiftFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                shiftFilter === "all"
                  ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              All Shifts
            </button>
            <button
              onClick={() => setShiftFilter("morning")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                shiftFilter === "morning"
                  ? "bg-white text-blue-600 shadow-theme-xs dark:bg-gray-800 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Morning Shift
            </button>
            <button
              onClick={() => setShiftFilter("night")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                shiftFilter === "night"
                  ? "bg-white text-amber-600 shadow-theme-xs dark:bg-gray-800 dark:text-amber-400"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              Night Shift
            </button>
          </div>
        </div>
      </div>

      {/* 2. METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            Total Consumption
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {grandTotal.toFixed(2)}
            </h4>
            <span className="text-xs font-medium text-gray-400">kWh</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            Morning Shift Total
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalMorning.toFixed(2)}
            </h4>
            <span className="text-xs font-medium text-gray-400">kWh</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            Night Shift Total
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="text-2xl font-bold text-amber-500 dark:text-amber-400">
              {totalNight.toFixed(2)}
            </h4>
            <span className="text-xs font-medium text-gray-400">kWh</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            Daily Average
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {avgDaily.toFixed(2)}
            </h4>
            <span className="text-xs font-medium text-gray-400">kWh/day</span>
          </div>
        </div>
      </div>

      {/* 3. COMBO BAR & LINE CHART */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Daily Consumption
            </h3>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {startDate} ~ {endDate}
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-[360px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <svg
              className="h-8 w-8 animate-spin text-brand-500 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading summary data...
          </div>
        ) : dailySummaries.length === 0 ? (
          <div className="flex h-[360px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            No energy consumption data recorded in this date range.
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <div className="min-w-[650px]">
              <Chart
                options={chartOptions}
                series={series}
                type="line"
                height={380}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
