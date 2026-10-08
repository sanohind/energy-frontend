import type { ReactNode } from "react";
import { BoltIcon, BoxIconLine, PlugInIcon } from "../../icons";
import Badge from "../ui/badge/Badge";
import {
  useRealtimeMetrics,
  type ConnectionStatus,
} from "../../hooks/useRealtimeMetrics";

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

function MetricCard({
  label,
  unit,
  value,
  digits,
  icon,
  status,
}: {
  label: string;
  unit: string;
  value: number | null;
  digits: number;
  icon: ReactNode;
  status: ConnectionStatus;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        {icon}
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {label} ({unit})
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {formatMetric(value, digits)}
          </h4>
        </div>
        <Badge color={statusColor[status]}>{statusLabel[status]}</Badge>
      </div>
    </div>
  );
}

export default function EnergyMetrics() {
  const { metrics, status } = useRealtimeMetrics();
  const iconClass = "text-gray-800 size-6 dark:text-white/90";

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        <MetricCard
          label="Voltage"
          unit="V"
          value={metrics.average.voltage}
          digits={1}
          status={status}
          icon={<BoltIcon className={iconClass} />}
        />
        <MetricCard
          label="Current"
          unit="A"
          value={metrics.average.current}
          digits={2}
          status={status}
          icon={<PlugInIcon className={iconClass} />}
        />
        <MetricCard
          label="Power"
          unit="W"
          value={metrics.average.power}
          digits={1}
          status={status}
          icon={<BoxIconLine className={iconClass} />}
        />
      </div>
      <div className="mt-10 space-y-8">
        {metrics.meters.map((meter) => (
          <div key={meter.id}>
            <h3 className="mb-4 text-md font-semibold text-gray-700 capitalize dark:text-gray-300">
              {/* Mengubah format "power_meter_1" menjadi "Power Meter 1" */}
              {meter.id.replace(/_/g, " ")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
              <MetricCard
                label="Voltage"
                unit="V"
                value={meter.voltage}
                digits={1}
                status={status}
                icon={<BoltIcon className={iconClass} />}
              />
              <MetricCard
                label="Current"
                unit="A"
                value={meter.current}
                digits={2}
                status={status}
                icon={<PlugInIcon className={iconClass} />}
              />
              <MetricCard
                label="Power"
                unit="W"
                value={meter.power}
                digits={1}
                status={status}
                icon={<BoxIconLine className={iconClass} />}
              />
            </div>
          </div>
        ))}
      </div>
    </div>  
  );
}
