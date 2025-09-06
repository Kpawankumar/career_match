import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  ArrowRight,
  Upload,
  FileText,
  User,
  Briefcase,
  CheckCircle
} from "lucide-react";

const JobApplication = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form state
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    
    // Professional Information
    currentTitle: "",
    currentCompany: "",
    experience: "",
    education: "",
    skills: "",
    expectedSalary: "",
    availability: "",
    
    // Application Details
    coverLetter: "",
    whyInterested: "",
    relocate: false,
    remote: false,
    
    // Files
    resume: null,
    portfolio_file: null
  });

  const jobData = {
    title: "Senior Frontend Developer",
    company: "Tech Corp",
    location: "Remote"
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // In a real app, this would submit the application
    toast({
      title: "Application Submitted!",
      description: "Your application has been successfully submitted. We'll be in touch soon.",
    });
    
    setTimeout(() => {
      navigate("/dashboard/applicant");
    }, 2000);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Current Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="New York, NY"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  <Input
                    id="linkedin"
                    value={formData.linkedin}
                    onChange={(e) => handleInputChange("linkedin", e.target.value)}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="portfolio">Portfolio/Website</Label>
                <Input
                  id="portfolio"
                  value={formData.portfolio}
                  onChange={(e) => handleInputChange("portfolio", e.target.value)}
                  placeholder="https://johndoe.dev"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Professional Background</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentTitle">Current Job Title</Label>
                    <Input
                      id="currentTitle"
                      value={formData.currentTitle}
                      onChange={(e) => handleInputChange("currentTitle", e.target.value)}
                      placeholder="Frontend Developer"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentCompany">Current Company</Label>
                    <Input
                      id="currentCompany"
                      value={formData.currentCompany}
                      onChange={(e) => handleInputChange("currentCompany", e.target.value)}
                      placeholder="Current Corp"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experience">Years of Experience *</Label>
                    <Select value={formData.experience} onValueChange={(value) => handleInputChange("experience", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-1">0-1 years</SelectItem>
                        <SelectItem value="2-3">2-3 years</SelectItem>
                        <SelectItem value="4-5">4-5 years</SelectItem>
                        <SelectItem value="6-8">6-8 years</SelectItem>
                        <SelectItem value="9+">9+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="education">Highest Education Level</Label>
                    <Select value={formData.education} onValueChange={(value) => handleInputChange("education", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high-school">High School</SelectItem>
                        <SelectItem value="associate">Associate Degree</SelectItem>
                        <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                        <SelectItem value="master">Master's Degree</SelectItem>
                        <SelectItem value="phd">PhD</SelectItem>
                        <SelectItem value="bootcamp">Coding Bootcamp</SelectItem>
                        <SelectItem value="self-taught">Self-taught</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="skills">Key Skills (comma-separated) *</Label>
                  <Textarea
                    id="skills"
                    value={formData.skills}
                    onChange={(e) => handleInputChange("skills", e.target.value)}
                    placeholder="React, TypeScript, JavaScript, CSS, HTML, Git..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expectedSalary">Expected Salary Range</Label>
                    <Select value={formData.expectedSalary} onValueChange={(value) => handleInputChange("expectedSalary", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select salary range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50k-70k">$50k - $70k</SelectItem>
                        <SelectItem value="70k-90k">$70k - $90k</SelectItem>
                        <SelectItem value="90k-120k">$90k - $120k</SelectItem>
                        <SelectItem value="120k-150k">$120k - $150k</SelectItem>
                        <SelectItem value="150k+">$150k+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="availability">Availability to Start</Label>
                    <Select value={formData.availability} onValueChange={(value) => handleInputChange("availability", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediately">Immediately</SelectItem>
                        <SelectItem value="2-weeks">2 weeks notice</SelectItem>
                        <SelectItem value="1-month">1 month</SelectItem>
                        <SelectItem value="2-months">2 months</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Application Details</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="coverLetter">Cover Letter *</Label>
                  <Textarea
                    id="coverLetter"
                    value={formData.coverLetter}
                    onChange={(e) => handleInputChange("coverLetter", e.target.value)}
                    placeholder="Tell us about yourself and why you're interested in this position..."
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.coverLetter.length}/500 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="whyInterested">Why are you interested in working at {jobData.company}? *</Label>
                  <Textarea
                    id="whyInterested"
                    value={formData.whyInterested}
                    onChange={(e) => handleInputChange("whyInterested", e.target.value)}
                    placeholder="What attracts you to this company and role?"
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">Work Preferences</Label>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="relocate"
                      checked={formData.relocate}
                      onCheckedChange={(checked) => handleInputChange("relocate", checked)}
                    />
                    <Label htmlFor="relocate" className="text-sm font-normal">
                      I am willing to relocate for this position
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remote"
                      checked={formData.remote}
                      onCheckedChange={(checked) => handleInputChange("remote", checked)}
                    />
                    <Label htmlFor="remote" className="text-sm font-normal">
                      I am interested in remote work opportunities
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="resume">Resume/CV *</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Button variant="outline" size="sm">
                        Choose File
                      </Button>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Upload your resume (PDF, DOC, DOCX - Max 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="portfolio_file">Portfolio (Optional)</Label>
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Button variant="outline" size="sm">
                        Choose File
                      </Button>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Upload portfolio samples (PDF, ZIP - Max 10MB)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-800">Application Summary</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p><strong>Position:</strong> {jobData.title}</p>
                        <p><strong>Company:</strong> {jobData.company}</p>
                        <p><strong>Applicant:</strong> {formData.firstName} {formData.lastName}</p>
                        <p><strong>Email:</strong> {formData.email}</p>
                        <p><strong>Experience:</strong> {formData.experience}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return User;
      case 2: return Briefcase;
      case 3: return FileText;
      case 4: return Upload;
      default: return User;
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link to={`/jobs/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job Details
            </Button>
          </Link>
        </div>

        {/* Job Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback>{jobData.company.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold">Apply for {jobData.title}</h1>
                <p className="text-muted-foreground">{jobData.company} • {jobData.location}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Application Progress</span>
              <span className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</span>
            </div>
            <Progress value={progressPercentage} className="mb-4" />
            
            <div className="flex justify-between">
              {[1, 2, 3, 4].map((step) => {
                const StepIcon = getStepIcon(step);
                return (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <span className="text-xs mt-1 text-center">
                      {step === 1 && "Personal"}
                      {step === 2 && "Professional"}
                      {step === 3 && "Application"}
                      {step === 4 && "Documents"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Form Content */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} size="lg">
              Submit Application
            </Button>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default JobApplication;