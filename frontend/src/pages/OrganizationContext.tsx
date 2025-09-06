import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Organization {
  org_id: number;
  name: string;
  industry: string;
  description: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  setOrganization: (org: Organization | null) => void;
  fetchOrganization: () => Promise<void>;
  updateOrganization: (orgData: Partial<Organization>) => Promise<void>;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://hr-management-1071432896229.asia-south2.run.app/organizations');
      
      if (response.ok) {
        const orgs = await response.json();
        if (orgs && orgs.length > 0) {
          setOrganization(orgs[0]); // Use the first organization
        } else {
          setOrganization(null);
        }
      } else {
        setOrganization(null);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const updateOrganization = async (orgData: Partial<Organization>) => {
    if (!organization) return;
    
    try {
      const response = await fetch(`https://hr-management-1071432896229.asia-south2.run.app/organizations/${organization.org_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orgData)
      });
      
      if (response.ok) {
        const updatedOrg = await response.json();
        setOrganization(updatedOrg);
      } else {
        throw new Error('Failed to update organization');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  const value = {
    organization,
    setOrganization,
    fetchOrganization,
    updateOrganization,
    loading
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}; 