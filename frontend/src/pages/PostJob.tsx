import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Layout from "@/components/layout/Layout";
import { 
  Sparkles, 
  Eye, 
  Send,
  Building,
  MapPin,
  DollarSign,
  Clock,
  Users,
  Target,
  Zap,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const PostJob = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [showJobPreview, setShowJobPreview] = useState(false);

  const [jobData, setJobData] = useState({
    title: "",
    department: "",
    location: "",
    workType: "",
    experience: "",
    salary: "",
    description: "",
    requirements: "",
    responsibilities: "",
    benefits: "",
    applicationDeadline: "",
    hiringManager: "",
    isRemote: false,
    isUrgent: false,
    requireApproval: true
  });

  const [aiGeneratedContent, setAiGeneratedContent] = useState({
    description: "",
    requirements: "",
    responsibilities: "",
    benefits: ""
  });

  // State for managing skills
  const [requiredSkills, setRequiredSkills] = useState<string[]>(["JavaScript", "React", "TypeScript"]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>(["Node.js", "AWS"]);
  const [newRequiredSkill, setNewRequiredSkill] = useState("");
  const [newPreferredSkill, setNewPreferredSkill] = useState("");

  // API Configuration
  const HR_API_BASE_URL = "https://hr-management-1071432896229.asia-south2.run.app";

  // Fetch organization data
  const fetchOrganization = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const hrResponse = await fetch(`${HR_API_BASE_URL}/hr-users/profile`, {
        headers
      });
      
      if (hrResponse.ok) {
        const hrData = await hrResponse.json();
        
        if (hrData.hr_org_id) {
          const orgResponse = await fetch(`${HR_API_BASE_URL}/organizations/${hrData.hr_org_id}`, {
            headers
          });
          
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            setOrganization(orgData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  // Load organization on component mount
  useEffect(() => {
    if (token) {
      fetchOrganization();
    }
  }, [token]);

  const handleInputChange = (field: string, value: any) => {
    setJobData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAIGenerate = async () => {
    setIsAIGenerating(true);
    // Mock AI generation - replace with actual API call
    setTimeout(() => {
      setAiGeneratedContent({
        description: "We are seeking a talented and experienced professional to join our dynamic team. This role offers the opportunity to work on cutting-edge projects and collaborate with industry experts.",
        requirements: "• Bachelor's degree in relevant field\n• 3+ years of experience\n• Strong communication skills\n• Proficiency in relevant technologies\n• Problem-solving mindset",
        responsibilities: "• Lead and execute key projects\n• Collaborate with cross-functional teams\n• Mentor junior team members\n• Contribute to strategic planning\n• Maintain high quality standards",
        benefits: "• Competitive salary and benefits\n• Flexible work arrangements\n• Professional development opportunities\n• Health and wellness programs\n• Collaborative work environment"
      });
      setIsAIGenerating(false);
      setShowAIPreview(true);
    }, 2000);
  };

  const handleApplyAIContent = () => {
    setJobData(prev => ({
      ...prev,
      description: aiGeneratedContent.description,
      requirements: aiGeneratedContent.requirements,
      responsibilities: aiGeneratedContent.responsibilities,
      benefits: aiGeneratedContent.benefits
    }));
    setShowAIPreview(false);
  };

  const handlePublish = async () => {
    if (!organization) {
      toast({
        title: "Error",
        description: "Please set up your organization first",
        variant: "destructive",
      });
      return;
    }

    if (!jobData.title || !jobData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const jobPayload = {
        job_title: jobData.title,
        job_desc: jobData.description,
        qualification: jobData.requirements || "Requirements will be determined based on the role.",
        location: jobData.location || "Remote",
        salary_range: jobData.salary || "Competitive salary based on experience",
        job_type: jobData.workType || "Full-time",
        experience_level: jobData.experience || "Entry",
        skills_required: requiredSkills.concat(preferredSkills)
      };

      const response = await fetch(`${HR_API_BASE_URL}/organizations/${organization.org_id}/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(jobPayload)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Job posting created successfully!",
        });
        navigate("/dashboard/hr");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create job posting');
      }
    } catch (error) {
      console.error('Error creating job posting:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create job posting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    setShowJobPreview(true);
  };

  // Handle adding new required skill
  const handleAddRequiredSkill = () => {
    if (newRequiredSkill.trim() && !requiredSkills.includes(newRequiredSkill.trim())) {
      setRequiredSkills([...requiredSkills, newRequiredSkill.trim()]);
      setNewRequiredSkill("");
    }
  };

  // Handle adding new preferred skill
  const handleAddPreferredSkill = () => {
    if (newPreferredSkill.trim() && !preferredSkills.includes(newPreferredSkill.trim())) {
      setPreferredSkills([...preferredSkills, newPreferredSkill.trim()]);
      setNewPreferredSkill("");
    }
  };

  // Handle removing a required skill
  const handleRemoveRequiredSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter(s => s !== skill));
  };

  // Handle removing a preferred skill
  const handleRemovePreferredSkill = (skill: string) => {
    setPreferredSkills(preferredSkills.filter(s => s !== skill));
  };

  return (
    <Layout>
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Post a Job</h1>
            <p className="text-muted-foreground">
              Create a new job posting
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handlePublish} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Publishing..." : "Publish Job"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Main Form */}
          <div className="col-span-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Job Details</TabsTrigger>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Essential job details and requirements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Job Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Senior Frontend Developer"
                        value={jobData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="department">Department *</Label>
                        <Select value={jobData.department} onValueChange={(value) => handleInputChange("department", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="engineering">Engineering</SelectItem>
                            <SelectItem value="design">Design</SelectItem>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="hr">Human Resources</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="location">Location *</Label>
                        <Input
                          id="location"
                          placeholder="e.g., New York, NY or Remote"
                          value={jobData.location}
                          onChange={(e) => handleInputChange("location", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="workType">Work Type *</Label>
                        <Select value={jobData.workType} onValueChange={(value) => handleInputChange("workType", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select work type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="internship">Internship</SelectItem>
                            <SelectItem value="freelance">Freelance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="experience">Experience Level *</Label>
                        <Select value={jobData.experience} onValueChange={(value) => handleInputChange("experience", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                            <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                            <SelectItem value="senior">Senior (6-8 years)</SelectItem>
                            <SelectItem value="lead">Lead (8+ years)</SelectItem>
                            <SelectItem value="executive">Executive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="salary">Salary Range</Label>
                      <Input
                        id="salary"
                        placeholder="e.g., $80,000 - $120,000"
                        value={jobData.salary}
                        onChange={(e) => handleInputChange("salary", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="hiringManager">Hiring Manager</Label>
                      <Input
                        id="hiringManager"
                        placeholder="Name of the hiring manager"
                        value={jobData.hiringManager}
                        onChange={(e) => handleInputChange("hiringManager", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="deadline">Application Deadline</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={jobData.applicationDeadline}
                        onChange={(e) => handleInputChange("applicationDeadline", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="description" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Job Description</CardTitle>
                        <CardDescription>Detailed description of the role and responsibilities</CardDescription>
                      </div>
                      <Button onClick={handleAIGenerate} disabled={isAIGenerating}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {isAIGenerating ? "Generating..." : "AI Generate"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="description">Job Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the role, responsibilities, and what makes this position exciting..."
                        value={jobData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={6}
                      />
                    </div>

                    <div>
                      <Label htmlFor="responsibilities">Key Responsibilities</Label>
                      <Textarea
                        id="responsibilities"
                        placeholder="List the main responsibilities and duties..."
                        value={jobData.responsibilities}
                        onChange={(e) => handleInputChange("responsibilities", e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label htmlFor="benefits">Benefits & Perks</Label>
                      <Textarea
                        id="benefits"
                        placeholder="Describe the benefits, perks, and what makes your company great..."
                        value={jobData.benefits}
                        onChange={(e) => handleInputChange("benefits", e.target.value)}
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requirements" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Requirements & Qualifications</CardTitle>
                    <CardDescription>Skills, experience, and qualifications needed</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="requirements">Requirements *</Label>
                      <Textarea
                        id="requirements"
                        placeholder="List the required skills, experience, and qualifications..."
                        value={jobData.requirements}
                        onChange={(e) => handleInputChange("requirements", e.target.value)}
                        rows={6}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Required Skills</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {requiredSkills.map(skill => (
                            <Badge 
                              key={skill} 
                              variant="secondary" 
                              className="cursor-pointer"
                              onClick={() => handleRemoveRequiredSkill(skill)}
                            >
                              {skill} &times;
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Add new skill"
                            value={newRequiredSkill}
                            onChange={(e) => setNewRequiredSkill(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddRequiredSkill()}
                          />
                          <Button onClick={handleAddRequiredSkill}>Add</Button>
                        </div>
                      </div>

                      <div>
                        <Label>Preferred Skills</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {preferredSkills.map(skill => (
                            <Badge 
                              key={skill} 
                              variant="secondary" 
                              className="cursor-pointer"
                              onClick={() => handleRemovePreferredSkill(skill)}
                            >
                              {skill} &times;
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Add new skill"
                            value={newPreferredSkill}
                            onChange={(e) => setNewPreferredSkill(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddPreferredSkill()}
                          />
                          <Button onClick={handleAddPreferredSkill}>Add</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Job Settings</CardTitle>
                    <CardDescription>Configure job posting preferences and workflow</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Remote Work</Label>
                        <p className="text-sm text-muted-foreground">Allow remote work for this position</p>
                      </div>
                      <Switch
                        checked={jobData.isRemote}
                        onCheckedChange={(checked) => handleInputChange("isRemote", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Urgent Hiring</Label>
                        <p className="text-sm text-muted-foreground">Mark this as an urgent hiring need</p>
                      </div>
                      <Switch
                        checked={jobData.isUrgent}
                        onCheckedChange={(checked) => handleInputChange("isUrgent", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Require Approval</Label>
                        <p className="text-sm text-muted-foreground">Require manager approval before publishing</p>
                      </div>
                      <Switch
                        checked={jobData.requireApproval}
                        onCheckedChange={(checked) => handleInputChange("requireApproval", checked)}
                      />
                    </div>

                    <div>
                      <Label>Application Instructions</Label>
                      <Textarea
                        placeholder="Any specific instructions for applicants..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* AI Content Preview Dialog */}
        <Dialog open={showAIPreview} onOpenChange={setShowAIPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>AI Generated Content</DialogTitle>
              <DialogDescription>
                Review and apply AI-generated content to your job posting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <Label>Job Description</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                  {aiGeneratedContent.description}
                </div>
              </div>
              <div>
                <Label>Requirements</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm whitespace-pre-line">
                  {aiGeneratedContent.requirements}
                </div>
              </div>
              <div>
                <Label>Responsibilities</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm whitespace-pre-line">
                  {aiGeneratedContent.responsibilities}
                </div>
              </div>
              <div>
                <Label>Benefits</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm whitespace-pre-line">
                  {aiGeneratedContent.benefits}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyAIContent} className="flex-1">
                Apply Content
              </Button>
              <Button variant="outline" onClick={() => setShowAIPreview(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Job Preview Dialog */}
        <Dialog open={showJobPreview} onOpenChange={setShowJobPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Job Posting Preview</DialogTitle>
              <DialogDescription>
                This is how your job posting will appear to candidates
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <Label>Job Title</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                  {jobData.title || "Not specified"}
                </div>
              </div>
              <div>
                <Label>Details</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                  {jobData.location && <span>{jobData.location}</span>}
                  {jobData.workType && <span> • {jobData.workType}</span>}
                  {jobData.salary && <span> • {jobData.salary}</span>}
                  {!jobData.location && !jobData.workType && !jobData.salary && "Not specified"}
                </div>
              </div>
              <div>
                <Label>Job Description</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                  {jobData.description || "Not specified"}
                </div>
              </div>
              <div>
                <Label>Requirements</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm whitespace-pre-line">
                  {jobData.requirements || "Not specified"}
                </div>
              </div>
              <div>
                <Label>Responsibilities</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm whitespace-pre-line">
                  {jobData.responsibilities || "Not specified"}
                </div>
              </div>
              <div>
                <Label>Benefits</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm whitespace-pre-line">
                  {jobData.benefits || "Not specified"}
                </div>
              </div>
              <div>
                <Label>Required Skills</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                  {requiredSkills.length > 0 ? requiredSkills.join(", ") : "Not specified"}
                </div>
              </div>
              <div>
                <Label>Preferred Skills</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                  {preferredSkills.length > 0 ? preferredSkills.join(", ") : "Not specified"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowJobPreview(false)} className="flex-1">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </Layout>
  );
};

export default PostJob;