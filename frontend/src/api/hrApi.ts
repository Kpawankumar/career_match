import axios from './axios';

const HR_API_BASE_URL = 'https://hr-management-1071432896229.asia-south2.run.app';

export interface Organization {
  org_id: number;
  name: string;
  industry: string;
  description: string;
}

export interface JobPosting {
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

export interface Application {
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

export interface HRUser {
  user_id: string;
  hr_name: string;
  hr_contact: string;
  hr_org_id: number;
  hr_orgs: string;
  created_at: string;
}

export interface Analytics {
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

// Organization Management
export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await axios.get(`${HR_API_BASE_URL}/organizations`);
  return response.data;
};

export const getOrganization = async (orgId: number): Promise<Organization> => {
  const response = await axios.get(`${HR_API_BASE_URL}/organizations/${orgId}`);
  return response.data;
};

export const createOrganization = async (orgData: Omit<Organization, 'org_id' | 'created_at'>): Promise<Organization> => {
  const response = await axios.post(`${HR_API_BASE_URL}/organizations`, orgData);
  return response.data;
};

export const updateOrganization = async (orgId: number, orgData: Omit<Organization, 'org_id' | 'created_at'>): Promise<Organization> => {
  const response = await axios.put(`${HR_API_BASE_URL}/organizations/${orgId}`, orgData);
  return response.data;
};

export const deleteOrganization = async (orgId: number): Promise<{ message: string }> => {
  const response = await axios.delete(`${HR_API_BASE_URL}/organizations/${orgId}`);
  return response.data;
};

export const searchOrganizations = async (query: string): Promise<Organization[]> => {
  const response = await axios.get(`${HR_API_BASE_URL}/organizations/search?query=${encodeURIComponent(query)}`);
  return response.data;
};

// Job Management
export const getJobsByOrganization = async (orgId: number): Promise<JobPosting[]> => {
  const response = await axios.get(`${HR_API_BASE_URL}/organizations/${orgId}/jobs`);
  return response.data;
};

export const createJob = async (orgId: number, jobData: Omit<JobPosting, 'job_id' | 'created_at' | 'applicant_count'>): Promise<JobPosting> => {
  const response = await axios.post(`${HR_API_BASE_URL}/organizations/${orgId}/jobs`, jobData);
  return response.data;
};

export const updateJobStatus = async (orgId: number, jobId: number, status: string): Promise<{ message: string }> => {
  const response = await axios.put(`${HR_API_BASE_URL}/organizations/${orgId}/jobs/${jobId}/status`, { status });
  return response.data;
};

// HR User Management
export const getHRUsersByOrganization = async (orgId: number): Promise<HRUser[]> => {
  const response = await axios.get(`${HR_API_BASE_URL}/organizations/${orgId}/hr-users`);
  return response.data;
};

export const createHRUser = async (orgId: number, userData: Omit<HRUser, 'created_at'>): Promise<HRUser> => {
  const response = await axios.post(`${HR_API_BASE_URL}/organizations/${orgId}/hr-users`, userData);
  return response.data;
};

export const getHRProfile = async (): Promise<any> => {
  const response = await axios.get(`${HR_API_BASE_URL}/hr-users/profile`);
  return response.data;
};

export const initializeHRUser = async (initData: any): Promise<any> => {
  const response = await axios.post(`${HR_API_BASE_URL}/hr-users/initialize`, initData);
  return response.data;
};

// Health Check
export const healthCheck = async (): Promise<any> => {
  const response = await axios.get(`${HR_API_BASE_URL}/health`);
  return response.data;
};

// Analytics
export const getOrganizationAnalytics = async (orgId: number): Promise<Analytics> => {
  const response = await axios.get(`${HR_API_BASE_URL}/organizations/${orgId}/analytics`);
  return response.data;
}; 