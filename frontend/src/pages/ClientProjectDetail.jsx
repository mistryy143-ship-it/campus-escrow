import { useParams } from "react-router-dom";
import RoleLayout from "../components/RoleLayout.jsx";
import AgreementView from "../components/AgreementView.jsx";

export default function ClientProjectDetail() {
  const { id } = useParams();
  return (
    <RoleLayout role="CLIENT">
      <AgreementView projectId={id} mode="client" />
    </RoleLayout>
  );
}
