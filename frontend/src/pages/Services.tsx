import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  FileText, 
  Search, 
  Mail, 
  Upload, 
  ArrowRight, 
  CheckCircle,
  Star,
  Users,
  Zap,
  User,
  Settings,
  BarChart3,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";

interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  route: string;
  isPopular?: boolean;
  isNew?: boolean;
  requiresResume: boolean;
  requiresProfile: boolean;
}

const Services = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [userHasResume, setUserHasResume] = useState(false);
  const [userHasProfile, setUserHasProfile] = useState(false);

  // Update the services array to only include the three main services, and make them independent except for profile
  const services: Service[] = [
    {
      id: "job-matcher",
      title: "Smart Job Matcher",
      description: "Find the perfect jobs that match your skills and preferences. Use as a standalone service if you only want job recommendations.",
      icon: Search,
      features: [
        "AI-powered matching",
        "Skill-based recommendations",
        "Location preferences",
        "Salary range filtering"
      ],
      route: "/job-matcher-service",
      requiresResume: false, // Only requires profile
      requiresProfile: true
    },
    {
      id: "resume-enhancer",
      title: "Resume Enhancer",
      description: "AI-powered resume optimization tailored to specific job requirements.",
      icon: FileText,
      features: [
        "Keyword optimization",
        "ATS-friendly formatting",
        "Industry-specific improvements",
        "Real-time suggestions"
      ],
      route: "/resume-enhancer-service",
      requiresResume: false, // Only requires profile
      requiresProfile: true
    },
    {
      id: "cover-letter-generator",
      title: "Cover Letter Generator",
      description: "Generate personalized cover letters for your job applications.",
      icon: Mail,
      features: [
        "Personalized content",
        "Job-specific customization",
        "Professional templates",
        "Multiple formats"
      ],
      route: "/cover-letter-generator-service",
      requiresResume: false, // Only requires profile
      requiresProfile: true
    }
  ];

  // Check user's resume and profile status
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if user has uploaded a resume (if needed in the future)
      const hasResume = localStorage.getItem('userResume') || localStorage.getItem('parsedProfile');
      setUserHasResume(!!hasResume);

      // More flexible profile check: must have any profile data
      const profile = sessionStorage.getItem('userProfile');
      let hasProfile = false;
      if (profile) {
        try {
          const parsed = JSON.parse(profile);
          hasProfile = !!(parsed && (
            parsed.firstName || 
            parsed.lastName || 
            parsed.name ||
            parsed.email ||
            parsed.location ||
            parsed.city ||
            parsed.address
          ));
        } catch {
          hasProfile = false;
        }
      }
      setUserHasProfile(hasProfile);
    }
  }, [isAuthenticated, user]);

  const handleServiceClick = (service: Service) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this service",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (service.requiresProfile && !userHasProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first to use this service",
        variant: "destructive"
      });
      navigate('/profile');
      return;
    }

    setSelectedService(service.id);
    navigate(service.route);
  };

  const getPopularServices = () => services.filter(s => s.isPopular);
  const getNewServices = () => services.filter(s => s.isNew);
  // Update getAvailableServices to only check for profile
  const getAvailableServices = () => services.filter(s => {
    if (s.requiresProfile && !userHasProfile) return false;
    return true;
  });

  const getLockedServices = () => services.filter(s => {
    if (s.requiresProfile && !userHasProfile) return true;
    return false;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
 

        {/* Hero Section */}
        <div className="relative overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI-Powered Career Services
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Individual AI Services
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
                Access our AI-powered services individually. Each service is designed to help you 
                succeed in your job search journey.
              </p>
            </div>
          </div>
        </div>

        {/* Available Services */}
        <div className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Available Services
              </h3>
              <p className="text-lg text-gray-600">
                Services you can access right now
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {getAvailableServices().map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onClick={() => handleServiceClick(service)}
                  isSelected={selectedService === service.id}
                  isLocked={false}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Locked Services */}
        {getLockedServices().length > 0 && (
          <div className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Unlock More Services
                </h3>
                <p className="text-lg text-gray-600">
                  Complete your setup to access these advanced services
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {getLockedServices().map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onClick={() => handleServiceClick(service)}
                    isSelected={false}
                    isLocked={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Popular Services */}
        {getPopularServices().length > 0 && (
          <div className="py-12 bg-blue-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Most Popular Services
                </h3>
                <p className="text-lg text-gray-600">
                  Our most sought-after AI-powered career tools
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {getPopularServices().map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onClick={() => handleServiceClick(service)}
                    isSelected={selectedService === service.id}
                    isLocked={false}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* New Services */}
        {getNewServices().length > 0 && (
          <div className="py-12 bg-green-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  New & Exciting Features
                </h3>
                <p className="text-lg text-gray-600">
                  Latest additions to our AI career platform
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {getNewServices().map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onClick={() => handleServiceClick(service)}
                    isSelected={selectedService === service.id}
                    isLocked={false}
                  />
                ))}
              </div>
            </div>
          </div>
        )}


      </div>
    </Layout>
  );
};

interface ServiceCardProps {
  service: Service;
  onClick: () => void;
  isSelected: boolean;
  isLocked: boolean;
}

const ServiceCard = ({ service, onClick, isSelected, isLocked }: ServiceCardProps) => {
  const IconComponent = service.icon;

  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      } ${isLocked ? 'opacity-60' : ''}`}
      onClick={isLocked ? undefined : onClick}
      tabIndex={0}
      aria-disabled={isLocked}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconComponent className="w-8 h-8 text-blue-500" />
            <CardTitle>{service.title}</CardTitle>
            {service.isPopular && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Popular
              </Badge>
            )}
            {service.isNew && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                New
              </Badge>
            )}
          </div>
          <ArrowRight className={`w-5 h-5 ${isLocked ? 'text-gray-300' : 'text-gray-400'}`} />
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className={`text-sm mb-4 ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>{service.description}</CardDescription>
        <div className="space-y-2">
          {service.features.map((feature, index) => (
            <div key={index} className="flex items-center text-sm">
              <CheckCircle className={`w-4 h-4 mr-2 flex-shrink-0 ${isLocked ? 'text-gray-300' : 'text-green-500'}`} />
              <span className={isLocked ? 'text-gray-400' : 'text-gray-600'}>
                {feature}
              </span>
            </div>
          ))}
        </div>
        {isLocked && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              {service.requiresProfile && "Requires profile completion"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Services;