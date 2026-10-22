import AnalyticsBarChart from "../../components/analytics/AnalyticsBarChart";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function Analytics() {
  return (
    <>
      <PageMeta
        title="Analytics | Energy Monitoring"
        description="Historical energy analytics and consumption trends"
      />
      <PageBreadcrumb pageTitle="Analytics" />
      <div className="space-y-6">
        <AnalyticsBarChart />
      </div>
    </>
  );
}
