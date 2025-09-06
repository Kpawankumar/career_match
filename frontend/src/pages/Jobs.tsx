import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { 
  Search, 
  MapPin, 
  Clock, 
  BookmarkIcon, 
  Briefcase,
  DollarSign,
  Filter,
  SlidersHorizontal
} from "lucide-react";

const Jobs = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");

  const jobListings = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      company: "Tech Corp",
      location: "Remote",
      type: "Full-time",
      salary: "$90k - $120k",
      posted: "2 days ago",
      saved: false,
      description: "We're looking for an experienced Frontend Developer to join our team and build amazing user experiences.",
      skills: ["React", "TypeScript", "CSS", "JavaScript"],
      level: "Senior"
    },
    {
      id: 2,
      title: "UX/UI Designer",
      company: "Design Studio",
      location: "New York, NY",
      type: "Contract",
      salary: "$70k - $90k",
      posted: "1 week ago",
      saved: true,
      description: "Join our creative team to design beautiful and intuitive user interfaces for web and mobile applications.",
      skills: ["Figma", "Sketch", "Adobe XD", "Prototyping"],
      level: "Mid-level"
    },
    {
      id: 3,
      title: "Full Stack Engineer",
      company: "Startup Inc",
      location: "San Francisco, CA",
      type: "Full-time",
      salary: "$100k - $140k",
      posted: "3 days ago",
      saved: false,
      description: "Build scalable web applications using modern technologies in a fast-paced startup environment.",
      skills: ["React", "Node.js", "PostgreSQL", "AWS"],
      level: "Senior"
    },
    {
      id: 4,
      title: "Junior React Developer",
      company: "Web Solutions",
      location: "Austin, TX",
      type: "Full-time",
      salary: "$50k - $70k",
      posted: "5 days ago",
      saved: false,
      description: "Perfect opportunity for a junior developer to grow their React skills in a supportive team environment.",
      skills: ["React", "JavaScript", "HTML", "CSS"],
      level: "Junior"
    },
    {
      id: 5,
      title: "Product Manager",
      company: "Innovation Labs",
      location: "Boston, MA",
      type: "Full-time",
      salary: "$110k - $130k",
      posted: "1 day ago",
      saved: true,
      description: "Lead product strategy and work with cross-functional teams to deliver exceptional user experiences.",
      skills: ["Product Strategy", "Analytics", "Agile", "Leadership"],
      level: "Senior"
    },
    {
      id: 6,
      title: "DevOps Engineer",
      company: "Cloud Systems",
      location: "Remote",
      type: "Full-time",
      salary: "$95k - $125k",
      posted: "4 days ago",
      saved: false,
      description: "Manage cloud infrastructure and implement CI/CD pipelines for a growing tech company.",
      skills: ["AWS", "Docker", "Kubernetes", "Jenkins"],
      level: "Mid-level"
    }
  ];

  const toggleSaveJob = (jobId: number) => {
    // In a real app, this would make an API call
    console.log(`Toggling save for job ${jobId}`);
  };

  return (
    <Layout>
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Your Dream Job</h1>
          <p className="text-muted-foreground">Discover opportunities that match your skills and interests</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search jobs, companies, or keywords..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="new-york">New York</SelectItem>
                  <SelectItem value="san-francisco">San Francisco</SelectItem>
                  <SelectItem value="austin">Austin</SelectItem>
                  <SelectItem value="boston">Boston</SelectItem>
                </SelectContent>
              </Select>

              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>

              <Select value={salaryFilter} onValueChange={setSalaryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Salary Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-50k">$0 - $50k</SelectItem>
                  <SelectItem value="50k-75k">$50k - $75k</SelectItem>
                  <SelectItem value="75k-100k">$75k - $100k</SelectItem>
                  <SelectItem value="100k+">$100k+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {jobListings.length} jobs found
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Job Listings */}
        <div className="space-y-6">
          {jobListings.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{job.company.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link to={`/jobs/${job.id}`}>
                          <h3 className="text-xl font-semibold hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                        </Link>
                        <p className="text-muted-foreground">{job.company}</p>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {job.description}
                    </p>
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {job.salary}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {job.posted}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {job.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 3 && (
                          <Badge variant="secondary">
                            +{job.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                      
                      <Badge variant="outline">
                        {job.level}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-6">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleSaveJob(job.id)}
                      className={job.saved ? "text-primary" : ""}
                    >
                      <BookmarkIcon className={`h-4 w-4 ${job.saved ? "fill-current" : ""}`} />
                    </Button>
                    <Link to={`/jobs/${job.id}/apply`}>
                      <Button size="sm" className="w-full">
                        Apply Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            Load More Jobs
          </Button>
        </div>
      </main>
    </Layout>
  );
};

export default Jobs;