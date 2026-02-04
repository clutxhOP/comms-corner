import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink, RefreshCcw, CheckCircle2, XCircle, ArrowRight, Trash2 } from "lucide-react";
import { useLeadAssignments, LeadAssignment } from "@/hooks/useLeadAssignments";
import { useBusinesses, Business } from "@/hooks/useBusinesses";
import { useUsers } from "@/hooks/useUsers";
import { useWebhooks } from "@/hooks/useWebhooks";
import { ReassignLeadDialog } from "@/components/tasks/ReassignLeadDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function CompletedLeadsSection() {
  const { assignments, loading, reassignById, fetchAssignments } = useLeadAssignments();
  const { allBusinesses } = useBusinesses();
  const { users } = useUsers();
  const { triggerWebhook } = useWebhooks();
  const { toast } = useToast();
  const [selectedAssignment, setSelectedAssignment] = useState<LeadAssignment | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter for completed leads only (approved or disapproved)
  const completedAssignments = assignments.filter(
    (assignment) => assignment.approval_status === "approved" || assignment.approval_status === "disapproved",
  );

  // DEBUG LOGS
  console.log("=== COMPLETED LEADS DEBUG ===");
  console.log("Total assignments:", assignments.length);
  console.log("Completed assignments count:", completedAssignments.length);
  console.log("Selected IDs:", Array.from(selectedIds));
  console.log("Selected count:", selectedIds.size);

  const getBusinessName = (businessId: string | null) => {
    if (!businessId) return "Unknown";
    const business = allBusinesses.find((b: Business) => b.id === businessId);
    return business?.name || "Unknown Business";
  };

  const getBusinessNames = (businessIds: string[] | null) => {
    if (!businessIds || businessIds.length === 0) return null;
    return businessIds
      .map((id) => getBusinessName(id))
      .filter((name) => name !== "Unknown" && name !== "Unknown Business")
      .join(", ");
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unknown";
    const user = users.find((u) => u.user_id === userId);
    return user?.full_name || "Unknown User";
  };

  const handleReassignClick = (assignment: LeadAssignment) => {
    setSelectedAssignment(assignment);
    setReassignDialogOpen(true);
  };

  const handleReassignConfirm = async (data: { businessIds: string[]; whatsapp?: string; reason?: string }) => {
    if (!selectedAssignment) return;

    await reassignById(selectedAssignment.id, {
      business_ids: data.businessIds,
      whatsapp: data.whatsapp,
      reason: data.reason,
    });

    // Get full business details for selected businesses
    const selectedBusinesses = allBusinesses.filter((b: Business) => data.businessIds.includes(b.id));

    // Build and send webhook payload
    const reassignedTo = selectedBusinesses.map((business: Business) => ({
      // Business details (from businesses table - different for each business)
      clientId: business.id,
      clientName: business.name || "Unknown Business",
      whatsapp: business.whatsapp || "",
      website: business.website || null,
      category: business.category || "",

      // Lead details (from assignment - same for all businesses)
      id: selectedAssignment.lead_id,
      icp: selectedAssignment.icp || "",
      contactInfo: selectedAssignment.contact_info,
      proofLink: selectedAssignment.post_url,
      requirement: selectedAssignment.requirement,
      recordId: selectedAssignment.record_id || selectedAssignment.client_id,
    }));

    // Trigger webhook
    await triggerWebhook("lead_reassigned", {
      event: "lead.reassigned",
      reassigned_to: reassignedTo,
    });
  };

  // Selection handlers
  const toggleSelectAll = () => {
    console.log("Toggle select all clicked");
    if (selectedIds.size === completedAssignments.length) {
      console.log("Deselecting all");
      setSelectedIds(new Set());
    } else {
      console.log("Selecting all");
      setSelectedIds(new Set(completedAssignments.map((a) => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    console.log("Toggle select clicked for ID:", id);
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      console.log("Removing from selection");
      newSelected.delete(id);
    } else {
      console.log("Adding to selection");
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    console.log("New selected IDs:", Array.from(newSelected));
  };

  // Delete handlers
  const handleDeleteClick = () => {
    console.log("Delete button clicked");
    if (selectedIds.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("lead_assignments").delete().in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedIds.size} lead${selectedIds.size > 1 ? "s" : ""} deleted successfully`,
      });

      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
      fetchAssignments();
    } catch (error) {
      console.error("Error deleting leads:", error);
      toast({
        title: "Error",
        description: "Failed to delete leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Completed Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log("Rendering with completedAssignments.length:", completedAssignments.length);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Completed Leads ({completedAssignments.length})
            </CardTitle>
            {completedAssignments.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                    <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedIds.size})
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedIds.size === completedAssignments.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {completedAssignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No completed leads yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedAssignments.map((assignment) => {
                const reassignedNames = getBusinessNames(assignment.reassigned_business_ids);
                const hasReassignments = reassignedNames || assignment.reassigned_business_id;
                const isSelected = selectedIds.has(assignment.id);

                console.log(`Rendering card for ${assignment.id}, selected: ${isSelected}`);

                return (
                  <div
                    key={assignment.id}
                    className={`rounded-lg border bg-card p-4 shadow-sm transition-colors ${
                      isSelected ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2 flex-1">
                        <div style={{ border: "2px solid red" }}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {
                              console.log("Checkbox clicked for:", assignment.id);
                              toggleSelect(assignment.id);
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={
                                assignment.approval_status === "approved"
                                  ? "bg-success/10 text-success border-success/20"
                                  : "bg-destructive/10 text-destructive border-destructive/20"
                              }
                            >
                              {assignment.approval_status === "approved" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {assignment.approval_status}
                            </Badge>
                            {hasReassignments && (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                Reassigned
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-sm">{assignment.client_name || "Unknown Client"}</h4>
                          <p className="text-xs text-muted-foreground">{assignment.category}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-medium">Requirement:</span>
                        <p className="text-muted-foreground line-clamp-2">{assignment.requirement}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="font-medium">WhatsApp:</span>
                        <span className="text-muted-foreground">{assignment.client_whatsapp}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="font-medium">Contact:</span>
                        <a
                          href={assignment.contact_info}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 truncate"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">Assigned to:</span>
                          <span className="text-muted-foreground">{getBusinessName(assignment.business_id)}</span>
                        </div>
                        {hasReassignments && (
                          <div className="flex items-start gap-2 text-xs mt-1">
                            <ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium text-primary">Reassigned to:</span>
                              <span className="text-muted-foreground ml-1">
                                {reassignedNames || getBusinessName(assignment.reassigned_business_id)}
                              </span>
                            </div>
                          </div>
                        )}
                        <p className="text-muted-foreground mt-1">
                          By: {getUserName(assignment.assigned_by)} •{" "}
                          {new Date(assignment.created_at).toLocaleDateString()}
                        </p>
                        {assignment.reassigned_by && assignment.reassigned_at && (
                          <p className="text-muted-foreground mt-1">
                            Reassigned by: {getUserName(assignment.reassigned_by)} •{" "}
                            {new Date(assignment.reassigned_at).toLocaleDateString()}
                          </p>
                        )}
                        {assignment.reassignment_reason && (
                          <p className="text-muted-foreground italic mt-1">
                            Reason: "{assignment.reassignment_reason}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleReassignClick(assignment)}
                      >
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Reassign
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ReassignLeadDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        onConfirm={handleReassignConfirm}
        leadTitle={selectedAssignment?.client_name || undefined}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} Lead{selectedIds.size > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected lead{selectedIds.size > 1 ? "s" : ""}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
