import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedNavigation from "@/components/layout/AuthenticatedNavigation";
import AuthenticatedFooter from "@/components/layout/AuthenticatedFooter";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import PublicNavigation from "@/components/layout/PublicNavigation";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Enhanced logout handler to redirect after logout
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Decide which navigation and footer to show
  const showAuthenticated = isAuthenticated && user;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showAuthenticated ? (
        <AuthenticatedNavigation user={user!} onLogout={handleLogout} />
      ) : (
        <Navigation />
      )}
      <main className="flex-1">{children}</main>
      {showAuthenticated ? (
        <AuthenticatedFooter userRole={user!.role} />
      ) : (
        <Footer />
      )}
    </div>
  );
};

export default Layout; 