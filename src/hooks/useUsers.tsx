import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'user' | null;
  created_at: string;
}

export function useUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
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

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role as 'admin' | 'user' | null ?? null,
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

  const setUserRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      // Check if role exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (error) throw error;
      }

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role } : u
      ));

      toast({
        title: 'Role updated',
        description: `User role has been set to ${role}.`,
      });
    } catch (error) {
      console.error('Error setting role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const removeUserRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role: null } : u
      ));

      toast({
        title: 'Role removed',
        description: 'User role has been removed.',
      });
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user role',
        variant: 'destructive',
      });
    }
  };

  return {
    users,
    loading,
    fetchUsers,
    setUserRole,
    removeUserRole,
  };
}
