import SummaryChart from "../../components/summary/SummaryChart";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function Summary() {
  return (
    <>
      <PageMeta
        title="Summary | Energy Monitoring"
        description="Daily energy consumption summary differentiated by work shifts"
      />
      <PageBreadcrumb pageTitle="Summary" />
      <div className="space-y-6">
        <SummaryChart />
      </div>
    </>
  );
}

