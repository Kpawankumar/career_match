import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/layout/Layout";
import { 
  Search, 
  MapPin, 
  Building, 
  Clock, 
  DollarSign, 
  Briefcase,
  ArrowLeft,
  Eye,
  BookmarkIcon,
  Filter,
  Star,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { jobMatcherServiceWithLongTimeout } from "@/api/axios";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Job {
  job_id: number;
  job_title: string;
  job_description: string;
  match_score: float;
  salary: string;
  location: string;
  experience: string;
  date_posted: string;
  work_type: string;
  org_name: string;
  apply_link?: string;
}

interface JobPreferences {
  location: string;
  job_type: string;
  experience_level: string;
  salary_range: string;
  domain: string;
  qualification: string;
}

const JobMatcherService = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("preferences");
  const [preferences, setPreferences] = useState<JobPreferences>({
    location: "",
    job_type: "",
    experience_level: "",
    salary_range: "",
    domain: "",
    qualification: ""
  });
  const [showPreferences, setShowPreferences] = useState(true);

  // Domain options
  const domainOptions = [
    "Software Development",
    "Data Science",
    "Machine Learning",
    "Artificial Intelligence",
    "Web Development",
    "Mobile Development",
    "DevOps",
    "Cloud Computing",
    "Cybersecurity",
    "Database Administration",
    "Network Engineering",
    "UI/UX Design",
    "Product Management",
    "Business Analysis",
    "Digital Marketing",
    "Finance",
    "Healthcare",
    "Education",
    "Sales",
    "Customer Service",
    "Human Resources",
    "Operations",
    "Research",
    "Consulting",
    "Other"
  ];

  // Qualification options
  const qualificationOptions = [
    "B.Tech",
    "M.Tech", 
    "B.E",
    "M.E",
    "B.Sc",
    "M.Sc",
    "B.Com",
    "M.Com",
    "BBA",
    "MBA",
    "BCA",
    "MCA",
    "B.Pharm",
    "M.Pharm",
    "BDS",
    "MBBS",
    "PhD",
    "Diploma",
    "High School",
    "Other"
  ];

  // Check if user has profile
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use this service",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    // Check if user has completed their profile
    const profile = sessionStorage.getItem('userProfile');
    console.log('Profile from sessionStorage:', profile);
    if (!profile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile before using this service.",
        variant: "destructive",
      });
      navigate('/profile');
      return;
    }

    try {
      const parsedProfile = JSON.parse(profile);
      console.log('Parsed profile:', parsedProfile);
      const hasBasicProfile = parsedProfile && (
        parsedProfile.firstName ||
        parsedProfile.lastName ||
        parsedProfile.name ||
        parsedProfile.email ||
        parsedProfile.location ||
        parsedProfile.city ||
        parsedProfile.address
      );
      if (!hasBasicProfile) {
        toast({
          title: "Profile Incomplete",
          description: "Please complete your profile before using this service.",
          variant: "destructive",
        });
        navigate('/profile');
        return;
      }
      console.log('Profile validation passed');
    } catch (error) {
      console.error('Error parsing profile:', error);
      toast({
        title: "Profile Error",
        description: "Please complete your profile before using this service.",
        variant: "destructive",
      });
      navigate('/profile');
      return;
    }
  }, [isAuthenticated, navigate, toast]);

  const handlePreferenceChange = (field: keyof JobPreferences, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const findJobs = async () => {
    if (!preferences.location && !preferences.job_type && !preferences.domain && !preferences.qualification) {
      toast({
        title: "Preferences Required",
        description: "Please fill in at least one preference to find jobs",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      // Get user ID from auth or profile
      const profile = sessionStorage.getItem('userProfile');
      let userId = user?.id;
      
      // If no user ID from auth, try to get from profile or use a fallback
      if (!userId && profile) {
        try {
          const parsedProfile = JSON.parse(profile);
          // Use email as unique identifier if available, otherwise use default
          userId = parsedProfile.email || "default_user";
          console.log('Using email as user ID:', userId);
        } catch (error) {
          console.error('Error parsing profile for user ID:', error);
          userId = "default_user";
        }
      }
      
      // If still no user ID, use a fallback
      if (!userId) {
        userId = "default_user";
        console.log('Using default user ID:', userId);
      }
      
      const requestData = {
        user_id: userId,
        location: preferences.location,
        domain: preferences.domain || "Software Development", // Default to a domain if no domain selected
        qualification: preferences.qualification, // Use selected qualification
        jobType: preferences.job_type ? [preferences.job_type] : [], // Convert to array and use camelCase
        experienceLevel: preferences.experience_level, // Use camelCase
        salaryRange: preferences.salary_range, // Use camelCase
        industry: [], // Add industry field (empty array)
        top_n: 10
      };
      
      console.log('Sending request to JobMatcher:', requestData);
      
      const response = await jobMatcherServiceWithLongTimeout.post('/match-jobs', requestData);

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setJobs(response.data);
        setShowPreferences(false);
        setActiveTab("results"); // Switch to results tab
        toast({
          title: "Jobs Found",
          description: `Found ${response.data.length} matching jobs`,
        });
      } else {
        setJobs([]);
        toast({
          title: "No Jobs Found",
          description: "Try adjusting your preferences",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error finding jobs:', error);
      if (error.code === 'ECONNABORTED') {
        toast({
          title: "Request Timeout",
          description: "Job matching is taking longer than expected. The process may take up to 2 minutes. Please try again.",
          variant: "destructive"
        });
      } else if (error.response?.status === 500) {
        toast({
          title: "Server Error",
          description: "The job matching service encountered an error. Please try again in a few moments.",
          variant: "destructive"
        });
      } else if (error.response?.status === 400) {
        toast({
          title: "Invalid Request",
          description: error.response.data?.detail || "Please check your preferences and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the job matching service. Please check your connection and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const viewJobDetails = (jobId: number) => {
    navigate(`/jobs/${jobId}`);
  };

  const savePreferences = () => {
    localStorage.setItem('jobPreferences', JSON.stringify(preferences));
    toast({
      title: "Preferences Saved",
      description: "Your job preferences have been saved",
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Smart Job Matcher</h1>
                  <p className="text-gray-600">Find the perfect jobs that match your skills and preferences</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Search className="w-3 h-3 mr-1" />
                  AI-Powered Matching
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/services')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Services
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preferences">Job Preferences</TabsTrigger>
              <TabsTrigger value="results">Matched Jobs</TabsTrigger>
            </TabsList>

            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Set Your Job Preferences
                  </CardTitle>
                  <CardDescription>
                    Configure your job search criteria. Location, domain, qualification, and other fields are optional - fill in what you prefer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="e.g., Bangalore, Mumbai, Delhi"
                        value={preferences.location}
                        onChange={(e) => handlePreferenceChange('location', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jobType">Job Type</Label>
                      <Select value={preferences.job_type} onValueChange={(value) => handlePreferenceChange('job_type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full Time</SelectItem>
                          <SelectItem value="part-time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Experience Level</Label>
                      <Select value={preferences.experience_level} onValueChange={(value) => handlePreferenceChange('experience_level', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entry Level</SelectItem>
                          <SelectItem value="mid">Mid Level</SelectItem>
                          <SelectItem value="senior">Senior Level</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary Range</Label>
                      <Select value={preferences.salary_range} onValueChange={(value) => handlePreferenceChange('salary_range', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select salary range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-50k">$0 - $50k</SelectItem>
                          <SelectItem value="50k-80k">$50k - $80k</SelectItem>
                          <SelectItem value="80k-120k">$80k - $120k</SelectItem>
                          <SelectItem value="120k-150k">$120k - $150k</SelectItem>
                          <SelectItem value="150k-200k">$150k - $200k</SelectItem>
                          <SelectItem value="200k+">$200k+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="domain">Domain</Label>
                      <Select value={preferences.domain} onValueChange={(value) => handlePreferenceChange('domain', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select domain" />
                        </SelectTrigger>
                        <SelectContent>
                          {domainOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="qualification">Qualification</Label>
                      <Select value={preferences.qualification} onValueChange={(value) => handlePreferenceChange('qualification', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select qualification" />
                        </SelectTrigger>
                        <SelectContent>
                          {qualificationOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {loading && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Processing job matching...</span>
                        <span>This may take up to 2 minutes</span>
                      </div>
                      <Progress value={undefined} className="w-full" />
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button onClick={findJobs} disabled={loading}>
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Finding Jobs...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Find Matching Jobs
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={savePreferences}>
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {jobs.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Matched Jobs ({jobs.length})</h3>
                    <Button variant="outline" onClick={() => setActiveTab("preferences")}>
                      <Filter className="w-4 h-4 mr-2" />
                      Adjust Preferences
                    </Button>
                  </div>
                  
                  <div className="grid gap-4">
                    {jobs.map((job) => (
                      <Card key={job.job_id} className="hover:shadow-md transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{job.job_title}</h3>
                                {job.match_score && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    <Star className="w-3 h-3 mr-1" />
                                    {job.match_score}% Match
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                  <Building className="w-4 h-4" />
                                  {job.org_name}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {job.location}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {job.work_type}
                                </div>
                                {job.salary && (
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    {job.salary}
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-gray-700 mb-4 line-clamp-2">
                                {job.job_description}
                              </p>
                              
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => viewJobDetails(job.job_id)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </Button>
                                <Button variant="outline" size="sm">
                                  <BookmarkIcon className="w-4 h-4 mr-2" />
                                  Save Job
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your preferences or search criteria
                    </p>
                    <Button onClick={() => setActiveTab("preferences")}>
                      <Filter className="w-4 h-4 mr-2" />
                      Adjust Preferences
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default JobMatcherService; 