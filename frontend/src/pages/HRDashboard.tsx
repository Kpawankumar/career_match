import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Users, 
  Briefcase, 
  Calendar, 
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Filter,
  Building,
  Settings,
  Sparkles,
  Eye,
  Edit,
  Pause,
  Play,
  Archive,
  BarChart3,
  UserPlus,
  Target,
  Award,
  Zap,
  Download,
  Loader2,
  User,
  MapPin,
  DollarSign,
  RefreshCw
} from "lucide-react";

// API Configuration
const HR_API_BASE_URL = "https://hr-management-1071432896229.asia-south2.run.app";
const AI_JOB_API_BASE_URL = "https://job-generator-1071432896229.asia-south2.run.app";

// Types
interface Organization {
  org_id: number;
  name: string;
  industry: string;
  description: string;
}

interface JobPosting {
  job_id: number;
  org_id: number;
  job_title: string;
  job_desc: string;
  qualification: string;
  location: string;
  salary_range: string;
  job_type: string;
  experience_level: string;
  skills_required: string[];
  status: string;
  created_at: string;
  applicant_count: number;
}

interface Application {
  application_id: number;
  job_id: number;
  applicant_id: string;
  status: string;
  applied_at: string;
  applicant_name: string;
  applicant_email: string;
  resume_url?: string;
  cover_letter_url?: string;
}

interface HRUser {
  user_id: string;
  name: string;
  email: string;
  org_id: number;
}

interface Analytics {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  applications_this_month: number;
  jobs_by_status: Record<string, number>;
  applications_by_status: Record<string, number>;
  top_performing_jobs: Array<{
    job_id: number;
    job_title: string;
    application_count: number;
  }>;
}

interface AIJobData {
  title: string;
  department: string;
  experience: string;
  location: string;
  work_type: string;
  description: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
}

