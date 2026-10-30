import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import Badge from "../ui/badge/Badge";
import {
  useRealtimeMetrics,
  type ConnectionStatus,
} from "../../hooks/useRealtimeMetrics";
import api from "../../lib/api";
import { PowerMeter } from "../../types/powerMeter";
import { useTheme } from "../../context/ThemeContext";

const statusLabel: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  disconnected: "Disconnected",
};

const statusColor: Record<ConnectionStatus, "warning" | "success" | "error"> = {
  connecting: "warning",
  live: "success",
  disconnected: "error",
};

function formatMetric(value: number | null, digits: number): string {
  if (value === null) {
    return "—";
  }
  return value.toFixed(digits);
}

const LoadingIcon = () => (
  <svg className="h-10 w-10 animate-spin text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ErrorIcon = () => (
  <svg className="h-10 w-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

function GaugeMetricCard({
  label,
  unit,
  value,
  max,
  digits,
  color,
  status,
}: {
  label: string;
  unit: string;
  value: number | null;
  max: number;
  digits: number;
  color: string;
  status: ConnectionStatus;
}) {
  const { theme } = useTheme();
  const numericValue = value === null ? 0 : value;
  const percentage = Math.min((numericValue / max) * 100, 100);
  const series = [percentage];
  const isOverThreshold = status === "live" && value !== null && max !== undefined && max !== null && max > 0 && value > max;
  
  const options: ApexOptions = {
    colors: [isOverThreshold ? "#EF4444" : color],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        offsetY: -20,
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: "75%",
        },
        track: {
          background: isOverThreshold
            ? (theme === "dark" ? "#450a0a" : "#FEE2E2")
            : (theme === "dark" ? "#374151" : "#E4E7EC"),
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: {
            show: true,
            offsetY: 10,
            color: isOverThreshold ? "#EF4444" : (theme === "dark" ? "#9CA3AF" : "#6B7280"),
            fontSize: "20px",
          },
          value: {
            fontSize: "28px",
            fontWeight: "600",
            offsetY: -45,
            color: isOverThreshold ? "#EF4444" : (theme === "dark" ? "#FFFFFF" : "#1D2939"),
            formatter: function () {
              return formatMetric(value, digits) + " " + unit;
            },
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: [isOverThreshold ? "#EF4444" : color],
    },
    stroke: {
      lineCap: "round",
    },
    labels: [label],
  };

  let cardContent;
  if (status === "disconnected") {
    cardContent = (
      <div className="flex h-[200px] w-full flex-col items-center justify-center">
        <ErrorIcon />
        <span className="text-sm font-medium text-red-500">Connection Disconnected</span>
      </div>
    );
  } else if (status === "connecting" || value === null) {
    cardContent = (
      <div className="flex h-[200px] w-full flex-col items-center justify-center">
        <LoadingIcon />
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Waiting for data...</span>
      </div>
    );
  } else {
    cardContent = (
      <div className={`w-full flex justify-center ${isOverThreshold ? "gauge-alert" : ""}`}>
        <Chart options={options} series={series} type="radialBar" height={280} />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 md:p-6 transition-all duration-300 ${
        isOverThreshold
          ? "border-error-500/60 bg-error-50/10 dark:border-error-500/50 dark:bg-error-950/10 shadow-sm shadow-error-500/10 ring-1 ring-error-500/30"
          : "border-gray-200 dark:border-gray-800 dark:bg-white/[0.03]"
      }`}
    >
      {/* Warning badge centered at top of the card */}
      {isOverThreshold && (
        <div className="absolute left-1/2 -translate-x-1/2 top-4 z-10">
          <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400 border border-error-200 dark:border-error-500/30 shadow-xs animate-pulse whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-error-600 dark:bg-error-400" />
            Max Exceeded
          </span>
        </div>
      )}

      {/* Connection status badge at top right */}
      <div className="absolute right-4 top-4 z-10">
        <Badge color={statusColor[status]}>{statusLabel[status]}</Badge>
      </div>

      <div className="mt-4 flex flex-col items-center justify-center">
        {cardContent}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800/60 pt-3 w-full">
        <span>Max Threshold:</span>
        <span className={`font-semibold ${isOverThreshold ? "text-error-600 dark:text-error-400 font-bold" : ""}`}>
          {max} {unit}
        </span>
      </div>
    </div>
  );
}

export default function EnergyMetrics() {
  const { metrics, status } = useRealtimeMetrics();
  const [masterMeters, setMasterMeters] = useState<PowerMeter[]>([]);
  const [isMasterLoading, setIsMasterLoading] = useState(true);
  
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const response = await api.get("/power-meters");
        setMasterMeters(Array.isArray(response.data) ? response.data : response.data.data);
      } catch (error) {
        console.error("Failed to load master meters", error);
      } finally {
        setIsMasterLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  if (isMasterLoading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading dashboard configuration...
      </div>
    );
  }

  const displayMeters: Array<{
    key: string;
    slave_id: number | null;
    name: string;
    max_voltage: number;
    max_current: number;
    max_power: number;
    voltage: number | null;
    current: number | null;
    power: number | null;
  }> = [];

  masterMeters.forEach((master) => {
    if (master.is_active) {
      const rtData = metrics.meters.find((m) => m.slave_id === master.slave_id);

      displayMeters.push({
        key: `master_${master.id}`,
        slave_id: master.slave_id,
        name: master.name,
        max_voltage: master.max_voltage,
        max_current: master.max_current,
        max_power: master.max_power,
        voltage: rtData ? rtData.voltage : null,
        current: rtData ? rtData.current : null,
        power: rtData ? rtData.power : null,
      });
    }
  });

  metrics.meters.forEach((rtMeter) => {
    const isKnown = masterMeters.some((m) => m.slave_id === rtMeter.slave_id);
    if (!isKnown) {
      displayMeters.push({
        key: `unknown_${rtMeter.id}`,
        slave_id: rtMeter.slave_id,
        name: `Unknown Meter (Slave ID: ${rtMeter.slave_id != null ? rtMeter.slave_id : "?"})`,
        max_voltage: 250,
        max_current: 100,
        max_power: 22,
        voltage: rtMeter.voltage,
        current: rtMeter.current,
        power: rtMeter.power,
      });
    }
  });

  displayMeters.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="space-y-8">
        {displayMeters.length === 0 ? (
          <div className="p-10 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl dark:border-gray-800 dark:text-gray-400">
            No Power Meters registered in Master Data.
          </div>
        ) : (
          displayMeters.map((meter) => (
            <div key={meter.key}>
              <h3 className="mb-4 text-lg font-semibold text-gray-800 capitalize dark:text-white/90">
                {meter.name}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
                <GaugeMetricCard
                  label="Voltage"
                  unit="V"
                  value={meter.voltage}
                  digits={1}
                  max={meter.max_voltage}
                  color="#465FFF"
                  status={status}
                />
                <GaugeMetricCard
                  label="Current"
                  unit="A"
                  value={meter.current}
                  digits={2}
                  max={meter.max_current}
                  color="#F59E0B"
                  status={status}
                />
                <GaugeMetricCard
                  label="Power"
                  unit="kW"
                  value={meter.power}
                  digits={2}
                  max={meter.max_power} 
                  color="#10B981"
                  status={status}
                />
              </div>
            </div>  
          ))
        )}
      </div> 
    </div>
  );
}
