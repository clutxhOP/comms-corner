import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTasks, DbTask } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowLeft } from 'lucide-react';

export default function CreateTask() {
  const navigate = useNavigate();
  const { createTask } = useTasks();
  const { users, loading: usersLoading } = useUsers();
  
  const [type, setType] = useState<DbTask['type']>('other');
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Additional fields for lead-approval
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState('');
  const [icp, setIcp] = useState('');
  const [requirement, setRequirement] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [proofLink, setProofLink] = useState('');

  // Additional fields for lead-alert
  const [clientName, setClientName] = useState('');
  const [clientStatus, setClientStatus] = useState('PAID');
  const [alertLevel, setAlertLevel] = useState<'red' | 'yellow'>('yellow');
  const [issue, setIssue] = useState('');
  const [assignee, setAssignee] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let details: Record<string, unknown> = {};

    switch (type) {
      case 'lead-approval':
        details = { clientId, category, icp, requirement, contactInfo, proofLink };
        break;
      case 'lead-alert':
        details = { clientName, category, clientStatus, alertLevel, issue, assignee, whatsapp };
        break;
      case 'lead-outreach':
        details = { requirement, contactInfo, proofLink };
        break;
      case 'other':
        details = { description };
        break;
    }

    await createTask({
      type,
      title,
      status: 'pending',
      details,
      assigned_to: assignedTo || null,
      created_by: null,
      disapproval_reason: null,
    });

    setLoading(false);
    navigate('/tasks');
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Task
            </CardTitle>
            <CardDescription>
              Create a task and optionally assign it to a team member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Task Type</Label>
                  <Select value={type} onValueChange={(v: DbTask['type']) => setType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead-approval">Lead Approval</SelectItem>
                      <SelectItem value="lead-alert">Lead Alert</SelectItem>
                      <SelectItem value="lead-outreach">Lead Outreach</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assign To</Label>
                  <Select value={assignedTo || "unassigned"} onValueChange={(v) => setAssignedTo(v === "unassigned" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  required
                />
              </div>

              {/* Dynamic fields based on type */}
              {type === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task description"
                    rows={4}
                  />
                </div>
              )}

              {type === 'lead-approval' && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ICP</Label>
                    <Input value={icp} onChange={(e) => setIcp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Requirement</Label>
                    <Textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Info URL</Label>
                    <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Proof Link</Label>
                    <Input value={proofLink} onChange={(e) => setProofLink(e.target.value)} />
                  </div>
                </div>
              )}

              {type === 'lead-alert' && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Client Name</Label>
                      <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Client Status</Label>
                      <Select value={clientStatus} onValueChange={setClientStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PAID">Paid</SelectItem>
                          <SelectItem value="TRIAL">Trial</SelectItem>
                          <SelectItem value="FREE">Free</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Alert Level</Label>
                      <Select value={alertLevel} onValueChange={(v: 'red' | 'yellow') => setAlertLevel(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="red">Red (Critical)</SelectItem>
                          <SelectItem value="yellow">Yellow (Warning)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Issue</Label>
                    <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={2} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Assignee</Label>
                      <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="@username" />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+1234567890" />
                    </div>
                  </div>
                </div>
              )}

              {type === 'lead-outreach' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Requirement</Label>
                    <Textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Info URL</Label>
                    <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Proof Link</Label>
                    <Input value={proofLink} onChange={(e) => setProofLink(e.target.value)} />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || !title}>
                {loading ? 'Creating...' : 'Create Task'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
