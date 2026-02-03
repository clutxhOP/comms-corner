const reassignById = useCallback(
  async (assignmentId: string, data: ReassignLeadData) => {
    if (!user) return false;

    try {
      // 1. Update Supabase first
      const { error, data: updatedAssignment } = await supabase
        .from("lead_assignments")
        .update({
          reassigned_business_id: data.business_ids[0] || null,
          reassigned_business_ids: data.business_ids,
          reassigned_whatsapp: data.whatsapp || null,
          reassigned_by: user.id,
          reassignment_reason: data.reason || null,
          reassigned_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)
        .select()
        .single();

      if (error) throw error;

      // 2. Send to n8n webhook (THIS WAS MISSING!)
      try {
        await fetch("YOUR_N8N_WEBHOOK_URL", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: "lead_reassigned",
            assignment_id: assignmentId,
            business_ids: data.business_ids,
            reassigned_whatsapp: data.whatsapp,
            reassignment_reason: data.reason,
            reassigned_by: user.id,
            reassigned_by_email: user.email,
            reassigned_at: new Date().toISOString(),
            assignment_data: updatedAssignment,
          }),
        });
      } catch (webhookError) {
        console.error("Webhook error:", webhookError);
        // Don't fail the whole operation if webhook fails
      }

      // 3. Update local state
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
  [user, toast],
);
