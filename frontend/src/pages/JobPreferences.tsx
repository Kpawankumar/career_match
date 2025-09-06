import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Star,
  Building,
  Clock,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import axios from "axios";

interface Job {
  job_id: number;
  job_title: string;
  job_description: string;
  match_score: number;
  salary: string;
  location: string;
  experience: string;
  date_posted: string;
  work_type: string;
  org_name: string;
  apply_link: string;
}

interface JobPreferences {
  location: string;
  salaryRange: string;
  jobType: string;
  experienceLevel: string;
}

const JobPreferences = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'preferences' | 'jobs' | 'selection' | 'standalone-complete'>('preferences');
  const [preferences, setPreferences] = useState({
    location: "",
    salaryRange: "",
    jobType: "",
    experienceLevel: "",
  });
  const [matchedJobs, setMatchedJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const domainOptions = ['Software Engineering', 'Data Science', 'Product Management', 'Design', 'Marketing', 'Sales', 'Other'];
  const qualificationOptions = ['B.Tech', 'M.Tech', 'B.Sc', 'M.Sc', 'PhD', 'Diploma', 'Other'];

  const [domain, setDomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [qualification, setQualification] = useState('');
  const [customQualification, setCustomQualification] = useState('');
  const [profileSkills, setProfileSkills] = useState<string[]>([]);

  const isStandalone = new URLSearchParams(location.search).get('standalone') === 'true';

  useEffect(() => {
    const hasProfile = localStorage.getItem('userProfile') || (user && user.email);
    if (!hasProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first to use this service",
        variant: "destructive"
      });
      navigate('/profile');
    }
  }, [user, toast, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const hasResume = localStorage.getItem('parsedProfile');
    if (!hasResume) {
      navigate('/resume-upload', { 
        state: { 
          message: 'Please upload your resume first to get job matches',
          redirectTo: '/job-preferences' 
        } 
      });
    }

    const parsedProfile = localStorage.getItem('parsedProfile');
    if (parsedProfile) {
      try {
        const profile = JSON.parse(parsedProfile);
        if (Array.isArray(profile.skills)) {
          setProfileSkills(profile.skills);
        } else if (typeof profile.skills === 'string') {
          setProfileSkills(profile.skills.split(/,|\n/).map(s => s.trim()).filter(Boolean));
        }
      } catch (e) {
        setProfileSkills([]);
      }
    }
  }, [isAuthenticated, navigate]);

  const findJobs = async () => {
    if (!preferences.location) {
      toast({
        title: "Please add location",
        description: "Add a location to find jobs",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const selectedDomain = domain === 'Other' ? customDomain : domain;
      const selectedQualification = qualification === 'Other' ? customQualification : qualification;
      
      const preferencesPayload = {
        user_id: user?.id || "1",
        keywords: profileSkills,
        location: preferences.location,
        salary_range: preferences.salaryRange,
        job_types: preferences.jobType ? [preferences.jobType] : [],
        experience_level: preferences.experienceLevel,
        industries: selectedDomain ? [selectedDomain] : []
      };
      
      try {
        await axios.post('https://job-matching-1071432896229.asia-south2.run.app/save-preferences', preferencesPayload);
        console.log('Job preferences saved successfully');
      } catch (prefError) {
        console.warn('Failed to save preferences:', prefError);
      }
      
      const jobMatchingPayload = {
        user_id: user?.id || "1",
        work_type: preferences.jobType,
        location: preferences.location,
        domain: selectedDomain,
        expected_salary: preferences.salaryRange,
        experience: preferences.experienceLevel,
        qualification: selectedQualification,
        top_n: 10
      };
      
      const response = await axios.post<Job[]>('https://job-matching-1071432896229.asia-south2.run.app/match-jobs', jobMatchingPayload);
      setMatchedJobs(response.data || []);
      setStep('jobs');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to find jobs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const proceedToEnhancement = () => {
    if (selectedJobs.length === 0) {
      toast({
        title: "No jobs selected",
        description: "Please select at least one job to proceed",
        variant: "destructive"
      });
      return;
    }
    if (isStandalone) {
      setStep('standalone-complete');
      return;
    }
    setStep('selection');
  };

  const startApplicationFlow = () => {
    if (selectedJobs.length === 0) {
      toast({
        title: "No jobs selected",
        description: "Please select at least one job to proceed",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem('selectedJobs', JSON.stringify(selectedJobs));
    localStorage.setItem('jobPreferences', JSON.stringify(preferences));
    
    const selectedJobsData = matchedJobs.filter(job => 
      selectedJobs.includes(job.job_id.toString())
    ).map(job => ({
      job_id: job.job_id.toString(),
      job_title: job.job_title,
      org_name: job.org_name,
      location: job.location,
      salary: job.salary || 'Not specified',
      work_type: job.work_type || 'Full-time',
      job_description: job.job_description,
      experience: job.experience || '',
      match_score: job.match_score,
      apply_link: job.apply_link || '#'
    }));
    
    localStorage.setItem('selectedJobsData', JSON.stringify(selectedJobsData));
    
    navigate('/enhanced-resume-preview', {
      state: {
        selectedJobs: selectedJobs,
        preferences: preferences,
        jobsData: selectedJobsData
      }
    });
  };

  const renderPreferencesStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
          <Search className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Job Preferences</h1>
        <p className="text-lg text-muted-foreground">
          Tell us what you're looking for and we'll find the perfect matches
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What are you looking for?</CardTitle>
          <CardDescription>
            The more specific you are, the better matches we can find for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Your Skills (from Profile)</Label>
            <div className="flex flex-wrap gap-2">
              {profileSkills.length > 0 ? (
                profileSkills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary">{skill}</Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">No skills found in your profile.</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Domain</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {domainOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {domain === 'Other' && (
              <Input
                className="mt-2"
                placeholder="Enter your domain"
                value={customDomain}
                onChange={e => setCustomDomain(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-3">
            <Label>Qualification</Label>
            <Select value={qualification} onValueChange={setQualification}>
              <SelectTrigger>
                <SelectValue placeholder="Select qualification" />
              </SelectTrigger>
              <SelectContent>
                {qualificationOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {qualification === 'Other' && (
              <Input
                className="mt-2"
                placeholder="Enter your qualification"
                value={customQualification}
                onChange={e => setCustomQualification(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-3">
            <Label>Location</Label>
            <Input
              placeholder="e.g., San Francisco, CA or Remote"
              value={preferences.location}
              onChange={(e) => setPreferences(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <Label>Salary Range</Label>
            <Select value={preferences.salaryRange} onValueChange={(value) => setPreferences(prev => ({ ...prev, salaryRange: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select salary range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-50k">$0 - $50k</SelectItem>
                <SelectItem value="50k-80k">$50k - $80k</SelectItem>
                <SelectItem value="80k-120k">$80k - $120k</SelectItem>
                <SelectItem value="120k-150k">$120k - $150k</SelectItem>
                <SelectItem value="150k+">$150k+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Job Type</Label>
            <Select value={preferences.jobType} onValueChange={value => setPreferences(prev => ({ ...prev, jobType: value }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Experience Level</Label>
            <Select value={preferences.experienceLevel} onValueChange={(value) => setPreferences(prev => ({ ...prev, experienceLevel: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                <SelectItem value="senior">Senior Level (5+ years)</SelectItem>
                <SelectItem value="lead">Lead/Manager (7+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={findJobs} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Finding Jobs...' : 'Find Matching Jobs'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => navigate('/profile')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
            <Button variant="outline" onClick={startApplicationFlow}>
              Next: Enhance Resume & Cover Letter
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderJobsStep = () => (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Matching Jobs</h1>
          <p className="text-lg text-muted-foreground">
            We found {matchedJobs.length} jobs that match your preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {matchedJobs.map((job) => (
          <Card key={job.job_id} className={`cursor-pointer transition-all ${
            selectedJobs.includes(job.job_id.toString()) ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
          }`} onClick={() => toggleJobSelection(job.job_id.toString())}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{job.job_title}</h3>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {job.match_score}% Match
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      {job.org_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {job.salary}
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3">{job.job_description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{job.experience}</Badge>
                  </div>
                </div>
                <div className="ml-4">
                  {selectedJobs.includes(job.job_id.toString()) ? (
                    <CheckCircle className="w-6 h-6 text-primary" />
                  ) : (
                    <div className="w-6 h-6 border-2 border-muted-foreground rounded-full" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button variant="outline" onClick={() => setStep('preferences')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Preferences
        </Button>
        <Button onClick={proceedToEnhancement} disabled={selectedJobs.length === 0}>
          Continue with {selectedJobs.length} Job{selectedJobs.length !== 1 ? 's' : ''}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderSelectionStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Ready to Apply</h1>
        <p className="text-lg text-muted-foreground">
          We'll enhance your resume and generate cover letters for your selected jobs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selected Jobs</CardTitle>
          <CardDescription>
            We'll optimize your resume for these {selectedJobs.length} position{selectedJobs.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {matchedJobs.filter(job => selectedJobs.includes(job.job_id.toString())).map((job) => (
            <div key={job.job_id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">{job.job_title}</h4>
                <p className="text-muted-foreground">{job.org_name}</p>
              </div>
              <Badge variant="secondary">{job.match_score}% Match</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-center mt-8">
        <Button onClick={startApplicationFlow} size="lg">
          Start Application Process
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStandaloneComplete = () => (
    <div className="max-w-4xl mx-auto text-center py-12">
      <h1 className="text-3xl font-bold mb-4">Job Matches Complete</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Here are your matched jobs. You can now apply directly to these jobs.
      </p>
      <Button onClick={() => navigate('/')}>Back to Home</Button>
    </div>
  );

  return (
    <Layout>
      <main className="px-4 py-12">
        {step === 'preferences' && renderPreferencesStep()}
        {step === 'jobs' && renderJobsStep()}
        {step === 'selection' && renderSelectionStep()}
        {step === 'standalone-complete' && renderStandaloneComplete()}
      </main>
    </Layout>
  );
};

export default JobPreferences;