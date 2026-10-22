import EnergyMetrics from "../../components/monitoring/EnergyMetrics";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function Monitoring() {
  return (
    <>
      <PageMeta
        title="Monitoring | Energy Monitoring"
        description="Real-time voltage, current, and power monitoring dashboard"
      />
      <PageBreadcrumb pageTitle="Monitoring" />
      <div className="space-y-6">
        <EnergyMetrics />
      </div>
    </>
  );
}
