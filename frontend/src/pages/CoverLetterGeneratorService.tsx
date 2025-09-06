import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/layout/Layout";
import { 
  Mail, 
  Download, 
  Eye, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Target,
  Settings,
  Clock,
  FileText,
  User,
  Copy
} from "lucide-react";
import { coverLetterServiceWithLongTimeout } from "@/api/axios";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CoverLetterRequest {
  user_id: string;
  domain: string;
  company_name: string;
  job_id?: number;
  personalized?: boolean;
}

interface CoverLetterResponse {
  cv_id: number;
  applicant_id: string;
  cv_type: string;
  details: string;
  company_name: string;
  job_id?: number;
  personalized: boolean;
  created_at: string;
}

const CoverLetterGeneratorService = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResponse | null>(null);
  const [formData, setFormData] = useState({
    domain: "",
    company_name: ""
  });
  const [showForm, setShowForm] = useState(true);
  const [activeTab, setActiveTab] = useState("generate");

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

    const profile = sessionStorage.getItem('userProfile');
    console.log('Profile from sessionStorage:', profile);
    
    if (!profile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first to use this service",
        variant: "destructive"
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
          description: "Please complete your profile with basic information",
          variant: "destructive"
        });
        navigate('/profile');
        return;
      }
      
      console.log('Profile validation passed');
    } catch (error) {
      console.error('Error parsing profile:', error);
      toast({
        title: "Profile Required",
        description: "Please complete your profile first to use this service",
        variant: "destructive"
      });
      navigate('/profile');
      return;
    }
  }, [isAuthenticated, navigate, toast]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateCoverLetter = async () => {
    if (!formData.domain.trim() || !formData.company_name.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in domain and company name",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const profile = sessionStorage.getItem('userProfile');
      let userProfile = null;
      
      if (profile) {
        try {
          userProfile = JSON.parse(profile);
        } catch (error) {
          console.error('Error parsing profile:', error);
        }
      }

      if (!userProfile) {
        userProfile = {
          name: user?.name || "Applicant",
          email: user?.email || "",
          phone: "",
          location: "",
          education: "",
          experience: "",
          skills: "",
          achievements: "",
          links: ""
        };
      }

      console.log('User ID being sent to backend:', user?.id);
      console.log('User object:', user);
      
      const request: CoverLetterRequest = {
        user_id: user?.id || "",
        domain: formData.domain,
        company_name: formData.company_name,
        personalized: true
      };

      const response = await coverLetterServiceWithLongTimeout.post('/generate-cover-letter', request);

      if (response.data) {
        setCoverLetter(response.data);
        setShowForm(false);
        setActiveTab("result");
        toast({
          title: "Cover Letter Generated",
          description: "Your personalized cover letter has been created",
        });
      }
    } catch (error: any) {
      console.error('Error generating cover letter:', error);
      if (error.code === 'ECONNABORTED') {
        toast({
          title: "Request Timeout",
          description: "Cover letter generation is taking longer than expected. The process may take up to 2 minutes. Please try again.",
          variant: "destructive"
        });
      } else if (error.response?.status === 500) {
        toast({
          title: "Profile Not Found",
          description: "Please upload a resume first to create your profile. This will allow us to generate personalized cover letters.",
          variant: "destructive"
        });
        setTimeout(() => {
          navigate('/resume-upload');
        }, 2000);
      } else if (error.response?.status === 400) {
        toast({
          title: "Invalid Request",
          description: error.response.data?.detail || "Please check your input and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the cover letter generation service. Please check your connection and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadCoverLetter = async () => {
    if (!coverLetter) return;

    try {
      const blob = new Blob([coverLetter.details], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover_letter_${coverLetter.cv_type?.replace(/\s+/g, '_') || 'position'}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Cover letter is being downloaded",
      });
    } catch (error) {
      console.error('Error downloading cover letter:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download cover letter",
        variant: "destructive"
      });
    }
  };

  const copyCoverLetter = async () => {
    if (!coverLetter) return;

    try {
      await navigator.clipboard.writeText(coverLetter.details);
      toast({
        title: "Copied to Clipboard",
        description: "Cover letter content has been copied to your clipboard",
      });
    } catch (error) {
      console.error('Error copying cover letter:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy cover letter to clipboard",
        variant: "destructive"
      });
    }
  };

  const startNewGeneration = () => {
    setCoverLetter(null);
    setFormData({
      domain: "",
      company_name: ""
    });
    setShowForm(true);
    setActiveTab("generate");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Cover Letter Generator</h1>
                  <p className="text-gray-600">Generate personalized cover letters for your job applications</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI-Powered Generation
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

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Cover Letter</TabsTrigger>
              <TabsTrigger value="result">Generated Cover Letter</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Cover Letter Details
                  </CardTitle>
                  <CardDescription>
                    Provide job details to generate a personalized cover letter
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="domain">Job Domain *</Label>
                      <Input
                        id="domain"
                        placeholder="e.g., Software Engineering, Data Science, Marketing"
                        value={formData.domain}
                        onChange={(e) => handleInputChange('domain', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        placeholder="e.g., Google, Microsoft, Amazon"
                        value={formData.company_name}
                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900">What will be generated?</h4>
                        <ul className="text-sm text-blue-800 mt-2 space-y-1">
                          <li>• Professional opening and introduction</li>
                          <li>• Relevant experience and skills</li>
                          <li>• Skills alignment with job requirements</li>
                          <li>• Enthusiasm for the role and company</li>
                          <li>• Professional closing and call to action</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {loading && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Processing cover letter generation...</span>
                        <span>This may take up to 2 minutes</span>
                      </div>
                      <Progress value={undefined} className="w-full" />
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button onClick={generateCoverLetter} disabled={loading}>
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating Cover Letter...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Cover Letter
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
              {coverLetter ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Cover Letter Generated
                    </CardTitle>
                    <CardDescription>
                      Personalized cover letter for {coverLetter.cv_type || 'the position'} at {coverLetter.company_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Job Domain</Label>
                        <p className="text-sm text-gray-600">{coverLetter.cv_type || 'Not specified'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Company</Label>
                        <p className="text-sm text-gray-600">{coverLetter.company_name}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Generated</Label>
                        <p className="text-sm text-gray-600">
                          {new Date(coverLetter.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>ID</Label>
                        <p className="text-sm text-gray-600">{coverLetter.cv_id}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cover Letter Content</Label>
                      <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                          {coverLetter.details}
                        </pre>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button onClick={downloadCoverLetter}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Cover Letter
                      </Button>
                      <Button variant="outline" onClick={copyCoverLetter}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Clipboard
                      </Button>
                      <Button variant="outline" onClick={startNewGeneration}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate New
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Cover Letter Generated</h3>
                    <p className="text-gray-600 mb-4">
                      Start by providing job details to generate a personalized cover letter
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Cover Letter
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

export default CoverLetterGeneratorService;