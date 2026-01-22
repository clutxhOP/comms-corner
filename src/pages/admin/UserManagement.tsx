import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUsers, UserRole } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Shield, User, Users, Plus, Trash2, KeyRound, Code, Settings } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const AVAILABLE_ROLES: { value: UserRole; label: string; icon: React.ReactNode }[] = [
  { value: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" /> },
  { value: 'dev', label: 'Developer', icon: <Code className="h-4 w-4" /> },
  { value: 'ops', label: 'Operations', icon: <Settings className="h-4 w-4" /> },
];

export default function UserManagement() {
  const { users, loading, addUserRole, removeUserRole, fetchUsers } = useUsers();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Add user dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRoles, setNewRoles] = useState<UserRole[]>(['ops']);
  const [addLoading, setAddLoading] = useState(false);

  // Reset password dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserEmail, setResetUserEmail] = useState('');
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Edit name dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const toggleNewRole = (role: UserRole) => {
    setNewRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(newEmail);
      passwordSchema.parse(newPassword);
      if (!newFullName.trim()) {
        throw new Error('Full name is required');
      }
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: error instanceof z.ZodError ? error.errors[0].message : (error as Error).message,
        variant: 'destructive',
      });
      return;
    }

    setAddLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            full_name: newFullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update the profile with the full name
        await supabase
          .from('profiles')
          .update({ full_name: newFullName })
          .eq('user_id', data.user.id);

        // Set roles
        for (const role of newRoles) {
          await supabase
            .from('user_roles')
            .insert({ user_id: data.user.id, role });
        }
      }

      toast({
        title: 'User created',
        description: `${newEmail} has been added to the team.`,
      });

      // Reset form
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRoles(['ops']);
      setAddDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setAddLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      passwordSchema.parse(newPasswordForReset);
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: error instanceof z.ZodError ? error.errors[0].message : 'Invalid password',
        variant: 'destructive',
      });
      return;
    }

    setResetLoading(true);

    try {
      toast({
        title: 'Password Reset',
        description: 'Password reset requires admin backend API. Contact your system administrator.',
        variant: 'default',
      });

      setResetDialogOpen(false);
      setNewPasswordForReset('');
      setResetUserId(null);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleEditName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editFullName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Full name is required',
        variant: 'destructive',
      });
      return;
    }

    setEditLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editFullName })
        .eq('user_id', editUserId);

      if (error) throw error;

      toast({
        title: 'Name updated',
        description: 'User name has been updated.',
      });

      setEditDialogOpen(false);
      setEditFullName('');
      setEditUserId(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating name:', error);
      toast({
        title: 'Error',
        description: 'Failed to update name',
        variant: 'destructive',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the team? This action cannot be undone.`)) {
      return;
    }

    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('user_id', userId);

      toast({
        title: 'User removed',
        description: `${email} has been removed from the team.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user. The auth account may still exist.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleRole = async (userId: string, role: UserRole, hasRole: boolean) => {
    if (hasRole) {
      await removeUserRole(userId, role);
    } else {
      await addUserRole(userId, role);
    }
    fetchUsers();
  };

  const openResetDialog = (userId: string, email: string) => {
    setResetUserId(userId);
    setResetUserEmail(email);
    setResetDialogOpen(true);
  };

  const openEditDialog = (userId: string, fullName: string) => {
    setEditUserId(userId);
    setEditFullName(fullName);
    setEditDialogOpen(true);
  };

  const getRoleIcon = (roles: UserRole[]) => {
    if (roles.includes('admin')) return <Shield className="h-4 w-4 text-primary" />;
    if (roles.includes('dev')) return <Code className="h-4 w-4 text-blue-500" />;
    if (roles.includes('ops')) return <Settings className="h-4 w-4 text-orange-500" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage team members and their roles</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{users.length} members</span>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new team member account. They will be able to log in immediately.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Roles</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_ROLES.map(role => (
                        <label
                          key={role.value}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={newRoles.includes(role.value)}
                            onCheckedChange={() => toggleNewRole(role.value)}
                          />
                          {role.icon}
                          <span className="text-sm">{role.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addLoading}>
                      {addLoading ? 'Creating...' : 'Create User'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        {getRoleIcon(user.roles)}
                      </div>
                      <button
                        onClick={() => openEditDialog(user.user_id, user.full_name)}
                        className="font-medium hover:underline text-left"
                      >
                        {user.full_name}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <Badge variant="outline" className="text-muted-foreground">No roles</Badge>
                      ) : (
                        user.roles.map(role => (
                          <Badge
                            key={role}
                            className={
                              role === 'admin'
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : role === 'dev'
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                            }
                          >
                            {role === 'admin' ? 'Admin' : role === 'dev' ? 'Dev' : 'Ops'}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.user_id !== currentUser?.id && (
                        <>
                          <div className="flex gap-1">
                            {AVAILABLE_ROLES.map(role => (
                              <Button
                                key={role.value}
                                variant={user.roles.includes(role.value) ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleToggleRole(user.user_id, role.value, user.roles.includes(role.value))}
                                title={role.label}
                              >
                                {role.icon}
                              </Button>
                            ))}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openResetDialog(user.user_id, user.email)}
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.user_id, user.email)}
                            title="Remove User"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {user.user_id === currentUser?.id && (
                        <span className="text-xs text-muted-foreground">You</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No users found. Click "Add User" to create the first team member.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Reset Password Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {resetUserEmail}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPasswordForReset}
                  onChange={(e) => setNewPasswordForReset(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setResetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={resetLoading}>
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Name Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Name</DialogTitle>
              <DialogDescription>
                Update the user's display name
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Full Name</Label>
                <Input
                  id="editName"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
