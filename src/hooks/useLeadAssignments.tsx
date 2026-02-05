import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface LeadAssignment {
  id: string;
  lead_id: string;
  client_id: string;
  client_name: string | null;
  client_whatsapp: string;
  contact_info: string;
  post_url: string;
  category: string;
  requirement: string;
  website: string | null;
  icp: string | null;
  business_id: string;
  reassigned_business_id: string | null;
  reassigned_business_ids: string[] | null;
  reassigned_whatsapp: string | null;
  approval_status: "approved" | "disapproved";
  assigned_by: string;
  reassigned_by: string | null;
  reassignment_reason: string | null;
  created_at: string;
  reassigned_at: string | null;
  record_id: string | null;
}

export interface CreateLeadAssignmentData {
  lead_id: string;
  client_id: string;
  client_name?: string | null;
  client_whatsapp: string;
  contact_info: string;
  post_url: string;
  category: string;
  requirement: string;
  website?: string | null;
  icp?: string | null;
  business_id: string;
  approval_status: "approved" | "disapproved";
  record_id?: string | null;
}

export interface ReassignLeadData {
  business_ids: string[];
  whatsapp?: string;
  reason?: string;
}

export function useLeadAssignments() {
  const [assignments, setAssignments] = useState<LeadAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAssignments = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("lead_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAssignments((data || []) as LeadAssignment[]);
    } catch (error) {
      console.error("Error fetching lead assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load lead assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user, fetchAssignments]);

  const createAssignment = useCallback(
    async (data: CreateLeadAssignmentData) => {
      if (!user) return null;

      try {
        const { data: newAssignment, error } = await supabase
          .from("lead_assignments")
          .insert({
            ...data,
            assigned_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        setAssignments((prev) => [newAssignment as LeadAssignment, ...prev]);
        return newAssignment as LeadAssignment;
      } catch (error) {
        console.error("Error creating lead assignment:", error);
        toast({
          title: "Error",
          description: "Failed to create lead assignment",
          variant: "destructive",
        });
        return null;
      }
    },
    [user, toast],
  );

  const reassignLead = useCallback(
    async (leadId: string, data: ReassignLeadData) => {
      if (!user) return false;

      try {
        // Check if assignment exists for this lead
        const existing = assignments.find((a) => a.lead_id === leadId);

        if (!existing) {
          toast({
            title: "Error",
            description: "Lead assignment not found",
            variant: "destructive",
          });
          return false;
        }

        // Check for duplicate reassignments based on recordId + business combination
        const recordId = existing.record_id;

        if (recordId) {
          // Query database to check if this lead (recordId) has already been assigned to any of the target businesses
          const { data: existingAssignments, error: checkError } = await supabase
            .from("lead_assignments")
            .select("client_id, client_whatsapp, client_name, business_id, reassigned_business_ids")
            .eq("record_id", recordId);

          if (checkError) {
            console.error("Error checking for duplicate assignments:", checkError);
          } else if (existingAssignments && existingAssignments.length > 0) {
            // Collect all business IDs that this lead has been assigned to
            const alreadyAssignedBusinessIds = new Set<string>();

            existingAssignments.forEach((assignment) => {
              // Add original business_id
              alreadyAssignedBusinessIds.add(assignment.business_id);

              // Add reassigned business IDs if they exist
              if (assignment.reassigned_business_ids && Array.isArray(assignment.reassigned_business_ids)) {
                assignment.reassigned_business_ids.forEach((id) => alreadyAssignedBusinessIds.add(id));
              }
            });

            // Check if any of the new business_ids are already assigned
            const duplicateBusinessIds = data.business_ids.filter((businessId) =>
              alreadyAssignedBusinessIds.has(businessId),
            );

            if (duplicateBusinessIds.length > 0) {
              // Find business names for better error message
              const duplicateNames = existingAssignments
                .filter(
                  (a) =>
                    duplicateBusinessIds.includes(a.business_id) ||
                    (a.reassigned_business_ids &&
                      a.reassigned_business_ids.some((id) => duplicateBusinessIds.includes(id))),
                )
                .map((a) => a.client_name || "Unknown Business")
                .filter((name, index, self) => self.indexOf(name) === index) // Remove duplicates
                .join(", ");

              toast({
                title: "Duplicate Assignment Detected",
                description: `This lead (Record ID: ${recordId}) has already been assigned to: ${duplicateNames}. A lead can only be reassigned to a different business.`,
                variant: "destructive",
              });
              return false;
            }
          }
        }

        // Proceed with reassignment if no duplicates found
        const { error } = await supabase
          .from("lead_assignments")
          .update({
            reassigned_business_id: data.business_ids[0] || null,
            reassigned_business_ids: data.business_ids,
            reassigned_whatsapp: data.whatsapp || null,
            reassigned_by: user.id,
            reassignment_reason: data.reason || null,
            reassigned_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;

        setAssignments((prev) =>
          prev.map((a) =>
            a.id === existing.id
              ? {
                  ...a,
                  reassigned_business_id: data.business_ids[0] || null,
                  reassigned_business_ids: data.business_ids,
                  reassigned_whatsapp: data.whatsapp || null,
                  reassigned_by: user.id,
                  reassignment_reason: data.reason || null,
                  reassigned_at: new Date().toISOString(),
                }
              : a,
          ),
        );

        const businessCount = data.business_ids.length;
        toast({
          title: "Lead reassigned successfully",
          description: `The lead has been reassigned to ${businessCount} business${businessCount !== 1 ? "es" : ""}.`,
        });

        return true;
      } catch (error) {
        console.error("Error reassigning lead:", error);
        toast({
          title: "Error",
          description: "Failed to reassign lead",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, assignments, toast],
  );

  const reassignById = useCallback(
    async (assignmentId: string, data: ReassignLeadData) => {
      if (!user) return false;

      try {
        // Get the assignment to check for duplicates
        const assignment = assignments.find((a) => a.id === assignmentId);

        if (!assignment) {
          toast({
            title: "Error",
            description: "Assignment not found",
            variant: "destructive",
          });
          return false;
        }

        // Check for duplicate reassignments based on recordId + business combination
        const recordId = assignment.record_id;

        if (recordId) {
          // Query database to check if this lead (recordId) has already been assigned to any of the target businesses
          const { data: existingAssignments, error: checkError } = await supabase
            .from("lead_assignments")
            .select("client_id, client_whatsapp, client_name, business_id, reassigned_business_ids")
            .eq("record_id", recordId);

          if (checkError) {
            console.error("Error checking for duplicate assignments:", checkError);
          } else if (existingAssignments && existingAssignments.length > 0) {
            // Collect all business IDs that this lead has been assigned to
            const alreadyAssignedBusinessIds = new Set<string>();

            existingAssignments.forEach((assignment) => {
              // Add original business_id
              alreadyAssignedBusinessIds.add(assignment.business_id);

              // Add reassigned business IDs if they exist
              if (assignment.reassigned_business_ids && Array.isArray(assignment.reassigned_business_ids)) {
                assignment.reassigned_business_ids.forEach((id) => alreadyAssignedBusinessIds.add(id));
              }
            });

            // Check if any of the new business_ids are already assigned
            const duplicateBusinessIds = data.business_ids.filter((businessId) =>
              alreadyAssignedBusinessIds.has(businessId),
            );

            if (duplicateBusinessIds.length > 0) {
              // Find business names for better error message
              const duplicateNames = existingAssignments
                .filter(
                  (a) =>
                    duplicateBusinessIds.includes(a.business_id) ||
                    (a.reassigned_business_ids &&
                      a.reassigned_business_ids.some((id) => duplicateBusinessIds.includes(id))),
                )
                .map((a) => a.client_name || "Unknown Business")
                .filter((name, index, self) => self.indexOf(name) === index) // Remove duplicates
                .join(", ");

              toast({
                title: "Duplicate Assignment Detected",
                description: `This lead (Record ID: ${recordId}) has already been assigned to: ${duplicateNames}. A lead can only be reassigned to a different business.`,
                variant: "destructive",
              });
              return false;
            }
          }
        }

        // Proceed with reassignment if no duplicates found
        const { error } = await supabase
          .from("lead_assignments")
          .update({
            reassigned_business_id: data.business_ids[0] || null,
            reassigned_business_ids: data.business_ids,
            reassigned_whatsapp: data.whatsapp || null,
            reassigned_by: user.id,
            reassignment_reason: data.reason || null,
            reassigned_at: new Date().toISOString(),
          })
          .eq("id", assignmentId);

        if (error) throw error;

        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId
              ? {
                  ...a,
                  reassigned_business_id: data.business_ids[0] || null,
                  reassigned_business_ids: data.business_ids,
                  reassigned_whatsapp: data.whatsapp || null,
                  reassigned_by: user.id,
                  reassignment_reason: data.reason || null,
                  reassigned_at: new Date().toISOString(),
                }
              : a,
          ),
        );

        const businessCount = data.business_ids.length;
        toast({
          title: "Lead reassigned successfully",
          description: `The lead has been reassigned to ${businessCount} business${businessCount !== 1 ? "es" : ""}.`,
        });

        return true;
      } catch (error) {
        console.error("Error reassigning lead:", error);
        toast({
          title: "Error",
          description: "Failed to reassign lead",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, toast, assignments],
  );

  const getAssignmentByLeadId = useCallback(
    (leadId: string) => {
      return assignments.find((a) => a.lead_id === leadId);
    },
    [assignments],
  );

  return {
    assignments,
    loading,
    fetchAssignments,
    createAssignment,
    reassignLead,
    reassignById,
    getAssignmentByLeadId,
  };
}
