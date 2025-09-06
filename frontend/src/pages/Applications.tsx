import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Building, 
  MapPin, 
  Calendar,
  ArrowLeft,
  RefreshCw,
  FileText,
  Star,
  TrendingUp,
  Users,
  Briefcase
} from "lucide-react";

// API Configuration
const HR_API_BASE_URL = "http://localhost:8008";

interface Application {
  id: number;
  job_id: number;
  applicant_id: string;
  status: string;
  enhanced_resume_url?: string;
  cover_letter_id?: number;
  sent_at: string;
  updated_at: string;
  job_title?: string;
  company_name?: string;
  location?: string;
  applicant_name?: string;
  applicant_email?: string;
}

interface ApplicationStats {
  total: number;
  applied: number;
  reviewed: number;
  interviewed: number;
  hired: number;
  rejected: number;
}

const Applications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    applied: 0,
    reviewed: 0,
    interviewed: 0,
    hired: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showApplicationDetail, setShowApplicationDetail] = useState(false);

  // Fetch applications from backend
  const fetchApplications = async () => {
    try {
      setLoading(true);
      console.log("🔍 Fetching applications...");
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (localStorage.getItem('token')) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
      }

      // First get organization ID
      const orgResponse = await fetch(`${HR_API_BASE_URL}/hr-users/profile`, {
        headers
      });

      if (orgResponse.ok) {
        const hrData = await orgResponse.json();
        const orgId = hrData.hr_org_id;
        
        if (orgId) {
          // Fetch applications for the organization
          const response = await fetch(`${HR_API_BASE_URL}/organizations/${orgId}/applications`, {
            headers
          });

          if (response.ok) {
            const applicationsData = await response.json();
            console.log("Applications data:", applicationsData);
            setApplications(applicationsData);
            setFilteredApplications(applicationsData);
            calculateStats(applicationsData);
          } else {
            console.error('Failed to fetch applications:', response.status);
            // For development, create mock data
            const mockApplications = createMockApplications();
            setApplications(mockApplications);
            setFilteredApplications(mockApplications);
            calculateStats(mockApplications);
          }
        } else {
          console.error('No organization ID found');
          const mockApplications = createMockApplications();
          setApplications(mockApplications);
          setFilteredApplications(mockApplications);
          calculateStats(mockApplications);
        }
      } else {
        console.error('Failed to fetch HR profile');
        const mockApplications = createMockApplications();
        setApplications(mockApplications);
        setFilteredApplications(mockApplications);
        calculateStats(mockApplications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      const mockApplications = createMockApplications();
      setApplications(mockApplications);
      setFilteredApplications(mockApplications);
      calculateStats(mockApplications);
    } finally {
      setLoading(false);
    }
  };

  const createMockApplications = (): Application[] => {
    return [
      {
        id: 1,
        job_id: 1,
        applicant_id: "user_001",
        status: "applied",
        sent_at: "2024-01-15T10:30:00Z",
        updated_at: "2024-01-15T10:30:00Z",
        job_title: "Senior Frontend Developer",
        company_name: "Tech Corp",
        location: "Remote",
        applicant_name: "John Doe",
        applicant_email: "john.doe@email.com"
      },
      {
        id: 2,
        job_id: 1,
        applicant_id: "user_002",
        status: "reviewed",
        sent_at: "2024-01-14T14:20:00Z",
        updated_at: "2024-01-16T09:15:00Z",
        job_title: "Senior Frontend Developer",
        company_name: "Tech Corp",
        location: "Remote",
        applicant_name: "Jane Smith",
        applicant_email: "jane.smith@email.com"
      },
      {
        id: 3,
        job_id: 2,
        applicant_id: "user_003",
        status: "interviewed",
        sent_at: "2024-01-13T11:45:00Z",
        updated_at: "2024-01-17T16:30:00Z",
        job_title: "UX/UI Designer",
        company_name: "Design Studio",
        location: "New York, NY",
        applicant_name: "Mike Johnson",
        applicant_email: "mike.johnson@email.com"
      },
      {
        id: 4,
        job_id: 2,
        applicant_id: "user_004",
        status: "hired",
        sent_at: "2024-01-12T09:00:00Z",
        updated_at: "2024-01-18T14:00:00Z",
        job_title: "UX/UI Designer",
        company_name: "Design Studio",
        location: "New York, NY",
        applicant_name: "Sarah Wilson",
        applicant_email: "sarah.wilson@email.com"
      },
      {
        id: 5,
        job_id: 3,
        applicant_id: "user_005",
        status: "rejected",
        sent_at: "2024-01-11T16:20:00Z",
        updated_at: "2024-01-19T10:45:00Z",
        job_title: "Full Stack Engineer",
        company_name: "Startup Inc",
        location: "San Francisco, CA",
        applicant_name: "Alex Brown",
        applicant_email: "alex.brown@email.com"
      }
    ];
  };

  const calculateStats = (apps: Application[]) => {
    const stats: ApplicationStats = {
      total: apps.length,
      applied: apps.filter(app => app.status === 'applied').length,
      reviewed: apps.filter(app => app.status === 'reviewed').length,
      interviewed: apps.filter(app => app.status === 'interviewed').length,
      hired: apps.filter(app => app.status === 'hired').length,
      rejected: apps.filter(app => app.status === 'rejected').length
    };
    setStats(stats);
  };

  const filterApplications = () => {
    let filtered = applications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.applicant_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      case 'interviewed': return 'bg-purple-100 text-purple-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <Clock className="h-4 w-4" />;
      case 'reviewed': return <Eye className="h-4 w-4" />;
      case 'interviewed': return <Users className="h-4 w-4" />;
      case 'hired': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const updateApplicationStatus = async (applicationId: number, newStatus: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (localStorage.getItem('token')) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
      }

      const response = await fetch(`${HR_API_BASE_URL}/applications/${applicationId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast({
          title: "Status Updated",
          description: `Application status updated to ${newStatus}`,
        });
        fetchApplications(); // Refresh the list
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [searchTerm, statusFilter, applications]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/dashboard/hr")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Applications</h1>
          <p className="text-muted-foreground">
            Manage and track all candidate applications for your job postings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Applied</p>
                  <p className="text-2xl font-bold">{stats.applied}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reviewed</p>
                  <p className="text-2xl font-bold">{stats.reviewed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interviewed</p>
                  <p className="text-2xl font-bold">{stats.interviewed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hired</p>
                  <p className="text-2xl font-bold">{stats.hired}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by candidate name, job title, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="interviewed">Interviewed</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchApplications} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading applications...</p>
              </div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Applications Found</h3>
                <p className="text-muted-foreground">
                  {applications.length === 0 
                    ? "Applications will appear here once candidates start applying to your job postings."
                    : "No applications match your current filters."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((application) => (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold text-lg">{application.applicant_name}</h3>
                        </div>
                        <Badge className={`${getStatusColor(application.status)}`}>
                          {getStatusIcon(application.status)}
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{application.job_title}</p>
                            <p className="text-sm text-muted-foreground">{application.company_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{application.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Applied {formatDate(application.sent_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{application.applicant_email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application);
                          setShowApplicationDetail(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {application.status === 'applied' && (
                        <Select
                          value={application.status}
                          onValueChange={(value) => updateApplicationStatus(application.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reviewed">Review</SelectItem>
                            <SelectItem value="interviewed">Interview</SelectItem>
                            <SelectItem value="hired">Hire</SelectItem>
                            <SelectItem value="rejected">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Application Detail Dialog */}
        <Dialog open={showApplicationDetail} onOpenChange={setShowApplicationDetail}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Detailed information about this application
              </DialogDescription>
            </DialogHeader>
            
            {selectedApplication && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Candidate Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedApplication.applicant_name}</p>
                      <p><span className="font-medium">Email:</span> {selectedApplication.applicant_email}</p>
                      <p><span className="font-medium">ID:</span> {selectedApplication.applicant_id}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Job Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Position:</span> {selectedApplication.job_title}</p>
                      <p><span className="font-medium">Company:</span> {selectedApplication.company_name}</p>
                      <p><span className="font-medium">Location:</span> {selectedApplication.location}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Application Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Applied:</span> {formatDate(selectedApplication.sent_at)}</p>
                    <p><span className="font-medium">Last Updated:</span> {formatDate(selectedApplication.updated_at)}</p>
                    <p><span className="font-medium">Status:</span> 
                      <Badge className={`ml-2 ${getStatusColor(selectedApplication.status)}`}>
                        {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                      </Badge>
                    </p>
                  </div>
                </div>

                {selectedApplication.enhanced_resume_url && (
                  <div>
                    <h4 className="font-medium mb-2">Documents</h4>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download Resume
                      </Button>
                      {selectedApplication.cover_letter_id && (
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View Cover Letter
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'interviewed')}
                    className="flex-1"
                  >
                    Schedule Interview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'rejected')}
                    className="flex-1"
                  >
                    Reject Application
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Applications; 