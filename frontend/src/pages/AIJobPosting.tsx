import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Layout from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Sparkles, 
  Send, 
  Wand2,
  MapPin,
  DollarSign,
  Users,
  Building,
  CheckCircle,
  Loader2,
  Copy,
  Edit,
  Eye,
  Save,
  X,
  AlertCircle,
  ArrowLeft,
  Play,
  FileText,
  Briefcase
} from "lucide-react";

// API Configuration
const HR_API_BASE_URL = import.meta.env.VITE_API_URL_HR_MANAGEMENT || "https://hr-management-1071432896229.asia-south2.run.app";
const AI_JOB_API_BASE_URL = import.meta.env.VITE_API_URL_AI_JOB_GENERATOR || "https://job-generator-1071432896229.asia-south2.run.app";

interface GeneratedJob {
  title: string;
  department: string;
  location: string;
  workType: string;
  experience: string;
  salary: string;
  description: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
  skills: string[];
  generation_time_ms: number;
}

interface EditableJob {
  title: string;
  location: string;
  workType: string;
  experience: string;
  salary: string;
  description: string;
  requirements: string;
}

const AIJobPosting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [jobPrompt, setJobPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJob, setGeneratedJob] = useState<GeneratedJob | null>(null);
  const [editableJob, setEditableJob] = useState<EditableJob | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<number | null>(null);
  const [organizationData, setOrganizationData] = useState({
    name: "Loading...",
    industry: "Technology"
  });
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Fetch organization data from database
  const fetchOrganizationData = async () => {
    try {
      setIsLoadingOrg(true);
      setOrgError(null);
      
      console.log("🔍 Fetching organization data...");
      
      // First get HR profile to get organization info
      const hrResponse = await fetch(`${HR_API_BASE_URL}/hr-users/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log("HR Profile Response Status:", hrResponse.status);

      if (hrResponse.ok) {
        const hrData = await hrResponse.json();
        console.log('HR Profile Data:', hrData);
        
        // Get organization details using hr_org_id
        if (hrData.hr_org_id) {
          console.log("Fetching organization details for ID:", hrData.hr_org_id);
          
          const orgResponse = await fetch(`${HR_API_BASE_URL}/organizations/${hrData.hr_org_id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          console.log("Organization Response Status:", orgResponse.status);

          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            console.log('Organization Data:', orgData);
            setOrganizationData({
              name: orgData.name || hrData.hr_orgs || "Our Company",
              industry: orgData.industry || "Technology"
            });
            setCurrentOrgId(orgData.org_id);
          } else {
            console.log("Organization API failed, using fallback");
            // Fallback to hr_orgs if organization API fails
            setOrganizationData({
              name: hrData.hr_orgs || "Our Company",
              industry: "Technology"
            });
            setCurrentOrgId(hrData.hr_org_id);
          }
        } else {
          console.log("No hr_org_id found, using default");
          // No organization linked, use default
          setOrganizationData({
            name: "Our Company",
            industry: "Technology"
          });
          setOrgError("No organization linked to your HR profile. Please contact your administrator.");
        }
      } else {
        console.error('Failed to fetch HR profile:', hrResponse.status);
        setOrganizationData({
          name: "Our Company",
          industry: "Technology"
        });
        setOrgError("Failed to fetch HR profile. Please try again.");
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
      setOrganizationData({
        name: "Our Company",
        industry: "Technology"
      });
      setOrgError("Error connecting to server. Please check your connection.");
    } finally {
      setIsLoadingOrg(false);
    }
  };

  const generateJobWithAI = async () => {
    if (!jobPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a job description",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log("Generating job with AI...");
      console.log("Organization data:", organizationData);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const response = await fetch(`${AI_JOB_API_BASE_URL}/generate-complete-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: jobPrompt,
          organization_name: organizationData.name,
          industry: organizationData.industry
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log("AI Response Status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("AI Generation Result:", result);
        
        const job: GeneratedJob = {
          title: result.seo_optimized_title || result.suggested_department || "Generated Job",
          department: result.suggested_department || "General",
          location: result.suggested_location || "Remote",
          workType: result.suggested_work_type || "Full-time",
          experience: result.suggested_experience_level || "Mid-level",
          salary: result.suggested_salary_range || "$50,000 - $80,000",
          description: result.job_description || "",
          requirements: result.requirements || "",
          responsibilities: result.responsibilities || "",
          benefits: result.benefits || "",
          skills: result.suggested_skills || [],
          generation_time_ms: result.generation_time_ms || 0
        };
        
        setGeneratedJob(job);
        setEditableJob({
          title: job.title,
          location: job.location,
          workType: job.workType,
          experience: job.experience,
          salary: job.salary,
          description: job.description,
          requirements: job.requirements
        });
        
        toast({
          title: "Success",
          description: "Job generated successfully! You can now edit and publish it.",
        });
      } else {
        const errorText = await response.text();
        console.error('AI generation error:', response.status, errorText);
        toast({
          title: "Error",
          description: `Failed to generate job: ${errorText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating job:', error);
      let errorMessage = "Failed to generate job. Please try again.";
      
      if (error.name === 'AbortError') {
        errorMessage = "Request timed out. Please try again with a shorter description.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const publishJob = async () => {
    if (!editableJob || !currentOrgId) {
      toast({
        title: "Error",
        description: "No job data or organization ID available",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      console.log("Publishing job...");
      console.log("Organization ID:", currentOrgId);
      console.log("Job data:", editableJob);
      
      const jobPayload = {
        job_title: editableJob.title,
        job_desc: editableJob.description,
        qualification: editableJob.requirements,
        location: editableJob.location,
        salary_range: editableJob.salary,
        job_type: editableJob.workType,
        experience_level: editableJob.experience,
        skills_required: []
      };

      const response = await fetch(`${HR_API_BASE_URL}/organizations/${currentOrgId}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(jobPayload)
      });

      console.log("Publish Response Status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Publish Result:", result);
        toast({
          title: "Success",
          description: "Job published successfully!",
        });
        navigate("/dashboard/hr");
      } else {
        const errorText = await response.text();
        console.error('Publish job error:', response.status, errorText);
        toast({
          title: "Error",
          description: `Failed to publish job: ${errorText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error publishing job:', error);
      toast({
        title: "Error",
        description: "Failed to publish job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const handleEditJob = () => {
    if (generatedJob) {
      setEditableJob({
        title: generatedJob.title,
        location: generatedJob.location,
        workType: generatedJob.workType,
        experience: generatedJob.experience,
        salary: generatedJob.salary,
        description: generatedJob.description,
        requirements: generatedJob.requirements
      });
      setShowEditDialog(true);
    }
  };

  const handleSaveEdit = () => {
    if (editableJob) {
      setGeneratedJob(prev => prev ? {
        ...prev,
        title: editableJob.title,
        location: editableJob.location,
        workType: editableJob.workType,
        experience: editableJob.experience,
        salary: editableJob.salary,
        description: editableJob.description,
        requirements: editableJob.requirements
      } : null);
      setShowEditDialog(false);
      toast({
        title: "Success",
        description: "Job updated successfully!",
      });
    }
  };

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-6xl">
        {/* Header with Back Button */}
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
          <h1 className="text-3xl font-bold mb-2">AI Job Posting</h1>
          <p className="text-muted-foreground">
            Generate and customize job postings with AI assistance
          </p>
        </div>

        {/* Organization Status Alert */}
        {orgError && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{orgError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Job Generation Section */}
          <div className="lg:col-span-2">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Generate Job with AI
                </CardTitle>
                <CardDescription>
                  {isLoadingOrg ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading organization data...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span>Tell us what kind of position you're hiring for.</span>
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{organizationData.name}</span>
                      </div>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="job-prompt" className="text-sm font-medium">
                    Job Description Prompt
                  </Label>
                  <Textarea
                    id="job-prompt"
                    placeholder="e.g., We need a senior software engineer for our React team in San Francisco with 5+ years experience..."
                    value={jobPrompt}
                    onChange={(e) => setJobPrompt(e.target.value)}
                    className="min-h-[120px] mt-2"
                  />
                </div>
                
                <Button 
                  onClick={generateJobWithAI} 
                  disabled={isGenerating || !jobPrompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Job with AI
                    </>
                  )}
                </Button>

                {/* Quick Examples */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Examples:</Label>
                  <div className="space-y-1">
                    {[
                      "Senior React Developer for fintech startup",
                      "Marketing Manager for e-commerce company",
                      "Data Scientist for healthcare organization"
                    ].map((example, index) => (
                                             <Button
                         key={index}
                         variant="outline"
                         size="sm"
                         className="w-full justify-start text-left p-3 h-[50px]"
                         onClick={() => setJobPrompt(example)}
                       >
                         <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                         <span className="text-sm leading-relaxed">{example}</span>
                       </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Generated Job Preview */}
          <div className="lg:col-span-3">
            {!generatedJob ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Generate</h3>
                  <p className="text-muted-foreground">
                    Enter a job description and click "Generate Job with AI" to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Generated Job Preview
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditJob}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Review and customize the generated job posting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Job Header */}
                  <div className="border-b pb-4">
                    <h3 className="text-xl font-semibold mb-2">{generatedJob.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        <MapPin className="h-3 w-3 mr-1" />
                        {generatedJob.location}
                      </Badge>
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {generatedJob.workType}
                      </Badge>
                      <Badge variant="secondary">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {generatedJob.salary}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Job Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Job Details</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Experience:</span> {generatedJob.experience}</p>
                        <p><span className="font-medium">Department:</span> {generatedJob.department}</p>
                        <p><span className="font-medium">Company:</span> {organizationData.name}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {generatedJob.skills.slice(0, 6).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {generatedJob.skills.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{generatedJob.skills.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Job Description Preview */}
                  <div>
                    <h4 className="font-medium mb-2">Job Description</h4>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {generatedJob.description}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={publishJob}
                      disabled={isPublishing}
                      className="flex-1"
                      size="lg"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Publish Job to {organizationData.name}
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setGeneratedJob(null)}
                      size="lg"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Edit Job Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Job Posting</DialogTitle>
              <DialogDescription>
                Customize the generated job posting before publishing
              </DialogDescription>
            </DialogHeader>
            
            {editableJob && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-title">Job Title</Label>
                    <Input
                      id="edit-title"
                      value={editableJob.title}
                      onChange={(e) => setEditableJob(prev => prev ? {...prev, title: e.target.value} : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={editableJob.location}
                      onChange={(e) => setEditableJob(prev => prev ? {...prev, location: e.target.value} : null)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-work-type">Work Type</Label>
                    <Select 
                      value={editableJob.workType} 
                      onValueChange={(value) => setEditableJob(prev => prev ? {...prev, workType: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Internship">Internship</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-experience">Experience Level</Label>
                    <Select 
                      value={editableJob.experience} 
                      onValueChange={(value) => setEditableJob(prev => prev ? {...prev, experience: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Entry-level">Entry-level</SelectItem>
                        <SelectItem value="Mid-level">Mid-level</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Executive">Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-salary">Salary Range</Label>
                  <Input
                    id="edit-salary"
                    value={editableJob.salary}
                    onChange={(e) => setEditableJob(prev => prev ? {...prev, salary: e.target.value} : null)}
                    placeholder="e.g., $50,000 - $80,000"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Job Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editableJob.description}
                    onChange={(e) => setEditableJob(prev => prev ? {...prev, description: e.target.value} : null)}
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-requirements">Requirements</Label>
                  <Textarea
                    id="edit-requirements"
                    value={editableJob.requirements}
                    onChange={(e) => setEditableJob(prev => prev ? {...prev, requirements: e.target.value} : null)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveEdit} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowEditDialog(false)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Job Preview</DialogTitle>
              <DialogDescription>
                Preview how your job posting will appear
              </DialogDescription>
            </DialogHeader>
            
            {generatedJob && (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{generatedJob.title}</h2>
                    <p className="text-muted-foreground">{generatedJob.location} • {organizationData.name}</p>
                  </div>
                  <Badge variant="secondary">{generatedJob.workType}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Job Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Experience:</strong> {generatedJob.experience}</p>
                      <p><strong>Salary:</strong> {generatedJob.salary}</p>
                      <p><strong>Department:</strong> {generatedJob.department}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Required Skills</h3>
                    <div className="flex flex-wrap gap-1">
                      {generatedJob.skills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Job Description</h3>
                  <p className="text-sm whitespace-pre-wrap">{generatedJob.description}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Requirements</h3>
                  <p className="text-sm whitespace-pre-wrap">{generatedJob.requirements}</p>
                </div>

                {generatedJob.responsibilities && (
                  <div>
                    <h3 className="font-semibold mb-2">Responsibilities</h3>
                    <p className="text-sm whitespace-pre-wrap">{generatedJob.responsibilities}</p>
                  </div>
                )}

                {generatedJob.benefits && (
                  <div>
                    <h3 className="font-semibold mb-2">Benefits</h3>
                    <p className="text-sm whitespace-pre-wrap">{generatedJob.benefits}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AIJobPosting; 