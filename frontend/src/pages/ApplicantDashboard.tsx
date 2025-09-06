import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/layout/Layout";
import { 
  Briefcase, 
  Search, 
  MapPin, 
  Clock, 
  BookmarkIcon, 
  User, 
  FileText, 
  Bell,
  TrendingUp,
  Calendar,
  Mail,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Target,
  Award,
  Zap,
  Activity,
  Users,
  Building,
  Settings
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalJobsShown: number;
  totalJobsSelected: number;
  totalCoverLettersGenerated: number;
  totalResumesGenerated: number;
  totalApplications: number;
  totalInterviews: number;
  totalSavedJobs: number;
  profileViews: number;
  applicationSuccessRate: number;
  averageMatchScore: number;
}

interface JobApplication {
  application_id: number;
  job_id: number;
  job_title: string;
  org_name: string;
  job_location: string;
  applied_date: string;
  status: string;
  match_score?: number;
  enhanced_resume_url?: string;
  cover_letter_id?: number;
}

interface EnhancedResume {
  id: number;
  job_title: string;
  company: string;
  created_at: string;
  improvements: any;
  keywords: string[];
}

interface CoverLetter {
  id: number;
  job_title: string;
  company: string;
  created_at: string;
  content: string;
}

interface ServiceUsage {
  service_name: string;
  usage_count: number;
  last_used: string;
}

const ApplicantDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    totalJobsShown: 0,
    totalJobsSelected: 0,
    totalCoverLettersGenerated: 0,
    totalResumesGenerated: 0,
    totalApplications: 0,
    totalInterviews: 0,
    totalSavedJobs: 0,
    profileViews: 0,
    applicationSuccessRate: 0,
    averageMatchScore: 0
  });
  const [appliedJobs, setAppliedJobs] = useState<JobApplication[]>([]);
  const [enhancedResumes, setEnhancedResumes] = useState<EnhancedResume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [serviceUsage, setServiceUsage] = useState<ServiceUsage[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboardData();
  }, [user?.id]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data from the analytics service
      const [statsResponse, applicationsResponse, resumesResponse, coverLettersResponse, serviceUsageResponse, activityResponse] = await Promise.allSettled([
        fetchUserStats(),
        fetchUserApplications(),
        fetchUserResumes(),
        fetchUserCoverLetters(),
        fetchServiceUsage(),
        fetchRecentActivity()
      ]);

      // Handle stats
      if (statsResponse.status === 'fulfilled') {
        setStats(statsResponse.value);
      }

      // Handle applications
      if (applicationsResponse.status === 'fulfilled') {
        setAppliedJobs(applicationsResponse.value);
      }

      // Handle enhanced resumes
      if (resumesResponse.status === 'fulfilled') {
        setEnhancedResumes(resumesResponse.value);
      }

      // Handle cover letters
      if (coverLettersResponse.status === 'fulfilled') {
        setCoverLetters(coverLettersResponse.value);
      }

      // Handle service usage
      if (serviceUsageResponse.status === 'fulfilled') {
        setServiceUsage(serviceUsageResponse.value);
      }

      // Handle recent activity
      if (activityResponse.status === 'fulfilled') {
        setRecentActivity(activityResponse.value);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async (): Promise<DashboardStats> => {
    try {
      const response = await axios.get(`https://dashboard-analytics-1071432896229.asia-south2.run.app/dashboard-stats/${user?.id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalJobsShown: 0,
        totalJobsSelected: 0,
        totalCoverLettersGenerated: 0,
        totalResumesGenerated: 0,
        totalApplications: 0,
        totalInterviews: 0,
        totalSavedJobs: 0,
        profileViews: 0,
        applicationSuccessRate: 0,
        averageMatchScore: 0
      };
    }
  };

  const fetchUserApplications = async (): Promise<JobApplication[]> => {
    try {
      const response = await axios.get(`https://dashboard-analytics-1071432896229.asia-south2.run.app/user-applications/${user?.id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching applications:', error);
      return [];
    }
  };

  const fetchUserResumes = async (): Promise<EnhancedResume[]> => {
    try {
      const response = await axios.get(`https://dashboard-analytics-1071432896229.asia-south2.run.app/user-enhanced-resumes/${user?.id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching enhanced resumes:', error);
      return [];
    }
  };

  const fetchUserCoverLetters = async (): Promise<CoverLetter[]> => {
    try {
      const response = await axios.get(`https://dashboard-analytics-1071432896229.asia-south2.run.app/user-cover-letters/${user?.id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching cover letters:', error);
      return [];
    }
  };

  const fetchServiceUsage = async (): Promise<ServiceUsage[]> => {
    try {
      const response = await axios.get(`https://dashboard-analytics-1071432896229.asia-south2.run.app/service-usage/${user?.id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching service usage:', error);
      return [];
    }
  };

  const fetchRecentActivity = async (): Promise<any[]> => {
    try {
      const response = await axios.get(`https://dashboard-analytics-1071432896229.asia-south2.run.app/recent-activity/${user?.id}`);
      return response.data.map((activity: any) => ({
        ...activity,
        icon: getActivityIcon(activity.type),
        color: getActivityColor(activity.type)
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'application': return Briefcase;
      case 'resume': return FileText;
      case 'cover_letter': return Mail;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'application': return 'text-blue-600';
      case 'resume': return 'text-green-600';
      case 'cover_letter': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "under review": return "bg-yellow-100 text-yellow-800";
      case "interview scheduled": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "accepted": return "bg-blue-100 text-blue-800";
      case "applied": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "under review": return <AlertCircle className="h-4 w-4" />;
      case "interview scheduled": return <CheckCircle className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      case "accepted": return <CheckCircle className="h-4 w-4" />;
      case "applied": return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'User'}!</h1>
          <p className="text-muted-foreground">Track your job search progress and AI-powered services usage</p>
        </div>

        {/* Comprehensive Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Jobs Shown</p>
                  <p className="text-2xl font-bold">{stats.totalJobsShown}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total matches displayed</p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Jobs Selected</p>
                  <p className="text-2xl font-bold">{stats.totalJobsSelected}</p>
                  <p className="text-xs text-muted-foreground mt-1">Positions applied to</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resumes Generated</p>
                  <p className="text-2xl font-bold">{stats.totalResumesGenerated}</p>
                  <p className="text-xs text-muted-foreground mt-1">AI-enhanced resumes</p>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cover Letters</p>
                  <p className="text-2xl font-bold">{stats.totalCoverLettersGenerated}</p>
                  <p className="text-xs text-muted-foreground mt-1">AI-generated letters</p>
                </div>
                <Mail className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Removed Success Rate, Match Score, Interviews, Profile Views */}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="resumes">Resumes</TabsTrigger>
            <TabsTrigger value="cover-letters">Cover Letters</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest job search activities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(recentActivity || []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recent activity</p>
                        <p className="text-sm">Start using our services to see your activity here</p>
                      </div>
                    ) : (
                      (recentActivity || []).map((activity, index) => {
                        const IconComponent = activity.icon;
                        return (
                          <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                            <div className={`p-2 rounded-full bg-gray-100 ${activity.color}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{activity.title}</h3>
                              <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                              <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Service Usage Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Usage</CardTitle>
                  <CardDescription>AI services you've used</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(serviceUsage || []).length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No services used yet</p>
                    </div>
                  ) : (
                    (serviceUsage || []).map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium capitalize">{service.service_name.replace('_', ' ')}</h4>
                          <p className="text-sm text-muted-foreground">{service.usage_count} times used</p>
                        </div>
                        <Badge variant="secondary">{service.usage_count}</Badge>
                      </div>
                    ))
                  )}
                  <Link to="/services">
                    <Button variant="outline" className="w-full mt-4">
                      Explore Services
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Applications</CardTitle>
                <CardDescription>Track all your job applications and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(appliedJobs || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No applications yet</p>
                      <p className="text-sm">Start applying to jobs to see them here</p>
                    </div>
                  ) : (
                    (appliedJobs || []).map((app) => (
                      <div key={app.application_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(app.status)}
                            <h3 className="font-semibold">{app.job_title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{app.org_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {app.job_location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {app.applied_date}
                            </span>
                            {app.match_score && (
                              <span className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                {app.match_score}% match
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(app.status)}>{app.status}</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/jobs/${app.job_id}`, '_blank')}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resumes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Resumes</CardTitle>
                <CardDescription>AI-enhanced resumes generated for specific jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(enhancedResumes || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No enhanced resumes yet</p>
                      <p className="text-sm">Use our Resume Enhancer service to create tailored resumes</p>
                    </div>
                  ) : (
                    (enhancedResumes || []).map((resume) => (
                      <div key={resume.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-semibold">{resume.job_title}</h3>
                          <p className="text-sm text-muted-foreground">{resume.org_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {resume.created_at.split('T')[0]}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {resume.keywords.length} keywords
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`https://resume-enhancer-ab-1071432896229.asia-south2.run.app/view-enhanced-resume/${resume.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`https://resume-enhancer-ab-1071432896229.asia-south2.run.app/download-enhanced-resume/${resume.id}`, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cover-letters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cover Letters</CardTitle>
                <CardDescription>AI-generated cover letters for your applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(coverLetters || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No cover letters yet</p>
                      <p className="text-sm">Use our Cover Letter Generator service to create personalized letters</p>
                    </div>
                  ) : (
                    (coverLetters || []).map((letter) => (
                      <div key={letter.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-semibold">{letter.job_title}</h3>
                          <p className="text-sm text-muted-foreground">{letter.org_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {letter.created_at.split('T')[0]}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {(letter.content?.length || 0) > 100 ? 'Long' : 'Short'} letter
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const blob = new Blob([letter.content], { type: 'text/plain' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `cover_letter_${letter.job_title.replace(/\s+/g, '_')}.txt`;
                              a.click();
                              window.URL.revokeObjectURL(url);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const blob = new Blob([letter.content], { type: 'text/plain' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `cover_letter_${letter.job_title.replace(/\s+/g, '_')}.txt`;
                              a.click();
                              window.URL.revokeObjectURL(url);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Services</CardTitle>
                <CardDescription>Streamline your job search with our integrated services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Link to="/job-matcher-service">
                    <Card className="cursor-pointer hover:shadow-md transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Search className="w-5 h-5 text-green-600" />
                          </div>
                          <h3 className="font-semibold">Job Matcher</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Find jobs that match your skills and preferences</p>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/resume-enhancer-service">
                    <Card className="cursor-pointer hover:shadow-md transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="font-semibold">Resume Enhancer</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">AI-powered resume optimization for specific jobs</p>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/cover-letter-generator-service">
                    <Card className="cursor-pointer hover:shadow-md transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-purple-600" />
                          </div>
                          <h3 className="font-semibold">Cover Letter Generator</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Generate personalized cover letters</p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </Layout>
  );
};

export default ApplicantDashboard;