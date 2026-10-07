import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function AdminRoute() {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
