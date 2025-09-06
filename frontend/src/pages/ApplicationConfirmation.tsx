import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  CheckCircle, 
  Mail, 
  FileText, 
  Clock, 
  ArrowRight,
  Download,
  Eye,
  Building,
  MapPin,
  Calendar,
  Users,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";

interface ApplicationStatus {
  job_id: string;
  job_title: string;
  company: string;
  location: string;
  status: 'sent' | 'delivered' | 'read' | 'responded';
  sent_at: string;
  resume_sent: boolean;
  cover_letter_sent: boolean;
  email_sent: boolean;
}

const ApplicationConfirmation = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<ApplicationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSent: 0,
    delivered: 0,
    read: 0,
    responded: 0
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Get application data from location state or localStorage
    const applicationData = location.state?.applications || [];
    if (applicationData.length > 0) {
      setApplications(applicationData);
      calculateStats(applicationData);
    } else {
      // Fallback: load from localStorage
      const storedApplications = localStorage.getItem('recentApplications');
      if (storedApplications) {
        const parsed = JSON.parse(storedApplications);
        setApplications(parsed);
        calculateStats(parsed);
      }
    }
    
    // Fetch real-time stats from backend
    fetchRealTimeStats();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchRealTimeStats, 30000); // Poll every 30 seconds
    
    setIsLoading(false);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, navigate, location]);

  const fetchRealTimeStats = async () => {
    try {
      const response = await fetch(`http://localhost:9005/get-real-time-stats/${user?.id}`);
      if (response.ok) {
        const realTimeStats = await response.json();
        setStats(realTimeStats);
      }
    } catch (error) {
      console.error('Error fetching real-time stats:', error);
    }
  };

  const calculateStats = (apps: ApplicationStatus[]) => {
    setStats({
      totalSent: apps.length,
      delivered: apps.filter(app => app.status !== 'sent').length,
      read: apps.filter(app => app.status === 'read' || app.status === 'responded').length,
      responded: apps.filter(app => app.status === 'responded').length
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Mail className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'read': return <Eye className="h-4 w-4" />;
      case 'responded': return <Users className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleViewDashboard = () => {
    navigate('/dashboard/applicant');
  };

  const handleApplyMore = () => {
    navigate('/job-preferences');
  };

  const handleDownloadResume = (jobId: string) => {
    // Download the enhanced resume for this job
    const application = applications.find(app => app.job_id === jobId);
    if (application) {
      // This would typically download the enhanced resume
      toast({
        title: "Download Started",
        description: `Downloading enhanced resume for ${application.job_title}`,
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <main className="px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-primary-foreground animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Processing Applications</h1>
            <p className="text-lg text-muted-foreground">
              Please wait while we confirm your applications...
            </p>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">Applications Sent Successfully!</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Your enhanced resumes and cover letters have been automatically sent to HR departments.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={handleViewDashboard} variant="outline" size="lg">
                <TrendingUp className="w-5 h-5 mr-2" />
                View Dashboard
              </Button>
              <Button onClick={handleApplyMore} size="lg">
                <ArrowRight className="w-5 h-5 mr-2" />
                Apply to More Jobs
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                    <p className="text-2xl font-bold">{stats.totalSent}</p>
                  </div>
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                    <p className="text-2xl font-bold">{stats.delivered}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Read</p>
                    <p className="text-2xl font-bold">{stats.read}</p>
                  </div>
                  <Eye className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Responses</p>
                    <p className="text-2xl font-bold">{stats.responded}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Application Details */}
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
              <CardDescription>
                Track the status of your applications and what was sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No applications found</p>
                    <p className="text-sm">Your applications may still be processing</p>
                  </div>
                ) : (
                  applications.map((application, index) => (
                    <div key={application.job_id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(application.status)}
                            <h3 className="text-lg font-semibold">{application.job_title}</h3>
                            <Badge className={getStatusColor(application.status)}>
                              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building className="h-4 w-4" />
                              {application.company}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {application.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(application.sent_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadResume(application.job_id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      </div>

                      {/* What was sent */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 ${application.resume_sent ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Enhanced Resume</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 ${application.cover_letter_sent ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Cover Letter</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 ${application.email_sent ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">Email Sent</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
              <CardDescription>
                Here's what to expect after your applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Email Confirmation</h3>
                  <p className="text-sm text-muted-foreground">
                    You'll receive confirmation emails for each application sent
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Response Timeline</h3>
                  <p className="text-sm text-muted-foreground">
                    Most companies respond within 1-2 weeks of receiving applications
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Track Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor your application status in your dashboard
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <Button onClick={handleViewDashboard} variant="outline" size="lg">
              <TrendingUp className="w-5 h-5 mr-2" />
              Go to Dashboard
            </Button>
            <Button onClick={handleApplyMore} size="lg">
              <ArrowRight className="w-5 h-5 mr-2" />
              Apply to More Jobs
            </Button>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default ApplicationConfirmation; 