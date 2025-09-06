import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Layout from "@/components/layout/Layout";
import { 
  Users, 
  Building, 
  Briefcase, 
  TrendingUp, 
  Settings, 
  Shield, 
  BarChart3,
  UserPlus,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const systemStats = {
    totalUsers: 1247,
    totalJobs: 89,
    totalApplications: 3456,
    totalCompanies: 45,
    activeUsers: 892,
    newSignups: 23
  };

  const recentUsers = [
    {
      id: 1,
      name: "Alice Johnson",
      email: "alice@example.com",
      role: "Applicant",
      joinDate: "2024-01-15",
      status: "Active",
      lastLogin: "2024-01-16"
    },
    {
      id: 2,
      name: "Bob Smith",
      email: "bob@techcorp.com",
      role: "HR",
      joinDate: "2024-01-14",
      status: "Active",
      lastLogin: "2024-01-16"
    },
    {
      id: 3,
      name: "Carol Davis",
      email: "carol@design.com",
      role: "Applicant",
      joinDate: "2024-01-13",
      status: "Pending",
      lastLogin: "Never"
    }
  ];

  const companies = [
    {
      id: 1,
      name: "Tech Corp",
      industry: "Technology",
      size: "201-500",
      activeJobs: 12,
      totalApplications: 234,
      status: "Active",
      joinDate: "2024-01-01"
    },
    {
      id: 2,
      name: "Design Studio",
      industry: "Design",
      size: "51-200",
      activeJobs: 8,
      totalApplications: 156,
      status: "Active",
      joinDate: "2024-01-05"
    },
    {
      id: 3,
      name: "Startup Inc",
      industry: "Fintech",
      size: "11-50",
      activeJobs: 5,
      totalApplications: 89,
      status: "Pending",
      joinDate: "2024-01-12"
    }
  ];

  const systemAlerts = [
    {
      id: 1,
      type: "warning",
      message: "High server load detected",
      timestamp: "2 hours ago"
    },
    {
      id: 2,
      type: "info",
      message: "Database backup completed successfully",
      timestamp: "6 hours ago"
    },
    {
      id: 3,
      type: "error",
      message: "Failed login attempts threshold exceeded",
      timestamp: "1 day ago"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800";
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Suspended": return "bg-red-100 text-red-800";
      case "Inactive": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin": return "bg-purple-100 text-purple-800";
      case "HR": return "bg-blue-100 text-blue-800";
      case "Applicant": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "info": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and management controls</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Button>
          </div>
        </div>

        {/* System Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{systemStats.totalUsers.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Companies</p>
                  <p className="text-2xl font-bold">{systemStats.totalCompanies}</p>
                </div>
                <Building className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                  <p className="text-2xl font-bold">{systemStats.totalJobs}</p>
                </div>
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Applications</p>
                  <p className="text-2xl font-bold">{systemStats.totalApplications.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{systemStats.activeUsers.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">New Signups</p>
                  <p className="text-2xl font-bold">{systemStats.newSignups}</p>
                </div>
                <UserPlus className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Users */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent User Registrations</CardTitle>
                    <CardDescription>Latest users who joined the platform</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getRoleColor(user.role)} variant="secondary">
                                {user.role}
                              </Badge>
                              <span className="text-sm text-muted-foreground">Joined: {user.joinDate}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                          <Button size="sm" variant="outline">Manage</Button>
                        </div>
                      </div>
                    ))}
                    <Link to="/admin/users">
                      <Button variant="outline" className="w-full">
                        View All Users
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* System Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle>System Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {systemAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">{alert.timestamp}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" size="sm">
                    View All Alerts
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <Input 
                  placeholder="Search users..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80"
                />
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Users
                </Button>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4">User</th>
                        <th className="text-left p-4">Role</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Join Date</th>
                        <th className="text-left p-4">Last Login</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={getRoleColor(user.role)} variant="secondary">
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={getStatusColor(user.status)}>
                              {user.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{user.joinDate}</td>
                          <td className="p-4 text-sm text-muted-foreground">{user.lastLogin}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">Edit</Button>
                              <Button size="sm" variant="outline">Suspend</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <Input 
                  placeholder="Search companies..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80"
                />
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <Button>
                <Building className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </div>

            <div className="space-y-4">
              {companies.map((company) => (
                <Card key={company.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{company.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-semibold">{company.name}</h3>
                          <p className="text-muted-foreground">{company.industry} • {company.size} employees</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{company.activeJobs} active jobs</span>
                            <span>{company.totalApplications} applications</span>
                            <span>Joined: {company.joinDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(company.status)}>
                          {company.status}
                        </Badge>
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button size="sm">View Details</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span>Monthly Users</span>
                        <span className="font-bold">+12%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span>Job Postings</span>
                        <span className="font-bold">+8%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span>Applications</span>
                        <span className="font-bold">+15%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '82%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Monthly Revenue</span>
                      <span className="font-bold text-green-600">$45,200</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Subscription Revenue</span>
                      <span className="font-bold">$38,500</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Job Posting Revenue</span>
                      <span className="font-bold">$6,700</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Growth Rate</span>
                      <span className="font-bold text-green-600">+8.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Server Status</span>
                      <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Database</span>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>API Response Time</span>
                      <span className="font-bold">125ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Uptime</span>
                      <span className="font-bold">99.9%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Backup Database
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    System Configuration
                  </Button>
                  <Button className="w-full" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Performance Reports
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Security Audit
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </Layout>
  );
};

export default AdminDashboard;