import { Link } from "react-router-dom";
import { BriefcaseIcon, Mail, Phone, MapPin } from "lucide-react";

interface AuthenticatedFooterProps {
  userRole: 'applicant' | 'hr' | 'admin';
}

const AuthenticatedFooter = ({ userRole }: AuthenticatedFooterProps) => {
  const getQuickLinks = () => {
    switch (userRole) {
      case 'applicant':
        return [
          { href: "/jobs", label: "Browse Jobs" },
          { href: "/applications", label: "My Applications" },
          { href: "/profile", label: "Profile" },
          { href: "/saved-jobs", label: "Saved Jobs" },
        ];
      case 'hr':
        return [
          { href: "/dashboard/hr", label: "Dashboard" },
          { href: "/post-job", label: "Post Job" },
          { href: "/applications", label: "Applications" },
          { href: "/analytics", label: "Analytics" },
        ];
      case 'admin':
        return [
          { href: "/dashboard/admin", label: "Admin Dashboard" },
          { href: "/users", label: "User Management" },
          { href: "/analytics", label: "Analytics" },
          { href: "/settings", label: "System Settings" },
        ];
      default:
        return [];
    }
  };

  const quickLinks = getQuickLinks();

  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
  {/* Company Info */}
<div className="space-y-4">
  <div className="flex items-center space-x-2">
    <img 
      src="/image.png" 
      alt="AIPlaneTech Logo" 
      className="w-8 h-8 rounded-lg object-cover" 
    />
    <span className="text-xl font-bold text-foreground">AIPlaneTech | CareerMatch</span>
  </div>
  <p className="text-sm text-muted-foreground">
    Connecting talented professionals with their dream careers through intelligent matching and streamlined processes.
  </p>
  <div className="space-y-2 text-sm text-muted-foreground">
    <div className="flex items-center space-x-2">
      <Mail className="w-4 h-4" />
      <a href="mailto:aiplanetech@aipglobal.in" className="hover:underline">
        aiplanetech@aipglobal.in
      </a>
    </div>
    <div className="flex items-center space-x-2">
      <MapPin className="w-4 h-4" />
      <span>Jodhpur, Rajasthan, India</span>
    </div>
  </div>
</div>

{/* Quick Links */}
<div className="space-y-4">
  <h4 className="text-sm font-semibold text-foreground">Quick Links</h4>
  <ul className="space-y-2">
    {quickLinks.map((link) => (
      <li key={link.href}>
        <Link 
          to={link.href} 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {link.label}
        </Link>
      </li>
    ))}
  </ul>
</div>


          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/help" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  to="/feedback" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Send Feedback
                </Link>
              </li>
              <li>
                <Link 
                  to="/status" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  System Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/privacy" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  to="/cookies" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/gdpr" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  GDPR Compliance
                </Link>
              </li>
            </ul>
          </div>
        </div>
<div className="mt-8 pt-8 border-t border-border">
  <div className="flex justify-center items-center">
    <p className="text-sm text-muted-foreground text-center">
      &copy; {new Date().getFullYear()} AIPlaneTech-CareerMatch. All rights reserved.
    </p>
  </div>
</div>

      </div>
    </footer>
  );
};

export default AuthenticatedFooter;