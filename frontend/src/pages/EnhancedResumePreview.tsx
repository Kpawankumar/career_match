import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  FileText, 
  Mail, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Download,
  Eye,
  Send,
  Sparkles,
  Building,
  MapPin,
  DollarSign,
  Clock,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import { resumeEnhancerService, coverLetterService, emailAutomationService } from "@/api/axios";

interface Job {
  job_id: string;
  job_title: string;
  org_name: string;
  location: string;
  salary: string;
  work_type: string;
  job_description: string;
  experience: string;
  match_score: number;
  apply_link: string;
}

interface EnhancedResume {
  id: number; // <-- add this
  originalUrl: string;
  enhancedUrl: string;
  improvements: string[];
  keywords: string[];
}

interface CoverLetter {
  content: string;
  jobTitle: string;
  companyName: string;
  personalized: boolean;
}

const EnhancedResumePreview = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [enhancedResumes, setEnhancedResumes] = useState<EnhancedResume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [approvedJobs, setApprovedJobs] = useState<string[]>([]);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Load job data from localStorage (stored by JobPreferences)
    const storedJobsData = localStorage.getItem('selectedJobsData');
    const storedPreferences = localStorage.getItem('jobPreferences');
    
    if (storedJobsData && storedPreferences) {
      try {
        const jobsData: Job[] = JSON.parse(storedJobsData);
        const preferences = JSON.parse(storedPreferences);
        
        setSelectedJobs(jobsData);
        
        // Process resume enhancement and cover letter generation
        processEnhancements(jobsData, preferences);
      } catch (error) {
        console.error('Error parsing stored job data:', error);
        toast({
          title: "Error loading job data",
          description: "Please go back and select jobs again.",
          variant: "destructive"
        });
        navigate('/job-preferences');
      }
    } else {
      toast({
        title: "No job data found",
        description: "Please go back and select jobs again.",
        variant: "destructive"
      });
      navigate('/job-preferences');
    }
  }, [isAuthenticated, navigate, toast]);

  // Health check function
  const checkServiceHealth = async (service: any, serviceName: string) => {
    try {
      await service.get('/', { timeout: 5000 });
      return true;
    } catch (error) {
      console.warn(`${serviceName} service is not available:`, error);
      return false;
    }
  };

  const processEnhancements = async (jobs: Job[], preferences: any) => {
    setIsProcessing(true);
    try {
      // Check service health
      const resumeEnhancerHealthy = await checkServiceHealth(resumeEnhancerService, 'Resume Enhancer');
      const coverLetterHealthy = await checkServiceHealth(coverLetterService, 'Cover Letter Generator');
      
      if (!resumeEnhancerHealthy || !coverLetterHealthy) {
        toast({
          title: "Service Warning",
          description: "Some services are temporarily unavailable. Using fallback data.",
          variant: "default"
        });
      }
      
      const enhancedResumesData: EnhancedResume[] = [];
      const coverLettersData: CoverLetter[] = [];
      
      for (const job of jobs) {
        console.log(`Processing job: ${job.job_title} at ${job.org_name}`);
        
                // 1. Enhance Resume
        if (resumeEnhancerHealthy) {
          try {
            const resumeResponse = await resumeEnhancerService.post('/enhance-resume', {
              user_id: user?.id,
              job_preference: job.job_title,
              job_id: parseInt(job.job_id),
              keywords: job.experience ? job.experience.split(',').map(k => k.trim()) : []
            }, {
              timeout: 30000 // 30 second timeout
            });
            
            const responseData = resumeResponse.data as any;
            const enhancedResume: EnhancedResume = {
              id: responseData.id, // <-- capture the enhanced_id
              originalUrl: responseData.original_resume_url || '',
              enhancedUrl: responseData.enhanced_resume_url || '',
              improvements: responseData.improvements?.suggestions || responseData.improvements || [],
              keywords: responseData.keywords || []
            };
            enhancedResumesData.push(enhancedResume);
            
            console.log(`Resume enhanced for ${job.job_title}`);
          } catch (error: any) {
            console.error(`Error enhancing resume for ${job.job_title}:`, error);
            
            // Provide more specific error messages
            let errorMessage = 'Error enhancing resume';
            if (error.response?.status === 500) {
              errorMessage = 'Server error - please check if the resume enhancement service is running';
            } else if (error.code === 'ECONNABORTED') {
              errorMessage = 'Request timeout - the service is taking too long to respond';
            } else if (error.response?.status === 404) {
              errorMessage = 'User profile not found - please complete your profile first';
            }
            
            // Add fallback data to maintain array structure
            enhancedResumesData.push({
              id: -1, // Indicate no valid ID from backend
              originalUrl: '',
              enhancedUrl: '',
              improvements: [
                'Resume enhancement service is temporarily unavailable.',
                'Your resume will be processed once the service is back online.',
                'You can still proceed with your application using your original resume.'
              ],
              keywords: job.experience ? job.experience.split(',').map(k => k.trim()) : []
            });
          }
        } else {
          // Service not available, use fallback data
          enhancedResumesData.push({
            id: -1, // Indicate no valid ID from backend
            originalUrl: '',
            enhancedUrl: '',
            improvements: [
              'Resume enhancement service is temporarily unavailable.',
              'Your resume will be processed once the service is back online.',
              'You can still proceed with your application using your original resume.'
            ],
            keywords: job.experience ? job.experience.split(',').map(k => k.trim()) : []
          });
        }
        
        // 2. Generate Cover Letter
        if (coverLetterHealthy) {
          try {
            const coverLetterResponse = await coverLetterService.post('/generate-cover-letter', {
              user_id: user?.id,
              domain: job.job_title,
              company_name: job.org_name,
              job_id: parseInt(job.job_id),
              personalized: true
            }, {
              timeout: 30000 // 30 second timeout
            });
          
          const responseData = coverLetterResponse.data as any;
          const coverLetter: CoverLetter = {
            content: responseData.details || responseData.cover_letter || 'Cover letter generated successfully',
            jobTitle: job.job_title,
            companyName: job.org_name,
            personalized: true
          };
          coverLettersData.push(coverLetter);
          
          console.log(`Cover letter generated for ${job.job_title}`);
        } catch (error: any) {
          console.error(`Error generating cover letter for ${job.job_title}:`, error);
          
          // Provide more specific error messages
          let errorMessage = 'Error generating cover letter';
          if (error.response?.status === 500) {
            errorMessage = 'Server error - please check if the cover letter service is running';
          } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout - the service is taking too long to respond';
          } else if (error.response?.status === 404) {
            errorMessage = 'User profile not found - please complete your profile first';
          }
          
          // Add fallback data to maintain array structure
          coverLettersData.push({
            content: `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${job.job_title} position at ${job.org_name}. With my background and experience, I believe I would be a valuable addition to your team.\n\nI am particularly excited about the opportunity to contribute to ${job.org_name} and would welcome the chance to discuss how my skills and experience align with your needs.\n\nThank you for considering my application. I look forward to hearing from you.\n\nBest regards,\n[Your Name]`,
            jobTitle: job.job_title,
            companyName: job.org_name,
            personalized: false
          });
        }
        } else {
          // Service not available, use fallback data
          coverLettersData.push({
            content: `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${job.job_title} position at ${job.org_name}. With my background and experience, I believe I would be a valuable addition to your team.\n\nI am particularly excited about the opportunity to contribute to ${job.org_name} and would welcome the chance to discuss how my skills and experience align with your needs.\n\nThank you for considering my application. I look forward to hearing from you.\n\nBest regards,\n[Your Name]`,
            jobTitle: job.job_title,
            companyName: job.org_name,
            personalized: false
          });
        }
      }
      
      setEnhancedResumes(enhancedResumesData);
      setCoverLetters(coverLettersData);
    } catch (error) {
      console.error('Error processing enhancements:', error);
      toast({
        title: "Error",
        description: "Failed to process resume enhancements",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleJobApproval = (jobId: string) => {
    setApprovedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set([...prev, itemId]));
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const downloadEnhancedResume = (enhancedId: number) => {
    if (enhancedId === -1) {
      toast({
        title: "Resume not available",
        description: "Enhanced resume is not available. Please try again later or contact support.",
        variant: "destructive"
      });
      return;
    }
    
    const url = `https://resume-enhancer-ab-1071432896229.asia-south2.run.app/download-enhanced-resume/${enhancedId}`;
    window.open(url, '_blank');
  };

  const viewEnhancedResume = (enhancedId: number, enhancedUrl: string) => {
    if (enhancedId === -1) {
      toast({
        title: "Resume not available",
        description: "Enhanced resume is not available. Please try again later or contact support.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (enhancedUrl && enhancedUrl.startsWith('http')) {
        window.open(enhancedUrl, '_blank');
      } else {
        // Fallback to download endpoint
        const url = `https://resume-enhancer-ab-1071432896229.asia-south2.run.app/download-enhanced-resume/${enhancedId}`;
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error opening resume:', error);
      toast({
        title: "Error viewing resume",
        description: "Failed to open resume. Please try downloading instead.",
        variant: "destructive"
      });
    }
  };

  const downloadCoverLetter = async (jobId: string) => {
    try {
      const coverLetter = coverLetters.find(cl => cl.jobTitle === selectedJobs.find(j => j.job_id === jobId)?.job_title);
      if (coverLetter) {
        const blob = new Blob([coverLetter.content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cover_letter_${jobId}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Download started",
          description: "Cover letter is being downloaded",
        });
      } else {
        toast({
          title: "No cover letter available",
          description: "Cover letter not found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error downloading cover letter:', error);
      toast({
        title: "Download failed",
        description: "Failed to download cover letter",
        variant: "destructive"
      });
    }
  };

  const sendApplications = async () => {
    if (approvedJobs.length === 0) {
      toast({
        title: "No applications selected",
        description: "Please approve at least one application to send",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      const approvedJobsData = selectedJobs.filter(job => approvedJobs.includes(job.job_id));
      
      console.log(`📊 Processing ${approvedJobsData.length} approved jobs`);
      console.log(`📄 Available enhanced resumes: ${enhancedResumes.length}`);
      console.log(`📝 Available cover letters: ${coverLetters.length}`);
      
      for (let i = 0; i < approvedJobsData.length; i++) {
        const job = approvedJobsData[i];
        console.log(`🔍 Looking for resume and cover letter for job: ${job.job_title} (ID: ${job.job_id})`);
        
        // Match by index since resumes and jobs are processed in the same order
        const resume = enhancedResumes[i];
        const coverLetter = coverLetters.find(cl => cl.jobTitle === job.job_title);
        
        console.log(`📄 Resume found: ${!!resume}`);
        console.log(`📝 Cover letter found: ${!!coverLetter}`);
        
        if (resume && coverLetter) {
          try {
            // Use the new enhanced resume apply endpoint
            console.log(`🔄 Starting enhanced resume application for job ${job.job_id}`);
            console.log(`📄 Resume URL: ${resume.enhancedUrl}`);
            console.log(`📝 Cover letter length: ${coverLetter.content.length} characters`);
            
            const resumeResponse = await fetch(resume.enhancedUrl);
            const resumeBlob = await resumeResponse.blob();
            console.log(`📄 Resume blob size: ${resumeBlob.size} bytes`);
            
            // Create FormData for enhanced resume application
            const formData = new FormData();
            formData.append('user_id', user?.id || '');
            formData.append('job_id', job.job_id);
            formData.append('cover_letter', coverLetter.content);
            formData.append('resume_file', resumeBlob, `enhanced_resume_${job.job_id}.pdf`);
            formData.append('job_title', job.job_title);
            formData.append('company_name', job.org_name);
            
                          console.log(`📤 Sending to: https://email-job-matching-1071432896229.asia-south2.run.app/auto-apply`);
              console.log(`👤 User ID: ${user?.id}`);
              console.log(`🏢 Job ID: ${job.job_id}`);
              console.log(`🏢 Company: ${job.org_name}`);
              
              const response = await emailAutomationService.post('/auto-apply', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              });
            
            console.log(`✅ Enhanced resume application sent successfully for job ${job.job_id}:`, response.data);
          } catch (error: any) {
            console.error(`❌ Failed to send enhanced resume application for job ${job.job_id}:`, error);
            console.error(`❌ Error details:`, {
              message: error.message,
              status: error.response?.status,
              data: error.response?.data,
              url: error.config?.url
            });
            toast({
              title: "Warning",
              description: `Failed to send application for ${job.job_title}. Please try again.`,
              variant: "destructive"
            });
          }
        } else {
          console.warn(`⚠️ Skipping job ${job.job_id} - missing resume or cover letter`);
          console.warn(`   Resume found: ${!!resume}`);
          console.warn(`   Cover letter found: ${!!coverLetter}`);
        }
      }

      // Prepare application data for confirmation page
      const applicationData = approvedJobsData.map((job, index) => {
        // Match by index since resumes and jobs are processed in the same order
        const resume = enhancedResumes[index];
        const coverLetter = coverLetters.find(cl => cl.jobTitle === job.job_title);
        
        return {
          job_id: job.job_id,
          job_title: job.job_title,
          company: job.org_name,
          location: job.location,
          status: 'sent' as const,
          sent_at: new Date().toISOString(),
          resume_sent: !!resume,
          cover_letter_sent: !!coverLetter,
          email_sent: true
        };
      });

      // Store in localStorage for backup
      localStorage.setItem('recentApplications', JSON.stringify(applicationData));

      // Send bulk confirmation email to applicant
      try {
        const bulkConfirmationData = approvedJobsData.map(job => ({
          job_title: job.job_title,
          company_name: job.org_name,
          application_id: Date.now() + Math.random(), // Generate unique ID
          date_sent: new Date().toISOString()
        }));

        await emailAutomationService.post('/send-bulk-confirmation', {
          user_id: user?.id || '',
          applications: bulkConfirmationData
        });

        console.log('Bulk confirmation email sent successfully');
      } catch (emailError) {
        console.warn('Failed to send bulk confirmation email:', emailError);
        // Don't show error to user as this is not critical
      }

      toast({
        title: "Success",
        description: `Successfully sent ${approvedJobsData.length} applications`,
      });

      // Navigate to confirmation page with application data
      navigate('/application-confirmation', { 
        state: { applications: applicationData }
      });
    } catch (error) {
      console.error('Error sending applications:', error);
      toast({
        title: "Error",
        description: "Failed to send applications",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isProcessing) {
    return (
      <Layout>
        <main className="px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-primary-foreground animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Processing Your Applications</h1>
            <p className="text-lg text-muted-foreground mb-8">
              We're enhancing your resume and generating personalized cover letters...
            </p>
            <div className="space-y-4">
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
              <p className="text-sm text-muted-foreground">
                This may take a few moments. Please don't close this page.
              </p>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Review Your Enhanced Applications</h1>
            <p className="text-lg text-muted-foreground">
              Preview your optimized resume and personalized cover letters before sending
            </p>
          </div>

          <div className="space-y-6">
            {selectedJobs.map((job, index) => {
              const enhancedResume = enhancedResumes[index];
              const coverLetter = coverLetters[index];
              const isApproved = approvedJobs.includes(job.job_id.toString());
              
              return (
                <Card key={job.job_id} className={`${isApproved ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          {job.job_title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.org_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {job.salary}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {job.work_type}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{job.match_score}% Match</Badge>
                        <Button
                          variant={isApproved ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleJobApproval(job.job_id.toString())}
                        >
                          {isApproved ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approved
                            </>
                          ) : (
                            "Approve"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="resume" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="resume">Enhanced Resume</TabsTrigger>
                        <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="resume" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Resume Enhancements</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadEnhancedResume(enhancedResume.id)}
                              disabled={!enhancedResume?.id}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            {enhancedResume?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewEnhancedResume(enhancedResume.id, enhancedResume.enhancedUrl)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {enhancedResume ? (
                          <div className="space-y-4">
                            {enhancedResume.improvements.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2">Improvements Made:</h5>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {enhancedResume.improvements.map((improvement, idx) => (
                                    <li key={idx}>{improvement}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {enhancedResume.keywords.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2">Keywords Added:</h5>
                                <div className="flex flex-wrap gap-2">
                                  {enhancedResume.keywords.map((keyword, idx) => (
                                    <Badge key={idx} variant="outline">{keyword}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {enhancedResume.enhancedUrl && (
                              <div className="border rounded-lg p-4 bg-muted/20">
                                <p className="text-sm text-muted-foreground mb-2">
                                  Enhanced resume is ready for download
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewEnhancedResume(enhancedResume.id, enhancedResume.enhancedUrl)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Resume
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadEnhancedResume(enhancedResume.id)}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download PDF
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {enhancedResume?.id === -1 ? (
                              <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                                <div className="flex items-center gap-2 text-yellow-700 mb-2">
                                  <Sparkles className="w-4 h-4" />
                                  <span className="font-medium">Resume Enhancement Service Unavailable</span>
                                </div>
                                <p className="text-sm text-yellow-600 mb-3">
                                  The resume enhancement service is temporarily unavailable. You can still proceed with your application using your original resume.
                                </p>
                                <div className="text-xs text-yellow-600 space-y-1">
                                  {enhancedResume.improvements.map((improvement, idx) => (
                                    <p key={idx}>• {improvement}</p>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No enhanced resume available.</p>
                            )}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="cover-letter" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Personalized Cover Letter</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(coverLetter?.content || '', `cover-${job.job_id}`)}
                              disabled={!coverLetter?.content}
                            >
                              {copiedItems.has(`cover-${job.job_id}`) ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadCoverLetter(job.job_id.toString())}
                              disabled={!coverLetter?.content}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                        
                        {coverLetter ? (
                          <div className="border rounded-lg p-4 bg-muted/20">
                            <div className="prose prose-sm max-w-none">
                              <p className="whitespace-pre-wrap text-sm">{coverLetter.content}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No cover letter available.</p>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="preview" className="space-y-4">
                        <h4 className="font-semibold">Application Preview</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Resume Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {enhancedResume?.enhancedUrl ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Enhanced resume ready</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <p>• Optimized for {job.job_title} position</p>
                                    <p>• {enhancedResume.keywords.length} keywords added</p>
                                    <p>• {enhancedResume.improvements.length} improvements made</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => viewEnhancedResume(enhancedResume.id, enhancedResume.enhancedUrl)}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadEnhancedResume(enhancedResume.id)}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {enhancedResume?.id === -1 ? (
                                    <div>
                                      <div className="flex items-center gap-2 text-yellow-600">
                                        <Sparkles className="w-4 h-4" />
                                        <span>Service temporarily unavailable</span>
                                      </div>
                                      <div className="text-sm text-muted-foreground mt-2">
                                        <p>• Resume enhancement service is down</p>
                                        <p>• You can still apply with your original resume</p>
                                        <p>• Try again later for enhanced version</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-red-600">
                                      <CheckCircle className="w-4 h-4" />
                                      <span>Resume not enhanced</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Cover Letter Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {coverLetter?.content ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Cover letter generated</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <p>• Personalized for {job.org_name}</p>
                                    <p>• Tailored to {job.job_title} role</p>
                                    <p>• {coverLetter.content.split(' ').length} words</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(coverLetter.content, `preview-cover-${job.job_id}`)}
                                    >
                                      {copiedItems.has(`preview-cover-${job.job_id}`) ? (
                                        <>
                                          <Check className="w-4 h-4 mr-2" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-4 h-4 mr-2" />
                                          Copy
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadCoverLetter(job.job_id.toString())}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Cover letter not generated</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Job Details</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium">Position</p>
                                <p className="text-muted-foreground">{job.job_title}</p>
                              </div>
                              <div>
                                <p className="font-medium">Company</p>
                                <p className="text-muted-foreground">{job.org_name}</p>
                              </div>
                              <div>
                                <p className="font-medium">Location</p>
                                <p className="text-muted-foreground">{job.location}</p>
                              </div>
                              <div>
                                <p className="font-medium">Salary</p>
                                <p className="text-muted-foreground">{job.salary}</p>
                              </div>
                              <div>
                                <p className="font-medium">Work Type</p>
                                <p className="text-muted-foreground">{job.work_type}</p>
                              </div>
                              <div>
                                <p className="font-medium">Match Score</p>
                                <p className="text-muted-foreground">{job.match_score}%</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-8">
            <Button variant="outline" onClick={() => navigate('/job-preferences')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Job Selection
            </Button>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {approvedJobs.length} of {selectedJobs.length} jobs selected
              </span>
              <Button 
                onClick={sendApplications} 
                disabled={approvedJobs.length === 0 || isSending}
                size="lg"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2"></div>
                    Sending Applications...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send {approvedJobs.length} Application{approvedJobs.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default EnhancedResumePreview; 