import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export type UserRole = 'admin' | 'dev' | 'ops';

export interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  roles: UserRole[];
  created_at: string;
}

export function useUsers() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data - group roles by user
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
        const userRoles = roles?.filter(r => r.user_id === profile.user_id).map(r => r.role as UserRole) || [];
        return {
          ...profile,
          roles: userRoles,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addUserRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, roles: [...u.roles, role] } : u
      ));

      toast({
        title: 'Role added',
        description: `${role} role has been added.`,
      });
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: 'Error',
        description: 'Failed to add role',
        variant: 'destructive',
      });
    }
  };

  const removeUserRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, roles: u.roles.filter(r => r !== role) } : u
      ));

      toast({
        title: 'Role removed',
        description: `${role} role has been removed.`,
      });
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove role',
        variant: 'destructive',
      });
    }
  };

  const removeAllRoles = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, roles: [] } : u
      ));

      toast({
        title: 'Roles removed',
        description: 'All roles have been removed.',
      });
    } catch (error) {
      console.error('Error removing roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove roles',
        variant: 'destructive',
      });
    }
  };

  return {
    users,
    loading,
    fetchUsers,
    addUserRole,
    removeUserRole,
    removeAllRoles,
  };
}
