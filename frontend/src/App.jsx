import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import ClientDashboard from "./pages/ClientDashboard.jsx";
import ClientCreateProject from "./pages/ClientCreateProject.jsx";
import ClientProjectDetail from "./pages/ClientProjectDetail.jsx";
import FreelancerDashboard from "./pages/FreelancerDashboard.jsx";
import FreelancerProjectDetail from "./pages/FreelancerProjectDetail.jsx";
import ReviewerDashboard from "./pages/ReviewerDashboard.jsx";
import ReviewerDisputeDetail from "./pages/ReviewerDisputeDetail.jsx";
import AuditExplorer from "./pages/AuditExplorer.jsx";
import NotFound from "./pages/NotFound.jsx";
import RoleGuard from "./components/RoleGuard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route path="/client/dashboard" element={<RoleGuard role="CLIENT"><ClientDashboard /></RoleGuard>} />
      <Route path="/client/create" element={<RoleGuard role="CLIENT"><ClientCreateProject /></RoleGuard>} />
      <Route path="/client/projects/:id" element={<RoleGuard role="CLIENT"><ClientProjectDetail /></RoleGuard>} />

      <Route path="/freelancer/dashboard" element={<RoleGuard role="FREELANCER"><FreelancerDashboard /></RoleGuard>} />
      <Route path="/freelancer/projects/:id" element={<RoleGuard role="FREELANCER"><FreelancerProjectDetail /></RoleGuard>} />

      <Route path="/reviewer/dashboard" element={<RoleGuard role="REVIEWER"><ReviewerDashboard /></RoleGuard>} />
      <Route path="/reviewer/disputes/:id" element={<RoleGuard role="REVIEWER"><ReviewerDisputeDetail /></RoleGuard>} />

      <Route path="/audit" element={<RoleGuard role={null}><AuditExplorer /></RoleGuard>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
