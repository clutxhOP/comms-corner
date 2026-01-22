import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers, UserWithRoles, UserRole } from '@/hooks/useUsers';
import { Users, Building2 } from 'lucide-react';

interface TaskAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssignees: string[];
  onSave: (assignees: string[]) => Promise<void>;
  taskTitle: string;
}

const DEPARTMENTS: { role: UserRole; label: string; email: string }[] = [
  { role: 'ops', label: 'Operations Team', email: 'ops@backendglamor.com' },
  { role: 'dev', label: 'Development Team', email: 'dev@backendglamor.com' },
  { role: 'admin', label: 'Admin Team', email: 'admin@backendglamor.com' },
];

export function TaskAssignmentDialog({
  open,
  onOpenChange,
  currentAssignees,
  onSave,
  taskTitle,
}: TaskAssignmentDialogProps) {
  const { users, loading } = useUsers();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedUsers(currentAssignees || []);
    }
  }, [open, currentAssignees]);

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleDepartmentSelect = (role: UserRole) => {
    const deptUsers = users.filter(u => u.roles.includes(role)).map(u => u.user_id);
    const newSelected = [...new Set([...selectedUsers, ...deptUsers])];
    setSelectedUsers(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedUsers);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    setSelectedUsers([]);
  };

  const getUsersInDept = (role: UserRole) => {
    return users.filter(u => u.roles.includes(role));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Task</DialogTitle>
          <DialogDescription>
            Assign "{taskTitle}" to users or departments
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Individual Users
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-2">
              <Building2 className="h-4 w-4" />
              Departments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading users...</div>
            ) : (
              <div className="space-y-2">
                {users.map(user => (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={user.user_id}
                      checked={selectedUsers.includes(user.user_id)}
                      onCheckedChange={(checked) => handleUserToggle(user.user_id, !!checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={user.user_id} className="text-sm font-medium cursor-pointer">
                        {user.full_name}
                      </label>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.map(role => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">No users found</div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="departments" className="mt-4">
            <div className="space-y-3">
              {DEPARTMENTS.map(dept => {
                const deptUsers = getUsersInDept(dept.role);
                const selectedInDept = deptUsers.filter(u => selectedUsers.includes(u.user_id)).length;
                return (
                  <div
                    key={dept.role}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{dept.label}</h4>
                        <p className="text-xs text-muted-foreground">{dept.email}</p>
                      </div>
                      <Badge variant="secondary">
                        {selectedInDept}/{deptUsers.length} selected
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDepartmentSelect(dept.role)}
                      disabled={deptUsers.length === 0}
                    >
                      Select All {dept.label}
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedUsers.length} user(s) selected
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
