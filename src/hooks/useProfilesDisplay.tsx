import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileDisplay {
  user_id: string;
  full_name: string;
}

/**
 * Hook for fetching user display information (names only, no emails).
 * Uses the profiles_display view for secure, public-safe user listing.
 * Use this for task assignment, mentions, and other non-admin features.
 */
export function useProfilesDisplay() {
  const [profiles, setProfiles] = useState<ProfileDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles_display')
          .select('user_id, full_name');

        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  return { profiles, loading };
}