const HRDashboard = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiJobData, setAiJobData] = useState<AIJobData>({
    title: "",
    department: "",
    experience: "Entry",
    location: "",
    work_type: "Full-time",
    description: "",
    requirements: "",
    responsibilities: "",
    benefits: ""
  });
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [newJobData, setNewJobData] = useState({
    job_title: "",
    job_desc: "",
    qualification: "",
    location: "",
    salary_range: "",
    job_type: "Full-time",
    experience_level: "Entry",
    skills_required: [] as string[]
  });

  // State for API data
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [hrUsers, setHrUsers] = useState<HRUser[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<number | null>(null);
  const [showOrgSetup, setShowOrgSetup] = useState(false);
  const [orgSetupData, setOrgSetupData] = useState({
    org_name: "",
    org_desc: "",
    industry: "",
    size: "",
    location: ""
  });
  const [orgSuggestions, setOrgSuggestions] = useState<Organization[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingOrgs, setSearchingOrgs] = useState(false);
  const [showOrgEdit, setShowOrgEdit] = useState(false);
  const [orgEditData, setOrgEditData] = useState({
    name: "",
    industry: "",
    description: ""
  });
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [showJobEdit, setShowJobEdit] = useState(false);

  // API Functions
  const checkHRProfile = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${HR_API_BASE_URL}/hr-users/profile`, {
        headers
      });
      
      if (response.ok) {
        const profile = await response.json();
        console.log('HR Profile Response:', profile);
        
        if (profile.has_organization && profile.hr_org_id) {
          // HR user has organization, fetch it
          console.log('HR user has organization, fetching details...');
          await fetchOrganization();
          // Ensure organization setup is hidden
          setShowOrgSetup(false);
          setLoading(false);
        } else {
          // HR user needs organization setup
          console.log('HR user needs organization setup');
          setOrganization(null);
          setCurrentOrgId(null);
          setShowOrgSetup(true);
          setLoading(false);
        }
      } else if (response.status === 404) {
        // Profile not found, initialize HR user
        console.log('HR profile not found, initializing...');
        await initializeHRUser();
      } else {
        // Other error, show setup
        console.log('Error response from profile check, showing setup');
        setOrganization(null);
        setCurrentOrgId(null);
        setShowOrgSetup(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking HR profile:', error);
      // Initialize HR user if profile check fails
      await initializeHRUser();
    }
  };

  const initializeHRUser = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${HR_API_BASE_URL}/hr-users/initialize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const initResult = await response.json();
        console.log('HR user initialized:', initResult);
        
        if (initResult.has_organization && initResult.hr_org_id) {
          // User already has organization, fetch it
          await fetchOrganization();
          setShowOrgSetup(false);
        } else {
          // User needs organization setup
          setShowOrgSetup(true);
        }
      } else {
        console.error('Failed to initialize HR user');
        setShowOrgSetup(true);
      }
    } catch (error) {
      console.error('Error initializing HR user:', error);
      setShowOrgSetup(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganization = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // First get HR profile to get the user's organization
      const hrResponse = await fetch(`${HR_API_BASE_URL}/hr-users/profile`, {
        headers
      });
      
      if (hrResponse.ok) {
        const hrData = await hrResponse.json();
        console.log('HR Profile Data:', hrData);
        
        if (hrData.hr_org_id) {
          // Get the specific organization for this HR user
          const orgResponse = await fetch(`${HR_API_BASE_URL}/organizations/${hrData.hr_org_id}`, {
            headers
          });
          
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            console.log('Organization Data:', orgData);
            setOrganization(orgData);
            setCurrentOrgId(orgData.org_id);
            setShowOrgSetup(false); // Ensure setup is hidden
            await fetchJobs(orgData.org_id);
            await fetchAnalytics(orgData.org_id);
            await fetchHRUsers(orgData.org_id);
            await fetchApplications(orgData.org_id);
          } else {
            console.error('Failed to fetch organization details');
            setOrganization(null);
            setCurrentOrgId(null);
            setShowOrgSetup(true);
          }
        } else {
          console.log('No organization assigned to HR user');
          setOrganization(null);
          setCurrentOrgId(null);
          setShowOrgSetup(true);
        }
      } else {
        console.error('Failed to fetch HR profile');
        setOrganization(null);
        setCurrentOrgId(null);
        setShowOrgSetup(true);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setOrganization(null);
      setCurrentOrgId(null);
      setShowOrgSetup(true);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultOrganization = async () => {
    try {
      const orgData = {
        name: "My Company",
        industry: "Technology",
        size: "10-50",
        website: "",
        founded_year: new Date().getFullYear(),
        description: "A growing company looking for talented individuals."
      };
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${HR_API_BASE_URL}/organizations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orgData)
      });
      
      if (response.ok) {
        const newOrg = await response.json();
        setOrganization(newOrg);
        setCurrentOrgId(newOrg.org_id);
        await fetchJobs(newOrg.org_id);
        await fetchAnalytics(newOrg.org_id);
        await fetchHRUsers(newOrg.org_id);
        await fetchApplications(newOrg.org_id);
        toast({
          title: "Success",
          description: "Organization created successfully!",
        });
      } else {
        throw new Error('Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive",
      });
    }
  };

  const handleOrgSetup = async () => {
    if (!orgSetupData.org_name || !orgSetupData.industry) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${HR_API_BASE_URL}/organizations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orgSetupData)
      });
      
      if (response.ok) {
        const newOrg = await response.json();
        setOrganization(newOrg);
        setCurrentOrgId(newOrg.org_id);
        setShowOrgSetup(false);
        setOrgSetupData({
          org_name: "",
          org_desc: "",
          industry: "",
          size: "",
          location: ""
        });
        await fetchJobs(newOrg.org_id);
        await fetchAnalytics(newOrg.org_id);
        await fetchHRUsers(newOrg.org_id);
        toast({
          title: "Success",
          description: "Organization setup completed!",
        });
      } else {
        throw new Error('Failed to setup organization');
      }
    } catch (error) {
      console.error('Error setting up organization:', error);
      toast({
        title: "Error",
        description: "Failed to setup organization",
        variant: "destructive",
      });
    }
  };

  const searchOrganizations = async (query: string) => {
    if (query.length < 2) {
      setOrgSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchingOrgs(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Searching organizations with query:', query);
      const response = await fetch(`${HR_API_BASE_URL}/organizations/search?query=${encodeURIComponent(query)}`, {
        headers
      });

      console.log('Search response status:', response.status);
      
      if (response.ok) {
        const suggestions = await response.json();
        console.log('Organization search results:', suggestions);
        setOrgSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } else {
        console.error('Search failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        // Try to load all organizations as fallback
        await loadAllOrganizations();
      }
    } catch (error) {
      console.error('Error searching organizations:', error);
      // Try to load all organizations as fallback
      await loadAllOrganizations();
    } finally {
      setSearchingOrgs(false);
    }
  };

  // Function to load all organizations for suggestions
  const loadAllOrganizations = async () => {
    setSearchingOrgs(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Loading all organizations...');
      const response = await fetch(`${HR_API_BASE_URL}/organizations`, {
        headers
      });

      console.log('Load all orgs response status:', response.status);

      if (response.ok) {
        const allOrgs = await response.json();
        console.log('All organizations:', allOrgs);
        setOrgSuggestions(allOrgs);
        setShowSuggestions(allOrgs.length > 0);
      } else {
        console.error('Failed to load all organizations:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setOrgSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error loading all organizations:', error);
      setOrgSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearchingOrgs(false);
    }
  };

  const handleOrgNameChange = (value: string) => {
    setOrgSetupData({...orgSetupData, org_name: value});
    console.log('Organization name changed to:', value);
    
    // Clear suggestions if input is empty
    if (!value.trim()) {
      setOrgSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Debounce the search
    const timeoutId = setTimeout(() => {
      searchOrganizations(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const selectExistingOrg = async (org: Organization) => {
    setOrgSetupData({
      org_name: org.name,
      org_desc: org.description || '',
      industry: org.industry,
      size: '50-100', // Default size since not in our schema
      location: 'Remote' // Default location since not in our schema
    });
    setShowSuggestions(false);
    
    // Join existing organization
    try {
      await assignHRToOrganization(org.org_id);
      setOrganization(org);
      setCurrentOrgId(org.org_id);
      setShowOrgSetup(false);
      
      await fetchJobs(org.org_id);
      await fetchAnalytics(org.org_id);
      await fetchHRUsers(org.org_id);
      await fetchApplications(org.org_id);
      
      toast({
        title: "Organization Joined",
        description: `You've been added to ${org.name}!`,
      });
    } catch (error) {
      console.error('Error joining organization:', error);
      toast({
        title: "Error",
        description: "Failed to join organization. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateOrganization = async () => {
    if (!organization) return;
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Trim whitespace from organization name to prevent unique constraint issues
      const trimmedOrgData = {
        ...orgEditData,
        name: orgEditData.name.trim()
      };
      
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${organization.org_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(trimmedOrgData)
      });
      
      if (response.ok) {
        const updatedOrg = await response.json();
        setOrganization(updatedOrg);
        setShowOrgEdit(false);
        
        toast({
          title: "Organization Updated",
          description: "Organization details updated successfully",
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Failed to update organization';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update organization",
        variant: "destructive",
      });
    }
  };

  const openOrgEdit = () => {
    if (organization) {
      setOrgEditData({
        name: organization.name,
        industry: organization.industry || "",
        description: organization.description || ""
      });
      setShowOrgEdit(true);
    }
  };

  const assignHRToOrganization = async (orgId: number) => {
    try {
      const response = await fetch(`${HR_API_BASE_URL}/hr-users/assign-organization`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          org_id: orgId
        })
      });
      
      if (response.ok) {
        console.log('HR user assigned to organization successfully');
        await fetchOrganization();
      } else {
        console.error('Failed to assign HR user to organization:', response.status);
      }
    } catch (error) {
      console.error('Error assigning HR user to organization:', error);
    }
  };

  const fetchJobs = async (orgId: number) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${orgId}/jobs`, {
        headers
      });
      
      if (response.ok) {
        const jobsData = await response.json();
        setJobs(jobsData);
        console.log('Jobs fetched successfully:', jobsData);
      } else {
        console.error('Failed to fetch jobs:', response.status);
        setJobs([]);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    }
  };

  const refreshJobs = async () => {
    if (currentOrgId) {
      await fetchJobs(currentOrgId);
    }
  };

  // Add a comprehensive refresh function
  const refreshDashboard = async () => {
    setLoading(true);
    try {
      // Reset state
      setOrganization(null);
      setCurrentOrgId(null);
      setJobs([]);
      setApplications([]);
      setHrUsers([]);
      setAnalytics(null);
      setShowOrgSetup(false);
      
      // Re-check profile and fetch data
      await checkHRProfile();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      setLoading(false);
    }
  };

  const fetchApplications = async (orgId: number) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${orgId}/applications`, {
        headers
      });
      
      if (response.ok) {
        const applicationsData = await response.json();
        console.log('Fetched applications:', applicationsData);
        setApplications(applicationsData);
      } else {
        console.error('Error fetching applications:', response.status, response.statusText);
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    }
  };

  const fetchHRUsers = async (orgId: number) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${orgId}/hr-users`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setHrUsers(data);
      } else {
        console.error('Error fetching HR users:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching HR users:', error);
    }
  };

  const fetchAnalytics = async (orgId: number) => {
    try {
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${orgId}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createJob = async (jobData: any) => {
    try {
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${currentOrgId}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          org_id: currentOrgId,
          job_title: jobData.title,
          job_desc: jobData.description,
          qualification: "Bachelor's degree or equivalent experience",
          location: jobData.location,
          salary_range: "$60,000 - $120,000",
          job_type: "Full-time",
          experience_level: jobData.experience,
          skills_required: ["Communication", "Teamwork", "Problem Solving"]
        })
      });
      
      if (response.ok) {
        await fetchJobs(currentOrgId!);
        setShowAIGenerator(false);
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const updateJobStatus = async (jobId: number, status: string) => {
    if (!currentOrgId) return;
    
    try {
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${currentOrgId}/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        // Refresh jobs list
        await fetchJobs(currentOrgId);
        toast({
          title: "Success",
          description: `Job status updated to ${status}`,
        });
      } else {
        throw new Error('Failed to update job status');
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const generateAIJob = async () => {
    try {
      if (!organization) {
        toast({
          title: "Error",
          description: "Please set up your organization first",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${AI_JOB_API_BASE_URL}/generate-job`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: aiJobData.title,
          department: aiJobData.department,
          experience_level: aiJobData.experience,
          location: aiJobData.location,
          work_type: aiJobData.work_type,
          organization_name: organization.name,
          industry: organization.industry,
          description: aiJobData.description,
          requirements: aiJobData.requirements,
          responsibilities: aiJobData.responsibilities,
          benefits: aiJobData.benefits
        })
      });
      
      if (response.ok) {
        const aiJob = await response.json();
        
        // Create complete job posting with AI-generated content
        const completeJobData = {
          title: aiJob.seo_optimized_title || aiJobData.title,
          department: aiJobData.department,
          location: aiJobData.location,
          work_type: aiJobData.work_type,
          experience: aiJobData.experience,
          salary: aiJob.suggested_salary_range,
          description: aiJob.job_description,
          requirements: aiJob.requirements,
          responsibilities: aiJob.responsibilities,
          benefits: aiJob.benefits,
          skills_required: aiJob.suggested_skills,
          status: "active",
          ai_generated: true
        };
        
        await createJob(completeJobData);
        
        // Reset AI job form
        setAiJobData({
          title: "",
          department: "",
          experience: "Entry",
          location: "",
          work_type: "Full-time",
          description: "",
          requirements: "",
          responsibilities: "",
          benefits: ""
        });
        
        toast({
          title: "Success",
          description: "AI-generated job posting created successfully!",
        });
      } else {
        throw new Error('Failed to generate AI job');
      }
    } catch (error) {
      console.error('Error generating AI job:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI job posting",
        variant: "destructive",
      });
    }
  };

  const handleCreateJob = async () => {
    if (!currentOrgId) return;
    
    try {
      const jobData = {
        ...newJobData,
        org_id: currentOrgId,
        status: "active"
      };
      
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${currentOrgId}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Job posting created successfully!",
        });
        setShowCreateJob(false);
        setNewJobData({
          job_title: "",
          job_desc: "",
          qualification: "",
          location: "",
          salary_range: "",
          job_type: "Full-time",
          experience_level: "Entry",
          skills_required: []
        });
        await fetchJobs(currentOrgId);
      } else {
        throw new Error('Failed to create job posting');
      }
    } catch (error) {
      console.error('Error creating job posting:', error);
      toast({
        title: "Error",
        description: "Failed to create job posting",
        variant: "destructive",
      });
    }
  };

  const editJob = (job: JobPosting) => {
    setEditingJob(job);
    setShowJobEdit(true);
  };

  const archiveJob = async (jobId: number) => {
    if (!currentOrgId) return;
    
    try {
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${currentOrgId}/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'archived' })
      });
      
      if (response.ok) {
        // Refresh jobs list
        await fetchJobs(currentOrgId);
        toast({
          title: "Success",
          description: "Job archived successfully",
        });
      } else {
        throw new Error('Failed to archive job');
      }
    } catch (error) {
      console.error('Error archiving job:', error);
      toast({
        title: "Error",
        description: "Failed to archive job",
        variant: "destructive",
      });
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (token) {
      // Add a small delay to ensure token is properly loaded
      const timer = setTimeout(() => {
        checkHRProfile().finally(() => setLoading(false));
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [token]);

  // Refresh jobs when currentOrgId changes
  useEffect(() => {
    if (currentOrgId) {
      refreshJobs();
    }
  }, [currentOrgId]);

  // Debug useEffect to track organization state
  useEffect(() => {
    console.log('Organization state changed:', {
      organization: organization?.name,
      currentOrgId,
      showOrgSetup,
      loading
    });
  }, [organization, currentOrgId, showOrgSetup, loading]);

  // Load all organizations when setup modal opens
  useEffect(() => {
    if (showOrgSetup) {
      loadAllOrganizations();
    }
  }, [showOrgSetup]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "closed": return "bg-red-100 text-red-800";
      case "draft": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case "applied": return "bg-blue-100 text-blue-800";
      case "screening": return "bg-yellow-100 text-yellow-800";
      case "interview": return "bg-purple-100 text-purple-800";
      case "offer": return "bg-green-100 text-green-800";
      case "hired": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleAIGenerateJob = async () => {
    await generateAIJob();
  };

  const saveJobEdit = async () => {
    if (!editingJob || !currentOrgId) return;
    
    try {
      const response = await fetch(`${HR_API_BASE_URL}/organizations/${currentOrgId}/jobs/${editingJob.job_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job_title: editingJob.job_title,
          job_desc: editingJob.job_desc,
          qualification: editingJob.qualification,
          location: editingJob.location,
          salary_range: editingJob.salary_range,
          job_type: editingJob.job_type,
          experience_level: editingJob.experience_level,
          skills_required: editingJob.skills_required
        })
      });
      
      if (response.ok) {
        await fetchJobs(currentOrgId);
        setShowJobEdit(false);
        setEditingJob(null);
        toast({
          title: "Success",
          description: "Job updated successfully",
        });
      } else {
        throw new Error('Failed to update job');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading HR Dashboard...</span>
        </div>
      </Layout>
    );
  }

  if (!organization) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Welcome to HR Dashboard</h2>
              <p className="text-muted-foreground mb-4">
                Let's set up your organization to get started with HR management.
              </p>
              <div className="space-y-3">
                <Button onClick={() => setShowOrgSetup(true)}>
                  <Building className="h-4 w-4 mr-2" />
                  Set Up Organization
                </Button>
                <Button 
                  variant="outline" 
                  onClick={refreshDashboard}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Organization Setup Modal */}
        <Dialog open={showOrgSetup} onOpenChange={setShowOrgSetup}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Set Up Your Organization</DialogTitle>
              <DialogDescription>
                Welcome! Let's set up your organization to get started with HR management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> If your organization already exists, select it from the suggestions below to join instead of creating a duplicate.
                </p>
              </div>
              <div>
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  placeholder="Enter your organization name"
                  value={orgSetupData.org_name}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                />
                {showSuggestions && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md border">
                    <h4 className="font-semibold mb-2 text-sm">Existing Organizations:</h4>
                    {orgSuggestions.length > 0 ? (
                      orgSuggestions.map((org) => (
                        <div
                          key={org.org_id}
                          className="flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
                          onClick={() => selectExistingOrg(org)}
                        >
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-xs text-gray-600">
                              {org.industry} • {org.description}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Join
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No existing organizations found. You can create a new one below.</p>
                    )}
                  </div>
                )}
                {searchingOrgs && (
                  <p className="text-sm text-muted-foreground mt-1">🔍 Searching for existing organizations...</p>
                )}
              </div>
              <div>
                <Label htmlFor="org-desc">Description</Label>
                <Textarea
                  id="org-desc"
                  placeholder="Brief description of your organization"
                  value={orgSetupData.org_desc}
                  onChange={(e) => setOrgSetupData({...orgSetupData, org_desc: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={orgSetupData.industry} onValueChange={(value) => setOrgSetupData({...orgSetupData, industry: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="size">Company Size</Label>
                  <Select value={orgSetupData.size} onValueChange={(value) => setOrgSetupData({...orgSetupData, size: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10 employees">1-10 employees</SelectItem>
                      <SelectItem value="11-50 employees">11-50 employees</SelectItem>
                      <SelectItem value="51-200 employees">51-200 employees</SelectItem>
                      <SelectItem value="201-500 employees">201-500 employees</SelectItem>
                      <SelectItem value="500+ employees">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, State or Remote"
                  value={orgSetupData.location}
                  onChange={(e) => setOrgSetupData({...orgSetupData, location: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleOrgSetup}
                  disabled={!orgSetupData.org_name.trim() || showSuggestions}
                  className="flex-1"
                >
                  Create Organization
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowOrgSetup(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
                  <p className="text-blue-600 font-medium">
                    Welcome back! Managing recruitment for {organization.name}
                  </p>
                </div>
              </div>
              {organization && (
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    {organization.industry || 'Technology'}
                  </Badge>
                  {organization.description && (
                    <span className="text-sm text-gray-600">
                      {organization.description}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={openOrgEdit}
                size="sm"
                className="border-gray-300 bg-gray-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Organization
              </Button>
              <Link to="/hr-profile">
                <Button variant="outline" size="sm" className="border-gray-300 bg-gray-50">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Link to="/ai-job-posting">
                <Button className="bg-gradient-primary text-primary-foreground hover:bg-gradient-primary/90 flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Job Generator
                </Button>
              </Link>
              <Link to="/post-job">
                <Button 
                  className="bg-gradient-primary text-primary-foreground hover:bg-gradient-primary/90 flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Post New Job
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Organization Overview */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Active Jobs</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.active_jobs}</p>
                    <p className="text-xs text-green-600 mt-1">+12% from last month</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Briefcase className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Applications</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.total_applications}</p>
                    <p className="text-xs text-blue-600 mt-1">+8% from last month</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.applications_this_month}</p>
                    <p className="text-xs text-purple-600 mt-1">New applications</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Team Members</p>
                    <p className="text-3xl font-bold text-gray-900">{hrUsers.length}</p>
                    <p className="text-xs text-orange-600 mt-1">Active HR team</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Users className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Briefcase className="h-4 w-4" />
              Job Postings
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileText className="h-4 w-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Applications */}
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">Recent Applications</CardTitle>
                        <CardDescription className="text-gray-600">Latest candidate applications that need your attention</CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {applications.length} new
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {applications.slice(0, 5).map((application) => (
                      <div key={application.application_id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                              {application.applicant_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-gray-900">{application.applicant_name}</h3>
                            <p className="text-sm text-gray-600">{application.applicant_email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${getApplicationStatusColor(application.status)} text-xs`}>
                                {application.status}
                              </Badge>
                              <span className="text-xs text-gray-500">Applied: {new Date(application.applied_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-50">
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                    {applications.length === 0 && (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
                        <p className="text-gray-600 mb-4">
                          Applications will appear here once candidates start applying to your job postings.
                        </p>
                        <Link to="/post-job">
                          <Button variant="outline" className="border-gray-300">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Job Posting
                          </Button>
                        </Link>
                      </div>
                    )}
                    {applications.length > 0 && (
                      <Link to="/applications">
                        <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-50">
                          View All Applications
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Team Activity */}
              <div>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">Team Activity</CardTitle>
                        <CardDescription className="text-gray-600">What your team is working on</CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {hrUsers.length} active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {hrUsers.map((member) => (
                      <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-green-100 text-green-600 font-semibold">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{member.name}</h4>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    ))}
                    {hrUsers.length === 0 && (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Members</h3>
                        <p className="text-gray-600">
                          Add HR team members to collaborate on recruitment.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 flex-1 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search job postings..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-48 border-gray-300">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <div className="flex gap-2">
                <Link to="/post-job">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Job Posting
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {jobs.map((job) => (
                <Card key={job.job_id} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-semibold text-gray-900">{job.job_title}</h3>
                          <Badge className={`${getStatusColor(job.status)} text-xs font-medium`}>
                            {job.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{job.job_type}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            <span>{job.experience_level}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-900">{job.applicant_count} applications</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-gray-900">{job.salary_range}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-gray-300 hover:bg-gray-50"
                          onClick={() => editJob(job)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {job.status === 'active' ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateJobStatus(job.job_id, 'paused')}
                            className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateJobStatus(job.job_id, 'active')}
                            className="border-green-300 text-green-700 hover:bg-green-50"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-gray-300 hover:bg-gray-50"
                          onClick={() => archiveJob(job.job_id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {jobs.length === 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="h-16 w-16 mx-auto mb-6 text-gray-300" />
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Job Postings</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Create your first job posting to start attracting candidates and building your team.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Link to="/post-job">
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Job Posting
                        </Button>
                      </Link>
                      <Link to="/post-job">
                        <Button 
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Use AI Generator
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 flex-1 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search applications..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-48 border-gray-300">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left p-4 font-semibold text-gray-900">Candidate</th>
                        <th className="text-left p-4 font-semibold text-gray-900">Job</th>
                        <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                        <th className="text-left p-4 font-semibold text-gray-900">Applied</th>
                        <th className="text-left p-4 font-semibold text-gray-900">Email</th>
                        <th className="text-left p-4 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((application) => (
                        <tr key={application.application_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                                  {application.applicant_name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">{application.applicant_name}</p>
                                <p className="text-sm text-gray-600">ID: {application.applicant_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-gray-900">Job #{application.job_id}</p>
                          </td>
                          <td className="p-4">
                            <Badge className={`${getApplicationStatusColor(application.status)} text-xs font-medium`}>
                              {application.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {new Date(application.applied_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-900">{application.applicant_email}</p>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-50">
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                                <Calendar className="h-4 w-4 mr-1" />
                                Schedule
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {applications.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 mx-auto mb-6 text-gray-300" />
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Applications Found</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Applications will appear here once candidates start applying to your job postings.
                      </p>
                      <Link to="/post-job">
                        <Button variant="outline" className="border-gray-300">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Job Posting
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
                <p className="text-gray-600 mt-1">Manage your HR team members and their roles</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hrUsers.map((member) => (
                <Card key={member.user_id} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                                              <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-green-100 text-green-600 font-semibold text-lg">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{member.name}</h3>
                          <p className="text-sm text-gray-600">HR Team Member</p>
                        </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">User ID:</span>
                        <span className="font-medium text-gray-900">{member.user_id}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Joined:</span>
                        <span className="font-medium text-gray-900">Active</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                      <Button size="sm" variant="outline" className="flex-1 border-gray-300 hover:bg-gray-50">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-50">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {hrUsers.length === 0 && (
                <Card className="col-span-full border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Users className="h-16 w-16 mx-auto mb-6 text-gray-300" />
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Team Members</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Add HR team members to collaborate on recruitment and share the workload.
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Team Member
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Job Status Distribution */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">Job Status Distribution</CardTitle>
                        <CardDescription className="text-gray-600">Current job posting status breakdown</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.jobs_by_status).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              status === 'active' ? 'bg-green-500' : 
                              status === 'paused' ? 'bg-yellow-500' : 
                              status === 'closed' ? 'bg-red-500' : 'bg-gray-500'
                            }`}></div>
                            <span className="capitalize font-medium text-gray-900">{status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900">{count}</span>
                            <span className="text-sm text-gray-600">jobs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Application Status Distribution */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">Application Status</CardTitle>
                        <CardDescription className="text-gray-600">Application status breakdown</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.applications_by_status).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              status === 'applied' ? 'bg-blue-500' : 
                              status === 'screening' ? 'bg-yellow-500' : 
                              status === 'interview' ? 'bg-purple-500' : 
                              status === 'offer' ? 'bg-green-500' : 
                              status === 'hired' ? 'bg-green-600' : 
                              status === 'rejected' ? 'bg-red-500' : 'bg-gray-500'
                            }`}></div>
                            <span className="capitalize font-medium text-gray-900">{status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900">{count}</span>
                            <span className="text-sm text-gray-600">applications</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Performing Jobs */}
            {analytics && analytics.top_performing_jobs.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">Top Performing Jobs</CardTitle>
                      <CardDescription className="text-gray-600">Jobs with the most applications</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.top_performing_jobs.map((job, index) => (
                      <div key={job.job_id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{job.job_title}</h4>
                            <p className="text-sm text-gray-600">Job #{job.job_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">{job.application_count} applications</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!analytics && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-6 text-gray-300" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Analytics Data</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Analytics will appear once you have job postings and applications. Start by creating your first job posting.
                  </p>
                  <Link to="/post-job">
                    <Button variant="outline" className="border-gray-300">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Job Posting
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Organization Settings */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">Organization Settings</CardTitle>
                      <CardDescription className="text-gray-600">Manage your company profile and preferences</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="org-name" className="text-sm font-medium text-gray-700">Organization Name</Label>
                    <Input 
                      id="org-name" 
                      defaultValue={organization.name}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry" className="text-sm font-medium text-gray-700">Industry</Label>
                    <Input 
                      id="industry" 
                      defaultValue={organization.industry}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="size" className="text-sm font-medium text-gray-700">Company Size</Label>
                    <Input 
                      id="size" 
                      defaultValue={organization.description}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-sm font-medium text-gray-700">Location</Label>
                    <Input 
                      id="location" 
                      defaultValue={organization.description}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Settings className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>

              {/* AI Settings */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">AI Job Generation</CardTitle>
                      <CardDescription className="text-gray-600">Configure AI-powered job posting features</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">Enable AI Job Generation</p>
                      <p className="text-sm text-gray-600">Use AI to help create job postings</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">Auto-approve AI Jobs</p>
                      <p className="text-sm text-gray-600">Automatically approve AI-generated jobs</p>
                    </div>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      Disabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">AI Model</p>
                      <p className="text-sm text-gray-600">Select the AI model to use</p>
                    </div>
                    <Select defaultValue="gpt-4">
                      <SelectTrigger className="w-32 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                        <SelectItem value="claude">Claude</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Organization Setup Modal */}
        <Dialog open={showOrgSetup} onOpenChange={setShowOrgSetup}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Set Up Your Organization</DialogTitle>
              <DialogDescription>
                Welcome! Let's set up your organization to get started with HR management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> If your organization already exists, select it from the suggestions below to join instead of creating a duplicate.
                </p>
              </div>
              <div>
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  placeholder="Enter your organization name"
                  value={orgSetupData.org_name}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                />
                {showSuggestions && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md border">
                    <h4 className="font-semibold mb-2 text-sm">Existing Organizations:</h4>
                    {orgSuggestions.length > 0 ? (
                      orgSuggestions.map((org) => (
                        <div
                          key={org.org_id}
                          className="flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
                          onClick={() => selectExistingOrg(org)}
                        >
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-xs text-gray-600">
                              {org.industry} • {org.description}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Join
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No existing organizations found. You can create a new one below.</p>
                    )}
                  </div>
                )}
                {searchingOrgs && (
                  <p className="text-sm text-muted-foreground mt-1">🔍 Searching for existing organizations...</p>
                )}
              </div>
              <div>
                <Label htmlFor="org-desc">Description</Label>
                <Textarea
                  id="org-desc"
                  placeholder="Brief description of your organization"
                  value={orgSetupData.org_desc}
                  onChange={(e) => setOrgSetupData({...orgSetupData, org_desc: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={orgSetupData.industry} onValueChange={(value) => setOrgSetupData({...orgSetupData, industry: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="size">Company Size</Label>
                  <Select value={orgSetupData.size} onValueChange={(value) => setOrgSetupData({...orgSetupData, size: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10 employees">1-10 employees</SelectItem>
                      <SelectItem value="11-50 employees">11-50 employees</SelectItem>
                      <SelectItem value="51-200 employees">51-200 employees</SelectItem>
                      <SelectItem value="201-500 employees">201-500 employees</SelectItem>
                      <SelectItem value="500+ employees">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, State or Remote"
                  value={orgSetupData.location}
                  onChange={(e) => setOrgSetupData({...orgSetupData, location: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleOrgSetup}
                  disabled={!orgSetupData.org_name.trim() || showSuggestions}
                  className="flex-1"
                >
                  Create Organization
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowOrgSetup(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>



        {/* Organization Edit Dialog */}
        <Dialog open={showOrgEdit} onOpenChange={setShowOrgEdit}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Organization</DialogTitle>
              <DialogDescription>
                Update your organization's information and details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-org-name">Organization Name</Label>
                <Input
                  id="edit-org-name"
                  placeholder="Enter organization name"
                  value={orgEditData.name}
                  onChange={(e) => setOrgEditData({...orgEditData, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-org-industry">Industry</Label>
                <Select value={orgEditData.industry} onValueChange={(value) => setOrgEditData({...orgEditData, industry: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-org-description">Description</Label>
                <Textarea
                  id="edit-org-description"
                  placeholder="Brief description of your organization"
                  value={orgEditData.description}
                  onChange={(e) => setOrgEditData({...orgEditData, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={updateOrganization}
                  disabled={!orgEditData.name.trim()}
                  className="flex-1"
                >
                  Update Organization
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowOrgEdit(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Job Edit Dialog */}
        <Dialog open={showJobEdit} onOpenChange={setShowJobEdit}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Job</DialogTitle>
              <DialogDescription>
                Update your job posting's information and details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-job-title">Job Title</Label>
                <Input
                  id="edit-job-title"
                  placeholder="Enter job title"
                  value={editingJob?.job_title || ""}
                  onChange={(e) => setEditingJob({...editingJob, job_title: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-job-desc">Job Description</Label>
                <Textarea
                  id="edit-job-desc"
                  placeholder="Enter job description"
                  value={editingJob?.job_desc || ""}
                  onChange={(e) => setEditingJob({...editingJob, job_desc: e.target.value})}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-job-qualification">Qualification</Label>
                <Input
                  id="edit-job-qualification"
                  placeholder="Enter job qualification"
                  value={editingJob?.qualification || ""}
                  onChange={(e) => setEditingJob({...editingJob, qualification: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-job-location">Location</Label>
                <Input
                  id="edit-job-location"
                  placeholder="Enter job location"
                  value={editingJob?.location || ""}
                  onChange={(e) => setEditingJob({...editingJob, location: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-job-salary">Salary Range</Label>
                <Input
                  id="edit-job-salary"
                  placeholder="Enter salary range"
                  value={editingJob?.salary_range || ""}
                  onChange={(e) => setEditingJob({...editingJob, salary_range: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-job-type">Job Type</Label>
                <Select
                  value={editingJob?.job_type || "Full-time"}
                  onValueChange={(value) => setEditingJob({...editingJob, job_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-job-experience">Experience Level</Label>
                <Select
                  value={editingJob?.experience_level || "Entry"}
                  onValueChange={(value) => setEditingJob({...editingJob, experience_level: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entry">Entry</SelectItem>
                    <SelectItem value="Mid-level">Mid-level</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-job-skills">Skills Required</Label>
                <Input
                  id="edit-job-skills"
                  placeholder="Enter skills required (comma-separated)"
                  value={editingJob?.skills_required.join(", ") || ""}
                  onChange={(e) => setEditingJob({...editingJob, skills_required: e.target.value.split(", ").filter(Boolean)})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => setShowJobEdit(false)}
                  className="flex-1"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveJobEdit}
                  className="flex-1"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </Layout>
  );
};

export default HRDashboard;