import { useParams } from "react-router-dom";
import RoleLayout from "../components/RoleLayout.jsx";
import AgreementView from "../components/AgreementView.jsx";

export default function FreelancerProjectDetail() {
  const { id } = useParams();
  return (
    <RoleLayout role="FREELANCER">
      <AgreementView projectId={id} mode="freelancer" />
    </RoleLayout>
  );
}
