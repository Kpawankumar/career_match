import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import Layout from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar,
  Briefcase,
  Building,
  Shield,
  Settings,
  Edit,
  Save,
  ArrowLeft,
  Bell,
  Lock,
  Palette,
  BarChart3
} from "lucide-react";

// API Configuration
const HR_API_BASE_URL = "https://hr-management-1071432896229.asia-south2.run.app";

// Types - Simplified to match current database
interface HRProfile {
  user_id: string;
  hr_name: string;
  hr_contact: string;
  hr_org_id: number | null;
  hr_orgs: string;
  created_at: string;
  org_name: string;
  org_type: string;
  org_desc: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  department: string;
  position: string;
  experience_years: number;
  avatar_url?: string;
  linkedin_url?: string;
  website_url?: string;
  timezone: string;
  language: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    job_alerts: boolean;
    application_updates: boolean;
    team_activity: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    dashboard_layout: 'grid' | 'list';
    default_view: 'overview' | 'jobs' | 'applications' | 'analytics';
    auto_refresh: boolean;
    compact_mode: boolean;
  };
}

interface Organization {
  org_id: number;
  org_name: string;
  org_desc: string;
  industry: string;
  size: string;
  location: string;
  created_at: string;
}

const HRProfile = () => {
  const { toast } = useToast();
  const { user, token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState<HRProfile>({
    user_id: "",
    hr_name: "",
    hr_contact: "",
    hr_org_id: null,
    hr_orgs: "",
    created_at: "",
    org_name: "",
    org_type: "",
    org_desc: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    department: "",
    position: "",
    experience_years: 0,
    avatar_url: "",
    linkedin_url: "",
    website_url: "",
    timezone: "UTC",
    language: "en",
    notifications: {
      email: true,
      sms: false,
      push: true,
      job_alerts: true,
      application_updates: true,
      team_activity: true,
    },
    preferences: {
      theme: 'light',
      dashboard_layout: 'grid',
      default_view: 'overview',
      auto_refresh: true,
      compact_mode: false,
    }
  });

  const [organization, setOrganization] = useState<Organization | null>(null);

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle nested object changes
  const handleNestedChange = (parent: string, field: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof HRProfile],
        [field]: value
      }
    }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${HR_API_BASE_URL}/hr-users/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData)
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
        setIsEditing(false);
        // Refresh profile data
        await fetchHRProfile();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchHRProfile = async () => {
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
        const hrData = await response.json();
        setProfileData(prev => ({
          ...prev,
          user_id: hrData.user_id || "",
          hr_name: hrData.hr_name || "",
          hr_contact: hrData.hr_contact || "",
          hr_org_id: hrData.hr_org_id || null,
          hr_orgs: hrData.hr_orgs || "",
          org_name: hrData.org_name || "",
          org_type: hrData.org_type || "",
          org_desc: hrData.org_desc || "",
          created_at: hrData.created_at || "",
          email: hrData.hr_contact || "",
          phone: "",
          location: "",
          bio: "",
          department: "",
          position: "",
          experience_years: 0,
          avatar_url: "",
          linkedin_url: "",
          website_url: "",
          timezone: "UTC",
          language: "en",
          notifications: {
            email: true,
            sms: false,
            push: true,
            job_alerts: true,
            application_updates: true,
            team_activity: true,
          },
          preferences: {
            theme: 'light',
            dashboard_layout: 'grid',
            default_view: 'overview',
            auto_refresh: true,
            compact_mode: false,
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching HR profile:', error);
      // Initialize HR user without organization
      try {
        const response = await fetch(`${HR_API_BASE_URL}/hr-users/initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        
        if (response.ok) {
          const initResult = await response.json();
          setProfileData(prev => ({
            ...prev,
            user_id: user?.uid || "",
            hr_name: user?.name || user?.email || "",
            hr_contact: user?.email || "",
            hr_org_id: initResult.hr_org_id || null,
            hr_orgs: initResult.hr_orgs || "",
            org_name: initResult.org_name || "",
            org_type: initResult.org_type || "",
            org_desc: initResult.org_desc || "",
            created_at: new Date().toISOString(),
            email: user?.email || "",
            phone: "",
            location: "",
            bio: "",
            department: "",
            position: "",
            experience_years: 0,
            avatar_url: "",
            linkedin_url: "",
            website_url: "",
            timezone: "UTC",
            language: "en",
            notifications: {
              email: true,
              sms: false,
              push: true,
              job_alerts: true,
              application_updates: true,
              team_activity: true,
            },
            preferences: {
              theme: 'light',
              dashboard_layout: 'grid',
              default_view: 'overview',
              auto_refresh: true,
              compact_mode: false,
            }
          }));
        }
      } catch (initError) {
        console.error('Error initializing HR user:', initError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRProfile();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">HR Profile</h1>
              <p className="text-muted-foreground">Manage your HR profile and preferences</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileData.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {profileData.hr_name?.charAt(0) || user?.name?.charAt(0) || "H"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{profileData.hr_name || "HR User"}</h3>
                    <p className="text-sm text-muted-foreground">{profileData.hr_contact || user?.email}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2 w-full">
                    <h3 className="font-medium text-sm">Organization</h3>
                    {profileData.org_name ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">{profileData.org_name}</p>
                        {profileData.org_type && (
                          <p className="text-xs text-gray-600">Type: {profileData.org_type}</p>
                        )}
                        {profileData.org_desc && (
                          <p className="text-xs text-gray-600">{profileData.org_desc}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not assigned</p>
                    )}
                  </div>
                  <div className="space-y-2 w-full">
                    <h3 className="font-medium text-sm">Member Since</h3>
                    <p className="text-sm text-muted-foreground">
                      {profileData.created_at ? new Date(profileData.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.hr_name}
                          onChange={(e) => handleInputChange('hr_name', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Professional Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Professional Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          value={profileData.position}
                          onChange={(e) => handleInputChange('position', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={profileData.department}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="experience">Years of Experience</Label>
                        <Input
                          id="experience"
                          type="number"
                          value={profileData.experience_years}
                          onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={profileData.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                          disabled={!isEditing}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="linkedin">LinkedIn URL</Label>
                        <Input
                          id="linkedin"
                          value={profileData.linkedin_url}
                          onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={profileData.website_url}
                          onChange={(e) => handleInputChange('website_url', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Settings
                    </CardTitle>
                    <CardDescription>
                      Choose how you want to receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-notifications">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={profileData.notifications.email}
                          onCheckedChange={(checked) => handleNestedChange('notifications', 'email', checked)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms-notifications">SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                        </div>
                        <Switch
                          id="sms-notifications"
                          checked={profileData.notifications.sms}
                          onCheckedChange={(checked) => handleNestedChange('notifications', 'sms', checked)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="push-notifications">Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive push notifications</p>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={profileData.notifications.push}
                          onCheckedChange={(checked) => handleNestedChange('notifications', 'push', checked)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="job-alerts">Job Alerts</Label>
                          <p className="text-sm text-muted-foreground">Get notified about new job postings</p>
                        </div>
                        <Switch
                          id="job-alerts"
                          checked={profileData.notifications.job_alerts}
                          onCheckedChange={(checked) => handleNestedChange('notifications', 'job_alerts', checked)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="application-updates">Application Updates</Label>
                          <p className="text-sm text-muted-foreground">Get notified about application status changes</p>
                        </div>
                        <Switch
                          id="application-updates"
                          checked={profileData.notifications.application_updates}
                          onCheckedChange={(checked) => handleNestedChange('notifications', 'application_updates', checked)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Display Preferences
                    </CardTitle>
                    <CardDescription>
                      Customize your dashboard and display settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="theme">Theme</Label>
                        <Select
                          value={profileData.preferences.theme}
                          onValueChange={(value) => handleNestedChange('preferences', 'theme', value)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="dashboard-layout">Dashboard Layout</Label>
                        <Select
                          value={profileData.preferences.dashboard_layout}
                          onValueChange={(value) => handleNestedChange('preferences', 'dashboard_layout', value)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grid">Grid</SelectItem>
                            <SelectItem value="list">List</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="default-view">Default View</Label>
                        <Select
                          value={profileData.preferences.default_view}
                          onValueChange={(value) => handleNestedChange('preferences', 'default_view', value)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="overview">Overview</SelectItem>
                            <SelectItem value="jobs">Jobs</SelectItem>
                            <SelectItem value="applications">Applications</SelectItem>
                            <SelectItem value="analytics">Analytics</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={profileData.language}
                          onValueChange={(value) => handleInputChange('language', value)}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-refresh">Auto Refresh</Label>
                        <p className="text-sm text-muted-foreground">Automatically refresh dashboard data</p>
                      </div>
                      <Switch
                        id="auto-refresh"
                        checked={profileData.preferences.auto_refresh}
                        onCheckedChange={(checked) => handleNestedChange('preferences', 'auto_refresh', checked)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="compact-mode">Compact Mode</Label>
                        <p className="text-sm text-muted-foreground">Use compact layout for better space utilization</p>
                      </div>
                      <Switch
                        id="compact-mode"
                        checked={profileData.preferences.compact_mode}
                        onCheckedChange={(checked) => handleNestedChange('preferences', 'compact_mode', checked)}
                        disabled={!isEditing}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HRProfile; 