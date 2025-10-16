import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, adminOnly = false }) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser) return <Navigate to="/login" replace />;
  if (adminOnly && currentUser.role !== "admin") return <Navigate to="/" replace />;

  return children;
}

export default ProtectedRoute;