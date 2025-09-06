import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Layout from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { 
  MapPin, 
  Clock, 
  BookmarkIcon, 
  Briefcase,
  DollarSign,
  Users,
  Building,
  Calendar,
  Share2,
  ArrowLeft,
  CheckCircle,
  Loader2
} from "lucide-react";

interface JobData {
  job_id: number;
  job_title: string;
  job_desc: string;
  salary: string;
  job_location: string;
  experience: string;
  date_posted: string;
  work_type: string;
  org_name: string;
  apply_link: string;
  qualification: string;
  match_score?: number;
}

const JobDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`http://localhost:9002/get-job/${id}`);
        
        if (response.status === 200) {
          setJobData(response.data);
        } else {
          setError("Failed to fetch job details");
        }
      } catch (err: any) {
        console.error("Error fetching job data:", err);
        setError(err.response?.data?.detail || "Failed to fetch job details");
        toast({
          title: "Error",
          description: "Failed to load job details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchJobData();
  }, [id, toast]);

  const toggleSave = () => {
    setSaved(!saved);
    toast({
      title: saved ? "Job Removed" : "Job Saved",
      description: saved ? "Job removed from saved jobs" : "Job added to saved jobs",
    });
  };

  if (loading) {
    return (
      <Layout>
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading job details...</span>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  if (error || !jobData) {
    return (
      <Layout>
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
              <p className="text-muted-foreground mb-4">
                {error || "The job you're looking for doesn't exist or has been removed."}
              </p>
              <Link to="/dashboard/applicant">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  // Parse job description and requirements
  const description = jobData.job_desc || "No description available";
  const requirements = jobData.qualification ? jobData.qualification.split('\n').filter(item => item.trim()) : [];
  const experience = jobData.experience || "Not specified";

  return (
    <Layout>
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link to="/dashboard/applicant">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-lg">
                        {jobData.org_name?.substring(0, 2) || "JD"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-2xl font-bold mb-1">{jobData.job_title}</h1>
                      <p className="text-lg text-muted-foreground">{jobData.org_name || "Company Name Not Available"}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={toggleSave}
                      className={saved ? "text-primary" : ""}
                    >
                      <BookmarkIcon className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{jobData.job_location || "Location not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{jobData.work_type || "Type not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{jobData.salary || "Salary not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{jobData.date_posted ? new Date(jobData.date_posted).toLocaleDateString() : "Date not specified"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {jobData.match_score && (
                      <Badge variant="secondary">
                        {jobData.match_score.toFixed(1)}% Match
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {experience}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                </div>

                {requirements.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Requirements</h3>
                    <ul className="space-y-2">
                      {requirements.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Section */}
            <Card>
              <CardContent className="p-6">
                {jobData.apply_link ? (
                  <a href={jobData.apply_link} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full mb-4" size="lg">
                      Apply for this Job
                    </Button>
                  </a>
                ) : (
                  <Link to={`/jobs/${id}/apply`}>
                    <Button className="w-full mb-4" size="lg">
                      Apply for this Job
                    </Button>
                  </Link>
                )}
                
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Posted {jobData.date_posted ? new Date(jobData.date_posted).toLocaleDateString() : "Date not specified"}</span>
                  </div>
                  {jobData.match_score && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>{jobData.match_score.toFixed(1)}% match with your profile</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle>About {jobData.org_name || "Company"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {jobData.org_name?.substring(0, 2) || "CO"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{jobData.org_name || "Company Name"}</h3>
                    <p className="text-sm text-muted-foreground">Technology</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{jobData.job_location || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Work Type:</span>
                    <span>{jobData.work_type || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience:</span>
                    <span>{experience}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default JobDetail;