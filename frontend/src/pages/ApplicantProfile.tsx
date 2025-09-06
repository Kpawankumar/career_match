import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Layout from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  Link as LinkIcon,
  Edit,
  Save,
  Plus,
  X,
  Upload,
  Download,
  Trash,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";

function ensureIds(array) {
  return (array || []).map(item =>
    item && item.id ? item : { ...item, id: Date.now() + Math.random() }
  );
}

const ApplicantProfile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [editingExperienceId, setEditingExperienceId] = useState(null);
  const [editingEducationId, setEditingEducationId] = useState(null);
  const [editingCertificationId, setEditingCertificationId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [newExperience, setNewExperience] = useState({ title: "", company: "", period: "", description: "" });
  const [newEducation, setNewEducation] = useState({ degree: "", school: "", year: "", gpa: "" });
  const [newCertification, setNewCertification] = useState({ name: "", issuer: "", year: "", link: "" });
  const [newProject, setNewProject] = useState({ title: "", description: "", link: "" });
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [tab, setTab] = useState("overview");
  const [hasUploadedResume, setHasUploadedResume] = useState(false);

  const { user } = useAuth ? useAuth() : { user: { id: "1" } }; // fallback if useAuth is not available

  const [profileData, setProfileData] = useState<any>({
    // Basic Info
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    location: "New York, NY",
    bio: "Passionate frontend developer with 5+ years of experience creating user-friendly web applications using React and modern JavaScript technologies.",
    summary: "Passionate frontend developer with 5+ years of experience creating user-friendly web applications using React and modern JavaScript technologies.",
    
    // Professional Info
    currentTitle: "Senior Frontend Developer",
    currentCompany: "Tech Solutions Inc.",
    experience: "5+ years",
    expectedSalary: "$90k - $120k",
    availability: "2 weeks notice",
    
    // Contact & Links
    linkedin: "https://linkedin.com/in/johndoe",
    portfolio: "https://johndoe.dev",
    github: "https://github.com/johndoe",
    
    // Skills
    skills: ["React", "TypeScript", "JavaScript", "CSS", "HTML", "Node.js", "Git", "Figma"],
    
    // Education
    education: [
      {
        id: 1,
        degree: "Bachelor of Science in Computer Science",
        school: "University of Technology",
        year: "2015-2019",
        gpa: "3.8"
      }
    ],
    qualification: [],
    
    // Experience
    workExperience: [
      {
        id: 1,
        title: "Senior Frontend Developer",
        company: "Tech Solutions Inc.",
        period: "2022 - Present",
        description: "Lead frontend development for multiple web applications using React and TypeScript. Collaborated with design and backend teams to deliver high-quality user experiences."
      },
      {
        id: 2,
        title: "Frontend Developer",
        company: "Digital Agency Co.",
        period: "2020 - 2022",
        description: "Developed responsive websites and web applications for various clients. Specialized in React development and modern CSS frameworks."
      }
    ],
    
    // Certifications
    certifications: [
      {
        id: 1,
        name: "AWS Certified Developer",
        issuer: "Amazon Web Services",
        year: "2023"
      },
      {
        id: 2,
        name: "React Professional Certification",
        issuer: "Meta",
        year: "2022"
      }
    ],
    project: ["Project 1", "Project 2", "Project 3"]
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`https://auto-fill-service-1071432896229.asia-south2.run.app/get-profile/?user_id=${user?.id || "1"}`);
        const data: any = response.data;
        const updatedProfileData = {
          ...profileData,
          name: data.name || profileData.name || "",
          firstName: (data.name || profileData.name || "").split(" ")[0] || "",
          lastName: (data.name || profileData.name || "").split(" ").slice(1).join(" ") || "",
          email: data.email || "",
          phone: data.phone || "",
          location: data.location || "",
          summary: data.summary || profileData.summary,
          bio: data.summary || profileData.bio,
          currentTitle: data.currentTitle || profileData.currentTitle,
          currentCompany: data.currentCompany || profileData.currentCompany,
          experience: data.experience || [],
          workExperience: ensureIds(data.experience),
          expectedSalary: data.expectedSalary || profileData.expectedSalary,
          availability: data.availability || profileData.availability,
          links: Array.isArray(data.links) ? data.links : [],
          skills: Array.isArray(data.skills) ? data.skills : [],
          education: ensureIds(data.education),
          certifications: ensureIds(data.achievements),
          projects: ensureIds(data.projects),
        };
        
        setProfileData(updatedProfileData);
        
        // Also save to sessionStorage for individual service access
        // Using sessionStorage for better security (clears when browser closes)
        sessionStorage.setItem('userProfile', JSON.stringify({
          firstName: updatedProfileData.firstName,
          lastName: updatedProfileData.lastName,
          name: `${updatedProfileData.firstName} ${updatedProfileData.lastName}`.trim(),
          email: updatedProfileData.email,
          phone: updatedProfileData.phone,
          location: updatedProfileData.location,
          summary: updatedProfileData.summary,
          currentTitle: updatedProfileData.currentTitle,
          currentCompany: updatedProfileData.currentCompany,
          skills: updatedProfileData.skills,
          experience: updatedProfileData.workExperience,
          education: updatedProfileData.education,
          projects: updatedProfileData.projects,
          links: updatedProfileData.links
        }));
        
        console.log('Profile loaded and saved to sessionStorage:', sessionStorage.getItem('userProfile'));
        
      } catch (error) {
        toast({
          title: "Failed to load profile",
          description: "Could not fetch profile from server.",
          variant: "destructive"
        });
      }
    };
    fetchProfile();
    // Check if user has uploaded a resume
    const hasResume = localStorage.getItem('hasUploadedResume') === 'true';
    console.log('hasUploadedResume from localStorage:', hasResume);
    setHasUploadedResume(hasResume);
  }, [user?.id]);

  // Debug useEffect to log state changes
  useEffect(() => {
    console.log('hasUploadedResume state changed to:', hasUploadedResume);
  }, [hasUploadedResume]);

  const handleInputChange = (field: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to save profile to database
  const saveToDatabase = async (updatedProfileData: any) => {
    try {
      const payload = {
        user_id: user?.id || "1",
        name: `${updatedProfileData.firstName} ${updatedProfileData.lastName}`.trim() || updatedProfileData.name || "",
        app_name: `${updatedProfileData.firstName} ${updatedProfileData.lastName}`.trim() || updatedProfileData.name || "",
        email: updatedProfileData.email,
        phone: updatedProfileData.phone,
        location: updatedProfileData.location,
        summary: updatedProfileData.summary,
        currentTitle: updatedProfileData.currentTitle,
        currentCompany: updatedProfileData.currentCompany,
        expectedSalary: updatedProfileData.expectedSalary,
        availability: updatedProfileData.availability,
        skills: Array.isArray(updatedProfileData.skills) ? updatedProfileData.skills.join("\n") : updatedProfileData.skills,
        experience: updatedProfileData.workExperience,
        education: updatedProfileData.education,
        achievements: updatedProfileData.certifications,
        projects: updatedProfileData.projects,
        links: Array.isArray(updatedProfileData.links) ? updatedProfileData.links : [],
      };
      
      // Save to database
      await axios.post("https://auto-fill-service-1071432896229.asia-south2.run.app/update-profile/", payload);
      
      // Also save to localStorage for individual service access
      // Using sessionStorage for better security (clears when browser closes)
      sessionStorage.setItem('userProfile', JSON.stringify({
        firstName: updatedProfileData.firstName,
        lastName: updatedProfileData.lastName,
        name: `${updatedProfileData.firstName} ${updatedProfileData.lastName}`.trim(),
        email: updatedProfileData.email,
        phone: updatedProfileData.phone,
        location: updatedProfileData.location,
        summary: updatedProfileData.summary,
        currentTitle: updatedProfileData.currentTitle,
        currentCompany: updatedProfileData.currentCompany,
        skills: updatedProfileData.skills,
        experience: updatedProfileData.workExperience,
        education: updatedProfileData.education,
        projects: updatedProfileData.projects,
        links: updatedProfileData.links
      }));
      
      console.log('Profile saved to sessionStorage:', sessionStorage.getItem('userProfile'));
      
      return true;
    } catch (error) {
      console.error('Database save error:', error);
      toast({
        title: "Save failed",
        description: "Could not save changes to database. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleSave = async () => {
    setIsEditing(false);
    const success = await saveToDatabase(profileData);
    if (success) {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    }
  };

  const addSkill = async () => {
    if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
      const updatedProfileData = {
        ...profileData,
        skills: [...profileData.skills, newSkill.trim()]
      };
      setProfileData(updatedProfileData);
      setNewSkill("");
      await saveToDatabase(updatedProfileData);
    }
  };

  const removeSkill = async (skillToRemove: string) => {
    const updatedProfileData = {
      ...profileData,
      skills: profileData.skills.filter(skill => skill !== skillToRemove)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
  };



  // Edit Experience
  const handleEditExperience = async (id, field, value) => {
    const updatedProfileData = {
      ...profileData,
      workExperience: profileData.workExperience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
  };

  // Edit Education
  const handleEditEducation = async (id, field, value) => {
    const updatedProfileData = {
      ...profileData,
      education: profileData.education.map((edu, idx) =>
        (edu.id === id || idx === id) ? { ...edu, [field]: value } : edu
      )
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
  };

  // Delete Experience
  const handleDeleteExperience = async (id) => {
    const updatedProfileData = {
      ...profileData,
      workExperience: profileData.workExperience.filter(exp => exp.id !== id)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
    toast({ title: "Experience deleted" });
  };

  // Delete Education
  const handleDeleteEducation = async (id) => {
    const updatedProfileData = {
      ...profileData,
      education: profileData.education.filter(edu => edu.id !== id)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
    toast({ title: "Education deleted" });
  };

  // Add Experience with validation
  const handleAddExperience = async () => {
    if (!newExperience.title || !newExperience.company) {
      toast({ title: "Title and Company are required", variant: "destructive" });
      return;
    }
    const updatedProfileData = {
      ...profileData,
      workExperience: [
        ...profileData.workExperience,
        { ...newExperience, id: Date.now() }
      ]
    };
    setProfileData(updatedProfileData);
    setNewExperience({ title: "", company: "", period: "", description: "" });
    setShowExperienceForm(false);
    await saveToDatabase(updatedProfileData);
    toast({ title: "Experience added" });
  };

  // Add Education with validation
  const handleAddEducation = async () => {
    if (!newEducation.degree || !newEducation.school) {
      toast({ title: "Degree and School are required", variant: "destructive" });
      return;
    }
    const updatedProfileData = {
      ...profileData,
      education: [
        ...profileData.education,
        { ...newEducation, id: Date.now() }
      ]
    };
    setProfileData(updatedProfileData);
    setNewEducation({ degree: "", school: "", year: "", gpa: "" });
    setShowEducationForm(false);
    await saveToDatabase(updatedProfileData);
    toast({ title: "Education added" });
  };

  // Add project handlers
  const addProject = async () => {
    if (newProject.title.trim() && !profileData.projects.some((p: any) => p.title === newProject.title.trim())) {
      const updatedProfileData = {
        ...profileData,
        projects: [...(profileData.projects || []), { ...newProject, title: newProject.title.trim() }]
      };
      setProfileData(updatedProfileData);
      setNewProject({ title: "", description: "", link: "" });
      await saveToDatabase(updatedProfileData);
    }
  };
  const removeProject = async (projectToRemove: any) => {
    const updatedProfileData = {
      ...profileData,
      projects: (profileData.projects || []).filter((p: any) => p.title !== projectToRemove.title)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
  };
  // Add link handlers
  const addLink = async () => {
    if (newLink.trim() && !profileData.links.includes(newLink.trim())) {
      const updatedProfileData = {
        ...profileData,
        links: [...(profileData.links || []), newLink.trim()]
      };
      setProfileData(updatedProfileData);
      setNewLink("");
      await saveToDatabase(updatedProfileData);
    }
  };
  const removeLink = async (linkToRemove: string) => {
    const updatedProfileData = {
      ...profileData,
      links: (profileData.links || []).filter((l: string) => l !== linkToRemove)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
  };

  // Edit Certification
  const handleEditCertification = async (id, field, value) => {
    const updatedProfileData = {
      ...profileData,
      certifications: profileData.certifications.map(cert => cert.id === id ? { ...cert, [field]: value } : cert)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
  };

  // Delete Certification
  const handleDeleteCertification = async (id) => {
    const updatedProfileData = {
      ...profileData,
      certifications: profileData.certifications.filter(cert => cert.id !== id)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
    toast({ title: "Certification deleted" });
  };

  // Add Certification
  const handleAddCertification = async () => {
    if (newCertification.name.trim() && newCertification.issuer.trim()) {
      const updatedProfileData = {
        ...profileData,
        certifications: [
          ...profileData.certifications,
          { ...newCertification, id: Date.now() }
        ]
      };
      setProfileData(updatedProfileData);
      setNewCertification({ name: "", issuer: "", year: "", link: "" });
      setShowCertificationForm(false);
      await saveToDatabase(updatedProfileData);
      toast({ title: "Certification added" });
    }
  };

  // Edit Project
  const handleEditProject = async (id, field, value) => {
    const updatedProfileData = {
      ...profileData,
      projects: profileData.projects.map(project => project.id === id ? { ...project, [field]: value } : project)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
  };

  // Delete Project
  const handleDeleteProject = async (id) => {
    const updatedProfileData = {
      ...profileData,
      projects: profileData.projects.filter(project => project.id !== id)
    };
    setProfileData(updatedProfileData);
    await saveToDatabase(updatedProfileData);
    toast({ title: "Project deleted" });
  };

  // Add Project (enhanced)
  const handleAddProject = async () => {
    if (newProject.title.trim() && newProject.description.trim()) {
      const updatedProfileData = {
        ...profileData,
        projects: [
          ...(profileData.projects || []),
          { ...newProject, id: Date.now() }
        ]
      };
      setProfileData(updatedProfileData);
      setNewProject({ title: "", description: "", link: "" });
      setShowProjectForm(false);
      await saveToDatabase(updatedProfileData);
      toast({ title: "Project added" });
    }
  };

  const educationArray = Array.isArray(profileData.education) && profileData.education.length > 0
    ? profileData.education
    : (Array.isArray(profileData.qualification) ? profileData.qualification : []);

  return (
    <Layout>
      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-xl">
                      {profileData.firstName[0]}{profileData.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button size="sm" variant="outline" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 ">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">
                      {profileData.firstName} {profileData.lastName}
                    </h1>
                    <Badge variant="secondary">
                      {Array.isArray(profileData.workExperience) ? `${profileData.workExperience.length} experience${profileData.workExperience.length !== 1 ? 's' : ''}` : ""}
                    </Badge>
                  </div>
                  
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profileData.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {profileData.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {profileData.phone}
                    </span>
                  </div>
                  
                  <p className="text-muted-foreground max-w-2xl">
                    {profileData.summary || profileData.bio}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => navigate('/resume-upload')}>
                  Upload Resume
                </Button>
                <Button variant="outline" onClick={() => navigate('/job-preferences')}>
                  Next: Job Preferences
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab} defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            
            {/* Experience Tab with Tooltip */}
    <div className="relative group">
      <TabsTrigger value="experience">Experience</TabsTrigger>
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 
                      bg-black text-white text-xs px-2 py-1 rounded 
                      opacity-0 group-hover:opacity-100 
                      transition-opacity whitespace-nowrap z-10">
        Manage your job experiences like internships, freelance work, and full-time positions.
      </div>
    </div>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="certifications">Certifications</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            
             {/* Experience Tab with Tooltip */}
    <div className="relative group">
     <TabsTrigger value="projects">Projects</TabsTrigger>
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 
                      bg-black text-white text-xs px-2 py-1 rounded 
                      opacity-0 group-hover:opacity-100 
                      transition-opacity whitespace-nowrap z-10">
        Manage your job projects, showcasing your work and contributions.
      </div>
    </div>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Professional Summary */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={profileData.summary}
                        onChange={(e) => handleInputChange("summary", e.target.value)}
                        rows={4}
                        placeholder="Tell us about your professional background..."
                      />
                    ) : (
                      <p className="text-muted-foreground leading-relaxed">
                        {profileData.summary || profileData.bio}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                    <CardTitle>Recent Work Experience</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setTab("experience")}
                      >
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Array.isArray(profileData.workExperience) && profileData.workExperience.length > 0 ? (
                      profileData.workExperience.slice(0, 2).map((job, idx) => (
                        <div key={job.id || idx} className="border rounded-lg p-4 mb-2">
                          <div><strong>Title:</strong> {job.title}</div>
                          <div><strong>Company:</strong> {job.company}</div>
                          <div><strong>Period:</strong> {job.period}</div>
                          <div><strong>Description:</strong> {job.description}</div>
                        </div>
                      ))
                    ) : (
                      <div>No experience found.</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Side Panel */}
              <div className="space-y-6">
                {/* Links */}
                <Card>
                  <CardHeader>
                    <CardTitle>Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                        placeholder="Add a new link (URL)"
                        value={newLink}
                        onChange={(e) => setNewLink(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addLink()}
                      />
                      <Button onClick={addLink}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(profileData.links || []).length > 0 ? (
                      <div className="space-y-2">
                        {(profileData.links || []).map((link: string, idx: number) => (
                          <div key={`link-${idx}-${link}`} className="flex items-center gap-2">
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {link}
                            </a>
                            <Button size="icon" variant="ghost" onClick={() => removeLink(link)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      ) : (
                      <div>No links found.</div>
                    )}
                  </CardContent>
                </Card>

                {/* Education Preview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Education</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setTab("education")}
                      >
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {educationArray.length > 0 ? (
                      <div className="space-y-2">
                        {educationArray.slice(0, 1).map((edu, idx) => (
                          <div key={edu.id || idx} className="text-sm">
                            <div className="font-medium">{edu.degree}</div>
                            <div className="text-muted-foreground">{edu.school}</div>
                            </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No education found.</div>
                    )}
                  </CardContent>
                </Card>

                {/* Skills Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profileData.skills.slice(0, 6).map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                      {profileData.skills.length > 6 && (
                        <Badge variant="outline">
                          +{profileData.skills.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Certifications Preview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Certifications</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setTab("certifications")}
                      >
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {profileData.certifications.length > 0 ? (
                      <div className="space-y-2">
                        {profileData.certifications.slice(0, 2).map((cert: any, idx: number) => (
                          <div key={cert.id || idx} className="text-sm">
                            <div className="font-medium">{cert.name}</div>
                            <div className="text-muted-foreground">{cert.issuer} • {cert.year}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No certifications found.</div>
                    )}
                  </CardContent>
                </Card>

                {/* Projects Preview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Projects</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setTab("projects")}
                      >
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(profileData.projects || []).length > 0 ? (
                      <div className="space-y-3">
                        {(profileData.projects || []).slice(0, 2).map((project: any, idx: number) => (
                          <div key={`project-preview-${idx}-${project.title || project.id}`} className="text-sm">
                            <div className="font-medium">{project.title}</div>
                            {project.description && (
                              <div className="text-muted-foreground text-xs mt-1 line-clamp-2">
                                {project.description}
                              </div>
                            )}
                            {project.link && (
                              <a 
                                href={project.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-xs block mt-1"
                              >
                                View Project
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No projects found.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="experience" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Work Experience</CardTitle>
                  <Button size="sm" onClick={() => setShowExperienceForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Experience
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* New Experience Form */}
                {showExperienceForm && (
                  <div className="border rounded-lg p-4 mb-4 bg-muted/20">
                    <h4 className="font-medium mb-3">Add New Experience</h4>
                    <div className="flex flex-col gap-3">
                      <Input value={newExperience.title} onChange={e => setNewExperience({ ...newExperience, title: e.target.value })} placeholder="Job Title*" />
                  <Input value={newExperience.company} onChange={e => setNewExperience({ ...newExperience, company: e.target.value })} placeholder="Company*" />
                      <Input value={newExperience.period} onChange={e => setNewExperience({ ...newExperience, period: e.target.value })} placeholder="Period (e.g., 2020 - 2022)" />
                      <Textarea value={newExperience.description} onChange={e => setNewExperience({ ...newExperience, description: e.target.value })} placeholder="Job Description" rows={3} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddExperience}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Experience
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setShowExperienceForm(false);
                          setNewExperience({ title: "", company: "", period: "", description: "" });
                        }}>
                          Cancel
                        </Button>
                </div>
                    </div>
                  </div>
                )}
                {profileData.workExperience.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4 mb-2">
                    {editingExperienceId === job.id ? (
                      <>
                        <Input value={job.title} onChange={e => handleEditExperience(job.id, "title", e.target.value)} placeholder="Title*" />
                        <Input value={job.company} onChange={e => handleEditExperience(job.id, "company", e.target.value)} placeholder="Company*" />
                        <Input value={job.period} onChange={e => handleEditExperience(job.id, "period", e.target.value)} placeholder="Period" />
                        <Textarea value={job.description} onChange={e => handleEditExperience(job.id, "description", e.target.value)} placeholder="Description" />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => setEditingExperienceId(null)}>Save</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteExperience(job.id)}><Trash className="h-4 w-4" /></Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                              <Briefcase className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{job.title}</h3>
                              <p className="text-muted-foreground">{job.company}</p>
                              <p className="text-sm text-muted-foreground">{job.period}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingExperienceId(job.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteExperience(job.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{job.description}</p>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="education" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Education</CardTitle>
                  <Button size="sm" onClick={() => setShowEducationForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Education
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* New Education Form */}
                {showEducationForm && (
                  <div className="border rounded-lg p-4 mb-4 bg-muted/20">
                    <h4 className="font-medium mb-3">Add New Education</h4>
                    <div className="flex flex-col gap-3">
                  <Input value={newEducation.degree} onChange={e => setNewEducation({ ...newEducation, degree: e.target.value })} placeholder="Degree*" />
                      <Input value={newEducation.school} onChange={e => setNewEducation({ ...newEducation, school: e.target.value })} placeholder="School/University*" />
                      <Input value={newEducation.year} onChange={e => setNewEducation({ ...newEducation, year: e.target.value })} placeholder="Year (e.g., 2015-2019)" />
                      <Input value={newEducation.gpa} onChange={e => setNewEducation({ ...newEducation, gpa: e.target.value })} placeholder="GPA (optional)" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddEducation}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Education
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setShowEducationForm(false);
                          setNewEducation({ degree: "", school: "", year: "", gpa: "" });
                        }}>
                          Cancel
                        </Button>
                </div>
                    </div>
                  </div>
                )}
                {educationArray.length > 0 ? (
                  educationArray.map((edu, idx) => (
                    <div key={edu.id} className="border rounded-lg p-4 mb-2">
                      {editingEducationId === edu.id ? (
                        <>
                          <Input value={edu.degree} onChange={e => handleEditEducation(edu.id, "degree", e.target.value)} placeholder="Degree*" />
                          <Input value={edu.school} onChange={e => handleEditEducation(edu.id, "school", e.target.value)} placeholder="School/University*" />
                          <Input value={edu.year} onChange={e => handleEditEducation(edu.id, "year", e.target.value)} placeholder="Year (e.g., 2015-2019)" />
                          <Input value={edu.gpa} onChange={e => handleEditEducation(edu.id, "gpa", e.target.value)} placeholder="GPA (optional)" />
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => { setEditingEducationId(null); handleSave(); }}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingEducationId(null)}>Cancel</Button>
                          </div>
                        </>
                      ) : (
                        <>
                      <div><strong>Degree:</strong> {edu.degree}</div>
                      <div><strong>School:</strong> {edu.school}</div>
                      <div><strong>Year:</strong> {edu.year}</div>
                      <div><strong>GPA:</strong> {edu.gpa}</div>
                          <div className="flex gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingEducationId(edu.id)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteEducation(edu.id)}><Trash className="h-4 w-4" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div>No education found.</div>
                )}


              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certifications" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Certifications</CardTitle>
                  <Button size="sm" onClick={() => setShowCertificationForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Certification
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* New Certification Form */}
                {showCertificationForm && (
                  <div className="border rounded-lg p-4 mb-4 bg-muted/20">
                    <h4 className="font-medium mb-3">Add New Certification</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input 
                        value={newCertification.name} 
                        onChange={e => setNewCertification({ ...newCertification, name: e.target.value })} 
                        placeholder="Certification Name*" 
                      />
                      <Input 
                        value={newCertification.issuer} 
                        onChange={e => setNewCertification({ ...newCertification, issuer: e.target.value })} 
                        placeholder="Issuing Organization*" 
                      />
                      <Input 
                        value={newCertification.year} 
                        onChange={e => setNewCertification({ ...newCertification, year: e.target.value })} 
                        placeholder="Year (e.g., 2023)" 
                      />
                      <Input 
                        value={newCertification.link} 
                        onChange={e => setNewCertification({ ...newCertification, link: e.target.value })} 
                        placeholder="Verification Link (optional)" 
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={handleAddCertification}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Certification
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setShowCertificationForm(false);
                        setNewCertification({ name: "", issuer: "", year: "", link: "" });
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Certifications List */}
                <div className="space-y-4">
                  {profileData.certifications.map((cert) => (
                    <div key={cert.id} className="border rounded-lg p-4">
                      {editingCertificationId === cert.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input 
                              value={cert.name} 
                              onChange={e => handleEditCertification(cert.id, "name", e.target.value)} 
                              placeholder="Certification Name" 
                            />
                            <Input 
                              value={cert.issuer} 
                              onChange={e => handleEditCertification(cert.id, "issuer", e.target.value)} 
                              placeholder="Issuing Organization" 
                            />
                            <Input 
                              value={cert.year} 
                              onChange={e => handleEditCertification(cert.id, "year", e.target.value)} 
                              placeholder="Year" 
                            />
                            <Input 
                              value={cert.link || ""} 
                              onChange={e => handleEditCertification(cert.id, "link", e.target.value)} 
                              placeholder="Verification Link" 
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setEditingCertificationId(null)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCertificationId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                              <Award className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{cert.name}</h4>
                              <p className="text-muted-foreground">{cert.issuer}</p>
                              <p className="text-sm text-muted-foreground">{cert.year}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setEditingCertificationId(cert.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteCertification(cert.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {profileData.certifications.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No certifications added yet. Add your first certification above.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Projects</CardTitle>
                  <Button size="sm" onClick={() => setShowProjectForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* New Project Form */}
                {showProjectForm && (
                  <div className="border rounded-lg p-4 mb-4 bg-muted/20">
                    <h4 className="font-medium mb-3">Add New Project</h4>
                    <div className="space-y-3">
                      <Input
                        placeholder="Project Title*"
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      />
                      <Input
                        placeholder="Project Link (optional)"
                        value={newProject.link}
                        onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
                      />
                      <Textarea
                        placeholder="Project Description*"
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleAddProject} disabled={!newProject.title.trim() || !newProject.description.trim()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Project
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowProjectForm(false);
                            setNewProject({ title: "", description: "", link: "" });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Projects List */}
                <div className="space-y-4">
                  {(profileData.projects || []).map((project: any, idx: number) => (
                    <div key={project.id} className="border rounded-lg p-4">
                      {editingProjectId === project.id ? (
                        <div className="space-y-3">
                          <Input
                            value={project.title}
                            onChange={e => handleEditProject(project.id, "title", e.target.value)}
                            placeholder="Project Title"
                          />
                          <Input
                            value={project.link || ""}
                            onChange={e => handleEditProject(project.id, "link", e.target.value)}
                            placeholder="Project Link"
                          />
                          <Textarea
                            value={project.description}
                            onChange={e => handleEditProject(project.id, "description", e.target.value)}
                            placeholder="Project Description"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setEditingProjectId(null)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingProjectId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{project.title}</h4>
                            {project.description && (
                              <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                            )}
                            {project.link && (
                              <a 
                                href={project.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline mt-1 block"
                              >
                                {project.link}
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setEditingProjectId(project.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {(profileData.projects || []).length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No projects added yet. Add your first project above.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Skills & Expertise</CardTitle>
                <CardDescription>Manage your skills to help employers find you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new skill"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    />
                    <Button onClick={addSkill}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name || `${profileData.firstName} ${profileData.lastName}`}
                      onChange={(e) => {
                        const name = e.target.value;
                        setProfileData(prev => ({
                          ...prev,
                          name,
                          firstName: name.split(" ")[0] || "",
                          lastName: name.split(" ").slice(1).join(" ") || ""
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </Layout>
  );
};

// Helper to map backend fields to frontend form fields
function mapParsedProfileToForm(parsed) {
  return {
    firstName: parsed.name?.split(" ")[0] || "",
    lastName: parsed.name?.split(" ").slice(1).join(" ") || "",
    email: parsed.email || "",
    phone: parsed.phone || "",
    location: parsed.location || "",
    // You can further map education, skills, etc. as needed
    // skills: parsed.skills?.split("\n") || [],
    // Add more mappings as per your frontend state
  };
}

export default ApplicantProfile;