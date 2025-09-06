import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Features from "./pages/Features";
import About from "./pages/About";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import ApplicantDashboard from "./pages/ApplicantDashboard";
import HRDashboard from "./pages/HRDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import JobApplication from "./pages/JobApplication";
import ApplicantProfile from "./pages/ApplicantProfile";
import HRProfile from "./pages/HRProfile";
import ResumeUpload from "./pages/ResumeUpload";
import Applications from "./pages/Applications";
import SavedJobs from "./pages/SavedJobs";
import PostJob from "./pages/PostJob";
import Analytics from "./pages/Analytics";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import Feedback from "./pages/Feedback";
import Status from "./pages/Status";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import GDPR from "./pages/GDPR";
// New integrated service pages
import Services from "./pages/Services";
import JobPreferences from "./pages/JobPreferences";
import EnhancedResumePreview from "./pages/EnhancedResumePreview";
import ApplicationFlow from "./pages/ApplicationFlow";
import ApplicationConfirmation from "./pages/ApplicationConfirmation";
// New individual service pages
import JobMatcherService from "./pages/JobMatcherService";
import ResumeEnhancerService from "./pages/ResumeEnhancerService";
import CoverLetterGeneratorService from "./pages/CoverLetterGeneratorService";
// AI Job Posting
import AIJobPosting from "./pages/AIJobPosting";
import Chatbot from "./components/Chatbot/Chatbot"; // Import the Chatbot component

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/features" element={<Features />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Applicant Routes */}
          <Route path="/dashboard/applicant" element={<ApplicantDashboard />} />
          <Route path="/resume-upload" element={<ResumeUpload />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/jobs/:id/apply" element={<JobApplication />} />
          <Route path="/profile" element={<ApplicantProfile />} />
          
          {/* New Integrated Service Routes */}
          <Route path="/services" element={<Services />} />
          <Route path="/job-preferences" element={<JobPreferences />} />
          <Route path="/enhanced-resume-preview" element={<EnhancedResumePreview />} />
          <Route path="/application-flow" element={<ApplicationFlow />} />
          <Route path="/application-confirmation" element={<ApplicationConfirmation />} />
          
          {/* New Individual Service Routes */}
          <Route path="/job-matcher-service" element={<JobMatcherService />} />
          <Route path="/resume-enhancer-service" element={<ResumeEnhancerService />} />
          <Route path="/cover-letter-generator-service" element={<CoverLetterGeneratorService />} />
          
          {/* HR & Admin Routes */}
          <Route path="/dashboard/hr" element={<HRDashboard />} />
          <Route path="/hr-profile" element={<HRProfile />} />
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/ai-job-posting" element={<AIJobPosting />} />
          
          {/* New Placeholder Routes */}
          <Route path="/applications" element={<Applications />} />
          <Route path="/saved-jobs" element={<SavedJobs />} />
          <Route path="/post-job" element={<PostJob />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/status" element={<Status />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/gdpr" element={<GDPR />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      {/* Add Chatbot component to be available on all pages */}
      <Chatbot />
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;