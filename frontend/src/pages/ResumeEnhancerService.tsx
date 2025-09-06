import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/layout/Layout";
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Target,
  Settings,
  Clock
} from "lucide-react";
import { resumeEnhancerServiceWithLongTimeout } from "@/api/axios";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ResumeEnhancementRequest {
  user_id: string;
  job_preference: string;
  job_id?: number;
  keywords: string[];
}

interface ResumeEnhancementResponse {
  id: number;
  user_id: string;
  original_resume_url: string;
  enhanced_resume_url: string;
  gcs_url?: string;
  job_id?: number;
  improvements: string[];
  keywords: string[];
  created_at: string;
}

const ResumeEnhancerService = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("enhance");
  const [enhancedResume, setEnhancedResume] = useState<ResumeEnhancementResponse | null>(null);
  const [jobPreference, setJobPreference] = useState("");
  const [showForm, setShowForm] = useState(true);

  // Job role options
  const jobRoleOptions = [
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Scientist",
    "Data Analyst",
    "Machine Learning Engineer",
    "DevOps Engineer",
    "Product Manager",
    "Project Manager",
    "UI/UX Designer",
    "Business Analyst",
    "Quality Assurance Engineer",
    "System Administrator",
    "Network Engineer",
    "Cybersecurity Analyst",
    "Cloud Engineer",
    "Mobile Developer",
    "Game Developer",
    "Technical Writer",
    "Sales Engineer",
    "Marketing Manager",
    "Human Resources Manager",
    "Financial Analyst",
    "Consultant",
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

  const enhanceResume = async () => {
    if (!jobPreference.trim()) {
      toast({
        title: "Job Role Required",
        description: "Please select a job role to enhance your resume",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Debug: Log the user object to see what we have
      console.log('User object:', user);
      console.log('User ID from user object:', user?.id);
      
      // Use Firebase UID as user ID - this is what the database expects
      let userId = user?.id;
      
      if (!userId) {
        console.error('No Firebase UID available. User may not be properly authenticated.');
        toast({
          title: "Authentication Error",
          description: "Please log in again to use this service.",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Using Firebase UID as user ID:', userId);

      const request: ResumeEnhancementRequest = {
        user_id: userId,
        job_preference: jobPreference,
        keywords: [] // Keywords are removed from the form
      };

      console.log('Sending request to ResumeEnhancer:', request);

      const response = await resumeEnhancerServiceWithLongTimeout.post('/enhance-resume', request);

      if (response.data) {
        setEnhancedResume(response.data);
        setShowForm(false);
        setActiveTab("result"); // Switch to result tab
        toast({
          title: "Resume Enhanced Successfully",
          description: "Your resume has been optimized for the job preference",
        });
      }
    } catch (error: any) {
      console.error('Error enhancing resume:', error);
      if (error.code === 'ECONNABORTED') {
        toast({
          title: "Request Timeout",
          description: "Resume enhancement is taking longer than expected. The process may take up to 2 minutes. Please try again.",
          variant: "destructive"
        });
      } else if (error.response?.status === 500) {
        toast({
          title: "Server Error",
          description: "The resume enhancement service encountered an error. Please try again in a few moments.",
          variant: "destructive"
        });
      } else if (error.response?.status === 400) {
        toast({
          title: "Invalid Request",
          description: error.response.data?.detail || "Please check your input and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the resume enhancement service. Please check your connection and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadEnhancedResume = async () => {
    if (!enhancedResume) return;

    try {
      const response = await resumeEnhancerServiceWithLongTimeout.get(enhancedResume.enhanced_resume_url, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enhanced_resume_${enhancedResume.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Enhanced resume is being downloaded",
      });
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download enhanced resume",
        variant: "destructive"
      });
    }
  };

  const viewEnhancedResume = () => {
    if (!enhancedResume) return;
    window.open(enhancedResume.enhanced_resume_url, '_blank');
  };

  const startNewEnhancement = () => {
    setEnhancedResume(null);
    setJobPreference("");
    setShowForm(true);
    setActiveTab("enhance"); // Switch back to enhance tab
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
                  <h1 className="text-2xl font-bold text-gray-900">Resume Enhancer</h1>
                  <p className="text-gray-600">AI-powered resume optimization tailored to specific job requirements</p>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI-Powered Enhancement
                </Badge>
              </div>
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

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="enhance">Enhance Resume</TabsTrigger>
              <TabsTrigger value="result">Enhanced Resume</TabsTrigger>
            </TabsList>

            <TabsContent value="enhance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Resume Enhancement Settings
                  </CardTitle>
                  <CardDescription>
                    Select your target job role to optimize your resume for better matching
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="job_preference">Job Preference/Role</Label>
                    <Select onValueChange={setJobPreference} defaultValue={jobPreference}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a job role" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobRoleOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      Select the job role you're targeting
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900">What will be enhanced?</h4>
                        <ul className="text-sm text-blue-800 mt-2 space-y-1">
                          <li>• Professional summary optimization</li>
                          <li>• Skills alignment with job requirements</li>
                          <li>• Experience descriptions improvement</li>
                          <li>• ATS-friendly formatting</li>
                          <li>• Keyword optimization</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {loading && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Processing resume enhancement...</span>
                        <span>This may take up to 2 minutes</span>
                      </div>
                      <Progress value={undefined} className="w-full" />
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <Button onClick={enhanceResume} disabled={loading}>
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Enhancing Resume...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Enhance Resume
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/profile')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Update Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="result" className="space-y-6">
              {enhancedResume ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Resume Enhanced Successfully
                    </CardTitle>
                    <CardDescription>
                      Your resume has been optimized for "{jobPreference}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Enhancement ID</Label>
                        <p className="text-sm text-gray-600">{enhancedResume.id}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Created</Label>
                        <p className="text-sm text-gray-600">
                          {new Date(enhancedResume.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {enhancedResume.improvements && enhancedResume.improvements.length > 0 && (
                      <div className="space-y-2">
                        <Label>Improvements Made</Label>
                        <div className="space-y-1">
                          {enhancedResume.improvements.map((improvement, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {improvement}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button onClick={downloadEnhancedResume}>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button variant="outline" onClick={viewEnhancedResume}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Online
                      </Button>
                      <Button variant="outline" onClick={startNewEnhancement}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        New Enhancement
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Enhanced Resume</h3>
                    <p className="text-gray-600 mb-4">
                      Start by enhancing your resume with job preferences
                    </p>
                    <Button onClick={() => setActiveTab("enhance")}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Enhance Resume
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

export default ResumeEnhancerService; 