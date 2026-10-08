import EnergyMetrics from "../../components/monitoring/EnergyMetrics";
import MonthlySalesChart from "../../components/monitoring/MonthlySalesChart";
import StatisticsChart from "../../components/monitoring/StatisticsChart";
import MonthlyTarget from "../../components/monitoring/MonthlyTarget";
import RecentOrders from "../../components/monitoring/RecentOrders";
import DemographicCard from "../../components/monitoring/DemographicCard";
import PageMeta from "../../components/common/PageMeta";

export default function Monitoring() {
  return (
    <>
      <PageMeta
        title="Monitoring | Energy Monitoring"
        description="Real-time voltage, current, and power monitoring dashboard"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <EnergyMetrics />
        </div>

        <div className="col-span-12 space-y-6 xl:col-span-7">
          <MonthlySalesChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <DemographicCard />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div>
      </div>
    </>
  );
}
