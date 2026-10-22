import React from "react";

interface MetricsProps {
  avgVoltage: string;
  avgCurrent: string;
  avgPower: string;
  totalKwh: string;
}

const AnalyticsMetrics: React.FC<MetricsProps> = ({ avgVoltage, avgCurrent, avgPower, totalKwh }) => {
  const metrics = [
    { id: 1, title: "Average Voltage (V)", value: avgVoltage, color: "text-blue-600 dark:text-blue-400" },
    { id: 2, title: "Average Current (A)", value: avgCurrent, color: "text-amber-500 dark:text-amber-400" },
    { id: 3, title: "Average Power (kW)", value: avgPower, color: "text-emerald-500 dark:text-emerald-400" },
    { id: 4, title: "Total Consumption (kWh)", value: totalKwh, color: "text-purple-500 dark:text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4 mb-6">
      {metrics.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            {item.title}
          </p>
          <div className="mt-3">
            <h4 className={`text-2xl font-bold ${item.color}`}>
              {item.value}
            </h4>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnalyticsMetrics;
