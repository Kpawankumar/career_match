import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  X, 
  BriefcaseIcon, 
  User, 
  LogOut, 
  FileText, 
  Search,
  Settings,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

interface AuthenticatedNavigationProps {
  user: {
    name: string;
    email: string;
    role: 'applicant' | 'hr' | 'admin';
  };
  onLogout: () => void;
}

const AuthenticatedNavigation = ({ user, onLogout }: AuthenticatedNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const getNavigationItems = () => {
    switch (user.role) {
      case 'applicant':
        return [
          { path: '/dashboard/applicant', label: 'Dashboard' },
          { path: '/services', label: 'Services', icon: Sparkles },
        ];
      case 'hr':
        return [
          { path: '/dashboard/hr', label: 'Dashboard' },
          { path: '/post-job', label: 'Post Job' },
          { path: '/applications', label: 'Applications' },
        ];
      case 'admin':
        return [
          { path: '/dashboard/admin', label: 'Admin Dashboard' },
          { path: '/users', label: 'Users' },
          { path: '/analytics', label: 'Analytics' },
        ];
      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
         {/* Logo */}
<div className="flex items-center">
  <Link to="/" className="flex items-center space-x-2">
    <img 
      src="/image.png" 
      alt="AIPlaneTech Logo" 
      className="w-8 h-8 rounded-lg object-cover" 
    />
    <span className="text-xl font-bold text-foreground">AIPlaneTech | CareerMatch</span>
  </Link>
</div>


          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive(item.path) 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {item.icon && <item.icon className="w-4 h-4" />}
                {item.label}
              </Link>
            ))}
            
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-4 bg-gradient-primary text-primary-foreground hover:bg-gradient-primary/90 flex-1">
                  <User className="w-4 h-4 mr-2" />
                  {user.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-muted-foreground">{user.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-muted-foreground hover:text-foreground p-2"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-background border-t border-border">
              {navigationItems.map((item) => (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={`block px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${
                    isActive(item.path) 
                      ? 'text-primary bg-primary/10' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              ))}
              
              <div className="pt-4 space-y-2 border-t border-border">
                <div className="px-3 py-2 text-sm">
                  <div className="font-medium text-foreground">{user.name}</div>
                  <div className="text-muted-foreground">{user.email}</div>
                </div>
                <Link 
                  to="/profile" 
                  className="flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
                <Link 
                  to="/settings" 
                  className="flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-destructive hover:bg-destructive/10 rounded-md"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default AuthenticatedNavigation;