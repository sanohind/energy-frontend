import { useState } from "react";

interface ChartTabProps {
  onTabChange: (tab: "minutes" | "hourly") => void;
}

const ChartTab: React.FC<ChartTabProps> = ({ onTabChange }) => {
  const [selected, setSelected] = useState<"minutes" | "hourly">("minutes");

  const handleSelect = (option: "minutes" | "hourly") => {
    setSelected(option);
    onTabChange(option);
  };

  const getButtonClass = (option: "minutes" | "hourly") =>
    selected === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        onClick={() => handleSelect("minutes")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass(
          "minutes"
        )}`}
      >
        Minutes
      </button>

      <button
        onClick={() => handleSelect("hourly")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass(
          "hourly"
        )}`}
      >
        Hourly
      </button>
    </div>
  );
};

export default ChartTab;
