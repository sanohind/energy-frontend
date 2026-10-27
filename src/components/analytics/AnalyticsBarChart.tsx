import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ChartTab from "../common/ChartTab";
import api from "../../lib/api";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import DatePicker from "../form/date-picker";
import { PowerMeter } from "../../types/powerMeter";
import AnalyticsMetrics from "./AnalyticsMetrics";
import { useTheme } from "../../context/ThemeContext";

interface HistoryData {
  id: number;
  voltage: number;
  current: number;
  power: number;
  total_kwh: number;
  recorded_at: string;
}

export default function AnalyticsLineChart() {
  const { theme } = useTheme();
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [masterMeters, setMasterMeters] = useState<PowerMeter[]>([]);
  const [selectedMeterId, setSelectedMeterId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [timeView, setTimeView] = useState<"minutes" | "hourly">("minutes");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchMeters = async () => {
      try { 
        const response = await api.get("/power-meters");
        const meters = Array.isArray(response.data) ? response.data : response.data.data;
        setMasterMeters(meters);
        if (meters.length > 0) setSelectedMeterId(meters[0].id);
      } catch (error) {
        console.error("Failed to load master meters", error);
      }
    };
    fetchMeters();
  }, []);

  useEffect(() => {
    if (!selectedMeterId) return;
    const fetchHistory = async () => {
      try { 
        setIsLoading(true);
        const response = await api.get(`/power-data/${selectedMeterId}?date=${selectedDate}`);
        const formattedData = response.data.reverse().map((item: HistoryData) => {
          const cleanLocalTime = item.recorded_at.substring(0, 19).replace('T', ' ');

          return {
            ...item,
            power: item.power / 1000,
            recorded_at: cleanLocalTime,
          };
        });

        setHistory(formattedData);
      } catch (error) {
        console.error("Failed to load history data", error);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [selectedMeterId, selectedDate]);

  const getAggregatedData = () => {
    if (timeView === "minutes") return history;
    const hourlyGroups: Record<string, HistoryData[]> = {};
    history.forEach((data) => {
      const hourKey = data.recorded_at.substring(0, 13) + ":00:00";
      if (!hourlyGroups[hourKey]) hourlyGroups[hourKey] = [];
      hourlyGroups[hourKey].push(data);
    });

    const aggregated = Object.entries(hourlyGroups).map(([hour, items]) => {
      const sumVoltage = items.reduce((sum, item) => sum + item.voltage, 0);
      const sumCurrent = items.reduce((sum, item) => sum + item.current, 0);
      const sumPower = items.reduce((sum, item) => sum + item.power, 0);
      return {
        id: 0,
        voltage: sumVoltage / items.length,
        current: sumCurrent / items.length,
        power: sumPower / items.length,
        total_kwh: items[items.length - 1].total_kwh,
        recorded_at: hour,
      };
    });
    return aggregated.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  };

  const processedHistory = getAggregatedData();
  const activeMeter = masterMeters.find((m) => m.id === selectedMeterId);
  const selectedMeterName = activeMeter?.name || "Power Meter";

  // Chart consumption differences (respects Minutes/Hourly for chart visualization)
  const kwhDifferences: [number, number][] = [];
  for (let i = 1; i < processedHistory.length; i++) {
    let diff = processedHistory[i].total_kwh - processedHistory[i - 1].total_kwh;
    if (diff < 0) diff = 0;
    kwhDifferences.push([new Date(processedHistory[i].recorded_at).getTime(), diff]);
  }

  // Summary card metrics: Always calculated from raw minute-level data (history)
  // so the actual metric values remain fixed and consistent regardless of Minutes/Hourly view
  const rawKwhDifferences: number[] = [];
  for (let i = 1; i < history.length; i++) {
    let diff = history[i].total_kwh - history[i - 1].total_kwh;
    if (diff < 0) diff = 0;
    rawKwhDifferences.push(diff);
  }

  const avgV = history.length ? (history.reduce((s, i) => s + i.voltage, 0) / history.length).toFixed(1) : "0.0";
  const avgC = history.length ? (history.reduce((s, i) => s + i.current, 0) / history.length).toFixed(1) : "0.0";
  const avgP = history.length ? (history.reduce((s, i) => s + i.power, 0) / history.length).toFixed(2) : "0.00";
  const totalKwh = rawKwhDifferences.length ? rawKwhDifferences.reduce((s, i) => s + i, 0).toFixed(2) : "0.00";

  const generateChartOptions = (color: string, unit: string, limitValue?: number, minValue?: number): ApexOptions => {
    const parsedMax = limitValue !== undefined && limitValue !== null && !isNaN(Number(limitValue)) ? Number(limitValue) : undefined;
    const parsedMin = minValue !== undefined && minValue !== null && !isNaN(Number(minValue)) ? Number(minValue) : undefined;
    const textColor = theme === "dark" ? "#9CA3AF" : "#6B7280";
    const gridColor = theme === "dark" ? "#374151" : "#E5E7EB";

    // Ensure chart y-axis accommodates threshold max and min lines
    let yaxisMin: number | ((min: number) => number) | undefined = undefined;
    let yaxisMax: number | ((max: number) => number) | undefined = undefined;

    if (parsedMin !== undefined) {
      yaxisMin = (dataMin: number) => {
        const validMin = isFinite(dataMin) ? dataMin : parsedMin;
        const lower = Math.min(validMin, parsedMin);
        const refRange = parsedMax !== undefined ? (parsedMax - lower) : lower;
        const buffer = refRange > 0 ? refRange * 0.08 : 5;
        return Math.floor(Math.max(0, lower - buffer));
      };
    } else if (parsedMax !== undefined) {
      yaxisMin = (dataMin: number) => (isFinite(dataMin) && dataMin < 0 ? Math.floor(dataMin) : 0);
    }

    if (parsedMax !== undefined) {
      yaxisMax = (dataMax: number) => {
        const validMax = isFinite(dataMax) ? dataMax : parsedMax;
        const higher = Math.max(validMax, parsedMax);
        const refRange = parsedMin !== undefined ? (higher - parsedMin) : higher;
        const buffer = refRange > 0 ? refRange * 0.08 : 5;
        return Math.ceil(higher + buffer);
      };
    }

    const options: ApexOptions = {
      colors: [color],
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "area",
        toolbar: { show: false },
        height: 260,
      },
      stroke: { curve: "smooth", width: 2 },
      fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0 } },
      markers: { size: 0, hover: { size: 6 } },
      grid: {
        borderColor: gridColor,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      dataLabels: { enabled: false },
      tooltip: {
        theme: theme === "dark" ? "dark" : "light",
        enabled: true,
        shared: false,
        followCursor: true,
        x: {
          show: true,
          format: timeView === "hourly" ? "dd MMM yyyy - HH:mm" : "HH:mm",
        },
        y: {
          formatter: (val) => {
            if (val === undefined || val === null) return "";
            return `${Number(val).toFixed(unit === "V" ? 1 : 2)} ${unit}`;
          },
        },
        style: {
          fontSize: "14px",
          fontFamily: "Outfit, sans-serif",
        },
      },
      xaxis: {
        type: "datetime",
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          datetimeUTC: false,
          style: { colors: textColor, fontSize: "12px" },
        },
      },
      yaxis: {
        min: yaxisMin,
        max: yaxisMax,
        labels: {
          style: { fontSize: "12px", colors: [textColor] },
          formatter: (val) => val.toFixed(1),
        },
      },
      annotations: { yaxis: [] },
    };

    if (parsedMax && !isNaN(parsedMax)) {
      options.annotations!.yaxis!.push({
        y: parsedMax,
        borderColor: "#EF4444",
        strokeDashArray: 5,
        label: {
          borderColor: "#EF4444",
          borderWidth: 1,
          borderRadius: 4,
          style: {
            color: "#FFFFFF",
            background: "#EF4444",
            fontSize: "12px",
            fontWeight: 700,
            padding: {
              left: 8,
              right: 8,
              top: 4,
              bottom: 4,
            },
          },
          text: `MAX: ${parsedMax}`,
        },
      });
    }

    if (parsedMin && !isNaN(parsedMin)) {
      options.annotations!.yaxis!.push({
        y: parsedMin,
        borderColor: "#F59E0B",
        strokeDashArray: 5,
        label: {
          borderColor: "#F59E0B",
          borderWidth: 1,
          borderRadius: 4,
          style: {
            color: "#FFFFFF",
            background: "#F59E0B",
            fontSize: "12px",
            fontWeight: 700,
            padding: {
              left: 8,
              right: 8,
              top: 4,
              bottom: 4,
            },
          },
          text: `MIN: ${parsedMin}`,
        },
      });
    }
    return options;
  };

  return (
    <div className="space-y-6">
      {/* HEADER FILTER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="dropdown-toggle flex items-center justify-between w-[220px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            <span className="truncate">{selectedMeterName}</span>
            <svg className="w-4 h-4 ml-2 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Dropdown isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)} className="w-[220px]">
            {masterMeters.map((meter) => {
              const isSelected = selectedMeterId === meter.id;
              const itemStyle = isSelected
                ? "block w-full text-left px-4 py-2 text-sm font-semibold text-brand-500 bg-brand-50 dark:text-brand-400 dark:bg-brand-900/20"
                : "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white";
              return (
                <DropdownItem key={meter.id} baseClassName={itemStyle} onItemClick={() => { setSelectedMeterId(meter.id); setIsDropdownOpen(false); }}>
                  {meter.name}
                </DropdownItem>
              );
            })}
          </Dropdown>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-[200px]">
            <DatePicker
              id="history-date"
              placeholder="Select Date"
              defaultDate={selectedDate}
              onChange={(selectedDates) => {
                if (selectedDates.length > 0) {
                  const d = selectedDates[0];
                  setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                }
              }}
            />
          </div>
          <ChartTab onTabChange={(tab) => setTimeView(tab)} />
        </div>
      </div>
      
      {/* SUMMARY METRICS */}
      <AnalyticsMetrics avgVoltage={avgV} avgCurrent={avgC} avgPower={avgP} totalKwh={totalKwh} />

      {/* CHARTS */}
      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Loading analytics data...
        </div>
      ) : processedHistory.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          No data recorded for this date.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          
          {/* VOLTAGE CHART */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Voltage History</h3>
            <Chart 
              options={generateChartOptions("#465FFF", "V", activeMeter?.max_voltage, 350)} 
              series={[{ name: "Voltage", data: processedHistory.map(d => [new Date(d.recorded_at).getTime(), d.voltage]) }]} 
              type="area" height={260} 
            />
          </div>

          {/* CURRENT CHART */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Current History</h3>
            <Chart 
              options={generateChartOptions("#F59E0B", "A", activeMeter?.max_current)} 
              series={[{ name: "Current", data: processedHistory.map(d => [new Date(d.recorded_at).getTime(), d.current]) }]} 
              type="area" height={260} 
            />
          </div>

          {/* POWER CHART */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Power History</h3>
            <Chart 
              options={generateChartOptions("#10B981", "kW", undefined)} 
              series={[{ name: "Power", data: processedHistory.map(d => [new Date(d.recorded_at).getTime(), d.power]) }]} 
              type="area" height={260} 
            />
          </div>

          {/* ENERGY CONSUMPTION CHART */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Energy Consumption (kWh)</h3>
            {kwhDifferences.length < 1 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                At least 2 data records are required to calculate energy consumption.
              </div>
            ) : (
              <Chart 
                options={generateChartOptions("#8B5CF6", "kWh")} 
                series={[{ name: "Consumption", data: kwhDifferences }]} 
                type="area" height={260} 
              />
            )}
          </div>

        </div>
      )}
    </div>
  );
}

