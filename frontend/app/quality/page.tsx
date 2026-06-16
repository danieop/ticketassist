import { QualityDashboard } from "@/components/quality-dashboard";
import { RoleDashboard } from "@/components/role-dashboard";

export default function QualityPage() {
  return (
    <RoleDashboard role="quality">
      <QualityDashboard />
    </RoleDashboard>
  );
}
