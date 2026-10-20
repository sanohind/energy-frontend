import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ChartTab from "../common/ChartTab";
import api from "../../lib/api";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import DatePicker from "../form/date-picker";
import { PowerMeter } from "../../types/powerMeter";
import { data } from "react-router";

interface HistoryData {
  id: number;
  voltage: number;
  current: number;
  power: number;
  total_kwh: number;
  recorded_at: string;
}

export default function StatisticsChart({ powerMeterId = 1 }: { powerMeterId?: number }) {
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

        if (meters.length > 0) {
          setSelectedMeterId(meters[0].id);
        }
      } catch (error) {
        console.error("Gagal mengambil master meter", error);
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
        setHistory(response.data.reverse());
      } catch (error) {
        console.error("Gagal mengambil data history", error);
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
      if (!hourlyGroups[hourKey]) {
        hourlyGroups[hourKey] = [];
      }
      hourlyGroups[hourKey].push(data);
    });

    const aggregated: HistoryData[] = Object.entries(hourlyGroups).map(([hour, items]) => {
      const sumVoltage = items.reduce((sum, item) => sum + item.voltage, 0);
      const sumCurrent = items.reduce((sum, item) => sum + item.current, 0);
      const sumPower = items.reduce((sum, item) => sum + item.power, 0);

      const lastKwh = items[items.length - 1].total_kwh;

      return {
        id: 0,
        voltage: sumVoltage / items.length,
        current: sumCurrent / items.length,
        power: sumPower / items.length,
        total_kwh: lastKwh,
        recorded_at: hour,
      };
    });
    return aggregated;
  };

  const processedHistory = getAggregatedData();

  const mainSeries = [
    { name: "Voltage (V)", data: processedHistory.map((d) => [new Date(d.recorded_at).getTime(), d.voltage]) },
    { name: "Current (A)", data: processedHistory.map((d) => [new Date(d.recorded_at).getTime(), d.current]) },
    { name: "Power (kW)", data: processedHistory.map((d) => [new Date(d.recorded_at).getTime(), d.power]) },
  ];

  const options: ApexOptions = {
    legend: { show: true, position: "top", horizontalAlign: "left" },
    colors: ["#465FFF", "#F59E0B", "#10B981"],
    chart: { fontFamily: "Outfit, sans-serif", height: 310, type: "area", toolbar: { show: false } },
    stroke: { curve: "smooth", width: [2, 2, 2] },
    fill: { type: "gradient", gradient: { opacityFrom: 0.2, opacityTo: 0 } },
    markers: { size: 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 6 } },
    grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    tooltip: { enabled: true, x: { format: timeView === "hourly" ? "dd MMM yyyy - HH:mm" : "dd MMM yyyy - HH:mm" } },
    xaxis: { type: "datetime",  axisBorder: { show: false }, axisTicks: { show: false }, labels: { datetimeUTC: false } },
    yaxis: { labels: { style: { fontSize: "12px", colors: ["#6B7280"] }, formatter: (val) => val.toFixed(1) } },
  };

  const kwhDifferences: [number, number][] = [];

  for (let i = 1; i < processedHistory.length; i++) {
    const prev = processedHistory[i - 1];
    const curr = processedHistory[i];
    let difference = curr.total_kwh - prev.total_kwh;
    if (difference < 0) difference = 0;
    kwhDifferences.push([new Date(curr.recorded_at).getTime(), difference]);
  }

  const kwhSeries = [{ name: "Konsumsi (kWh)", data: kwhDifferences }];

  const kwhOptions: ApexOptions = {
    legend: { show: true, position: "top", horizontalAlign: "left" },
    colors: ["#8B5CF6"],
    chart: { fontFamily: "Outfit, sans-serif", height: 310, type: "area", toolbar: { show: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    markers: { size: 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 6 } },
    grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    tooltip: { enabled: true, x: { format: "dd MMM yyyy - HH:mm" } },
    xaxis: { type: "datetime", axisBorder: { show: false }, axisTicks: { show: false }, labels: { datetimeUTC: false } },
    yaxis: {
      labels: { style: { fontSize: "12px", colors: ["#6B7280"] }, formatter: (val) => val.toFixed(2) },
      title: { text: "kWh Terpakai", style: { fontSize: "12px", fontWeight: 500, color: "#6B7280" } }
    },
  };

  const selectedMeterName = masterMeters.find((m) => m.id === selectedMeterId)?.name || "Power Meter";

  return (
  <div className="space-y-6">
      
      {/* ================= HEADER FILTER KONTROL ================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
        
        {/* Dropdown Pilih Perangkat */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="dropdown-toggle flex items-center justify-between w-[220px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <span className="truncate">
              {selectedMeterName}
            </span>
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          
          <Dropdown isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)} className="w-[220px]">
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

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Filter Tanggal */}
          <div className="w-[200px]">
            <DatePicker
              id="history-date"
              placeholder="Pilih Tanggal"
              defaultDate={selectedDate}
              onChange={(selectedDates) => {
                if (selectedDates.length > 0) {
                  // Format ke YYYY-MM-DD
                  const d = selectedDates[0];
                  const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  setSelectedDate(formattedDate);
                }
              }}
            />
          </div>
          
          {/* Filter Agregasi Waktu (Tab) */}
          <ChartTab onTabChange={(tab) => setTimeView(tab)} />
        </div>
      </div>
      {/* ================= END HEADER FILTER KONTROL ================= */}


      {/* KOTAK CHART UTAMA (V, A, kW) */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Riwayat Beban {selectedMeterName}
            </h3>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              Menampilkan data pada tanggal {selectedDate} ({timeView === "minutes" ? "Interval 5 Menit" : "Rata-rata Per Jam"})
            </p>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[700px] xl:min-w-full">
            {isLoading ? (
              <div className="flex h-[310px] items-center justify-center text-gray-500">Memuat data...</div>
            ) : processedHistory.length === 0 ? (
              <div className="flex h-[310px] items-center justify-center text-gray-500">Tidak ada data untuk tanggal ini.</div>
            ) : (
              <Chart options={options} series={mainSeries} type="area" height={310} />
            )}
          </div>
        </div>
      </div>

      {/* KOTAK CHART KWH KONSUMSI (Selisih) */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Konsumsi Energi (kWh)
            </h3>
            <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
              Daya terpakai antar interval
            </p>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[700px] xl:min-w-full">
            {isLoading ? (
              <div className="flex h-[250px] items-center justify-center text-gray-500">Memuat data...</div>
            ) : kwhDifferences.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-gray-500">Dibutuhkan minimal 2 rekaman data untuk menghitung konsumsi.</div>
            ) : (
              <Chart options={kwhOptions} series={kwhSeries} type="area" height={250} />
            )}
          </div>
        </div>
      </div> 
    </div> 
  );
}