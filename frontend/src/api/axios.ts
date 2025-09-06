import axios from "axios";

const createApiClient = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
    timeout: 30000, // Reduced timeout to 30 seconds
  });

  instance.interceptors.request.use(
    (config) => {
      // Add JWT token if available
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      console.log(`Request to ${baseURL}${config.url}:`, config);
      return config;
    },
    (error) => {
      console.error(`Request error to ${baseURL}:`, error);
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      console.log(`Response from ${baseURL}${response.config.url}:`, response);
      return response;
    },
    (error) => {
      console.error(
        `Response error from ${baseURL}:`,
        error.response?.data || error.message
      );
      return Promise.reject(error);
    }
  );

  return instance;
};

export const authService = createApiClient(
  import.meta.env.VITE_API_URL_AUTH || "https://login-system-1071432896229.asia-south2.run.app"
);

export const resumeService = createApiClient(
  import.meta.env.VITE_API_URL_RESUME || "https://auto-fill-service-1071432896229.asia-south2.run.app"
);

export const jobMatcherService = createApiClient(
  import.meta.env.VITE_API_URL_MATCHER || "https://job-matching-1071432896229.asia-south2.run.app"
);

// Create a special axios instance for job matcher with longer timeout
export const jobMatcherServiceWithLongTimeout = axios.create({
  baseURL: import.meta.env.VITE_API_URL_MATCHER || "https://job-matching-1071432896229.asia-south2.run.app",
  timeout: 120000, // 2 minutes timeout for job matching
});

// New service clients for integrated components
export const resumeEnhancerService = createApiClient(
  import.meta.env.VITE_API_URL_RESUME_ENHANCER || "https://resume-enhancer-ab-1071432896229.asia-south2.run.app"
);

// Create a special axios instance for resume enhancer with longer timeout
export const resumeEnhancerServiceWithLongTimeout = axios.create({
  baseURL: import.meta.env.VITE_API_URL_RESUME_ENHANCER || "https://resume-enhancer-ab-1071432896229.asia-south2.run.app",
  timeout: 120000, // 2 minutes timeout for resume enhancement
});

export const coverLetterService = createApiClient(
  import.meta.env.VITE_API_URL_COVER_LETTER || "https://cover-letter-generator-1071432896229.asia-south2.run.app"
);

// Create a special axios instance for cover letter service with longer timeout
export const coverLetterServiceWithLongTimeout = axios.create({
  baseURL: import.meta.env.VITE_API_URL_COVER_LETTER || "https://cover-letter-generator-1071432896229.asia-south2.run.app",
  timeout: 120000, // 2 minutes timeout for cover letter generation
});

export const emailAutomationService = createApiClient(
  import.meta.env.VITE_API_URL_EMAIL_AUTOMATION || "https://email-job-matching-1071432896229.asia-south2.run.app"
);

export const analyticsService = createApiClient(
  import.meta.env.VITE_API_URL_ANALYTICS || "https://dashboard-analytics-1071432896229.asia-south2.run.app"
);

export const ragService = createApiClient(
  import.meta.env.VITE_API_URL_RAG || "https://rag-job-1071432896229.asia-south2.run.app"
);

export const managementService = createApiClient(
  import.meta.env.VITE_API_URL_MANAGEMENT || "https://hr-management-1071432896229.asia-south2.run.app"
);

export const generatorService = createApiClient(
  import.meta.env.VITE_API_URL_GENERATOR || "https://job-generator-1071432896229.asia-south2.run.app"
);

export default authService;