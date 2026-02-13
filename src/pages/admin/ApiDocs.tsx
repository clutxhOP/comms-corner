import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, FileText, Users, Send, Copy, Check, Key, Eye, EyeOff, Hash, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code className="text-foreground">{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

interface EndpointProps {
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  path: string;
  description: string;
  auth: string;
  requestBody?: string;
  responseExample?: string;
  queryParams?: { name: string; type: string; description: string }[];
}

function Endpoint({ method, path, description, auth, requestBody, responseExample, queryParams }: EndpointProps) {
  const methodColors: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    POST: "bg-success/10 text-success border-success/20",
    DELETE: "bg-destructive/10 text-destructive border-destructive/20",
    PUT: "bg-warning/10 text-warning border-warning/20",
    PATCH: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Badge className={`${methodColors[method]} font-mono`}>{method}</Badge>
        <div className="flex-1">
          <code className="text-sm font-mono text-foreground">{path}</code>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Authorization:</span>
        <Badge variant="outline">{auth}</Badge>
      </div>

      {queryParams && queryParams.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Query Parameters</h4>
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            {queryParams.map((param) => (
              <div key={param.name} className="flex items-start gap-2 text-sm">
                <code className="text-primary">{param.name}</code>
                <span className="text-muted-foreground">({param.type})</span>
                <span className="text-muted-foreground">- {param.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {requestBody && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Request Body</h4>
          <CodeBlock code={requestBody} language="json" />
        </div>
      )}

      {responseExample && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Response Example</h4>
          <CodeBlock code={responseExample} language="json" />
        </div>
      )}
    </div>
  );
}

function TokenDisplay() {
  const { session } = useAuth();
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const token = session?.access_token || "";
  const maskedToken = token ? `${token.slice(0, 20)}...${token.slice(-10)}` : "No token available";

  const handleCopy = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          Your API Token
        </CardTitle>
        <CardDescription>Use this token in the Authorization header for API requests</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted p-3 rounded-lg font-mono text-sm break-all">
            {showToken ? token || "No token available" : maskedToken}
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowToken(!showToken)}
            title={showToken ? "Hide token" : "Show token"}
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="outline" onClick={handleCopy} disabled={!token} title="Copy token">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ⚠️ Keep this token secure. It expires periodically and will refresh automatically.
        </p>
      </CardContent>
    </Card>
  );
}

export default function ApiDocs() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Code className="h-6 w-6" />
            API Documentation
          </h1>
          <p className="text-muted-foreground mt-1">Reference for all available API endpoints</p>
        </div>

        {/* Your Token */}
        <TokenDisplay />

        {/* Base URL */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Base URL</CardTitle>
            <CardDescription>All API requests should be made to this base URL</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={BASE_URL} />
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Authentication</CardTitle>
            <CardDescription>All endpoints require a Bearer token in the Authorization header</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={`Authorization: Bearer <your_jwt_token>

// The token shown above can be used directly in your requests`}
            />
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Channels
            </TabsTrigger>
            <TabsTrigger value="outreach" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Outreach
            </TabsTrigger>
          </TabsList>

          {/* Tasks API */}
          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tasks API
                </CardTitle>
                <CardDescription>
                  Manage tasks with role-based access. Admins see all tasks, others see only assigned tasks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Endpoint
                  method="GET"
                  path="/manage-tasks"
                  description="Fetch all tasks. Admins see all, others see assigned/unassigned only."
                  auth="Any authenticated user"
                  responseExample={`{
  "data": [
    {
      "id": "uuid",
      "type": "lead-approval",
      "title": "Review lead from John",
      "status": "pending",
      "assigned_to": "profile_id",
      "details": {},
      "created_at": "2026-01-22T10:00:00Z"
    }
  ]
}`}
                />

                <Endpoint
                  method="POST"
                  path="/manage-tasks"
                  description="Create a new task. Admin only. All details fields are mandatory based on task type."
                  auth="Admin only"
                  requestBody={`{
  "type": "lead-approval | lead-alert | lead-outreach | awaiting-business | other",
  "title": "Task title (required)",
  "assigned_to": "string or string[] (optional) - see assignment options below",
  "details": { ... } // Required fields depend on task type (see below)
}`}
                  responseExample={`{
  "data": {
    "id": "new-task-uuid",
    "type": "lead-approval",
    "title": "Task title",
    "status": "pending",
    "assigned_to": ["user-uuid-1", "user-uuid-2"],
    "details": { ... },
    "created_at": "2026-01-22T10:00:00Z"
  }
}`}
                />

                {/* Assignment Options */}
                <div className="border rounded-lg p-4 space-y-4 bg-primary/5 border-primary/20">
                  <h4 className="font-medium text-foreground">Assignment Options (assigned_to)</h4>
                  <p className="text-sm text-muted-foreground">
                    The <code className="text-primary">assigned_to</code> field supports multiple formats:
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Single User by Email
                      </Badge>
                      <CodeBlock code={`"assigned_to": "john@company.com"`} />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Single User by Profile ID
                      </Badge>
                      <CodeBlock code={`"assigned_to": "550e8400-e29b-41d4-a716-446655440000"`} />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Multiple Users
                      </Badge>
                      <CodeBlock code={`"assigned_to": ["john@company.com", "jane@company.com"]`} />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Department Email (assigns to all users with that role)
                      </Badge>
                      <CodeBlock
                        code={`"assigned_to": "ops@backendglamor.com"  // Assigns to all ops team
"assigned_to": "dev@backendglamor.com"  // Assigns to all dev team
"assigned_to": "admin@backendglamor.com" // Assigns to all admins`}
                      />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Mixed Assignment
                      </Badge>
                      <CodeBlock code={`"assigned_to": ["ops@backendglamor.com", "john@company.com"]`} />
                    </div>
                  </div>
                </div>

                {/* Task Type Schemas */}
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <h4 className="font-medium text-foreground">Task Type Details Schema (all fields mandatory)</h4>

                  <div className="space-y-3">
                    <div>
                      <Badge className="mb-2">lead-approval</Badge>
                      <CodeBlock
                        code={`{
  "clientName": "string (optional) - Client/business name",
  "clientId": "string (required) - UUID of assigned client/business",
  "whatsapp": "string (optional) - Client WhatsApp number",
  "website": "string (optional) - Client website URL",
  "category": "string (required) - Business category",
  "icp": "string (required) - Ideal customer profile",
  "requirement": "string (required) - Lead requirement details",
  "contactInfo": "string (required) - Email or URL",
  "proofLink": "string (required) - URL to proof/post",
  "recordId": "string (optional) - Source record ID (UUID from Supabase)"
}`}
                      />
                    </div>

                    <div>
                      <Badge className="mb-2">lead-alert</Badge>
                      <CodeBlock
                        code={`{
  "clientName": "string",
  "category": "string",
  "whatsapp": "string",
  "clientStatus": "string",
  "alertLevel": "yellow | red",
  "issue": "string",
  "timeSinceLastLead": "string (e.g., '48 hours')"
}`}
                      />
                    </div>

                    <div>
                      <Badge className="mb-2">lead-outreach</Badge>
                      <CodeBlock
                        code={`{
  "requirement": "string",
  "contactInfo": "string (email or URL)",
  "post": "string (URL to the post)",
  "comment": "string (comment to post)"
}`}
                      />
                    </div>

                    <div>
                      <Badge className="mb-2 bg-destructive/10 text-destructive border-destructive/20">
                        error-alert
                      </Badge>
                      <CodeBlock
                        code={`{
  "description": "string - accepts plain text, HTML, and Markdown formatting"
}

// Example with Markdown:
{
  "description": "**Error:** Forbidden - perhaps check your credentials?\\\\n\\\\nhttps://n8n.example.com/workflow/abc123\\\\n\\\\n--------------------------------------------------------------"
}`}
                      />
                    </div>

                    <div>
                      <Badge className="mb-2">other</Badge>
                      <CodeBlock
                        code={`{
  "description": "string"
}`}
                      />
                    </div>

                    <div>
                      <Badge className="mb-2 bg-warning/10 text-warning border-warning/20">awaiting-business</Badge>
                      <CodeBlock
                        code={`{
  "seekerId": "number (required) - ID from awaiting-business table",
  "seekerName": "string | HTML | markdown | URL (required) - Name of the person seeking service",
  "seekerWhatsapp": "string | HTML | markdown | URL (required) - WhatsApp number of seeker",
  "serviceRequested": "string | HTML | markdown | URL (required) - Service they are looking for",
  "matchedBusinessId": "string (required) - UUID of the matched business",
  "matchedBusinessName": "string | HTML | markdown | URL (required) - Name of matched business",
  "matchedBusinessWhatsapp": "string | HTML | markdown | URL (required) - WhatsApp of matched business",
  "matchedBusinessWebsite": "string | HTML | markdown | URL (optional) - Website of matched business",
  "matchedBusinessCategory": "string | HTML | markdown | URL (required) - Category of matched business",
  "createdAt": "string (required) - ISO timestamp of match creation"
}

// Content Type Support:
// All string fields (except seekerId, matchedBusinessId, createdAt)
// accept and intelligently render multiple content formats:
//
// 1. Plain Text: "Name" → renders as-is
// 2. HTML: "<strong>Name</strong>" → rendered with sanitization
// 3. Markdown: "**Name** *(Premium)*" → parsed and formatted
// 4. URL: "https://example.com" → clickable link (opens in new tab)
//
// Detection is automatic. No special flags required.

// Example with mixed content types:
{
  "type": "awaiting-business",
  "title": "Business Match: Dev → New Empire",
  "assigned_to": "ops@backendglamor.com",
  "details": {
    "seekerId": 3,
    "seekerName": "**Abdullahi** *(Premium)*",
    "seekerWhatsapp": "+2347034240802",
    "serviceRequested": "<strong>Architectural Design</strong> - High-end residential",
    "matchedBusinessId": "964137dd-6b11-40e7-a784-f0d60d274757",
    "matchedBusinessName": "Testing  Studios",
    "matchedBusinessWhatsapp": "+1234567890",
    "matchedBusinessWebsite": "https://testing.co",
    "matchedBusinessCategory": "Testing Production",
    "createdAt": "2026-02-13T15:11:42.253283+00:00"
  }
}`}
                      />
                    </div>
                  </div>
                </div>

                <Endpoint
                  method="PATCH"
                  path="/manage-tasks?id=<task_uuid>"
                  description="Update task assignment. Admin or Dev only."
                  auth="Admin or Dev (JWT or PAT)"
                  queryParams={[{ name: "id", type: "uuid", description: "The task ID to update" }]}
                  requestBody={`{
  "assigned_to": "string or string[] - email, profile ID, or department email"
}`}
                  responseExample={`{
  "data": {
    "id": "task-uuid",
    "assigned_to": ["user-uuid-1", "user-uuid-2"],
    ...
  }
}`}
                />

                <Endpoint
                  method="PATCH"
                  path="/manage-tasks?id=<task_uuid>"
                  description="Update lead-alert task details (timeSinceLastLead, alertLevel). Only works for lead-alert type tasks."
                  auth="Admin or Dev (JWT or PAT)"
                  queryParams={[{ name: "id", type: "uuid", description: "The lead-alert task ID to update" }]}
                  requestBody={`{
  "timeSinceLastLead": "96 hours",  // Optional - update time since last lead
  "alertLevel": "red"               // Optional - must be "yellow" or "red"
}`}
                  responseExample={`{
  "data": {
    "id": "task-uuid",
    "type": "lead-alert",
    "title": "Lead Alert: Client Name",
    "status": "pending",
    "details": {
      "clientName": "Acme Corp",
      "category": "Tech",
      "whatsapp": "+1234567890",
      "clientStatus": "Active",
      "alertLevel": "red",
      "issue": "No leads sent recently",
      "timeSinceLastLead": "96 hours"
    },
    "updated_at": "2026-01-27T10:00:00Z"
  }
}`}
                />

                <Endpoint
                  method="DELETE"
                  path="/manage-tasks"
                  description="Delete a task by ID. Admin only."
                  auth="Admin only"
                  queryParams={[{ name: "id", type: "uuid", description: "The task ID to delete" }]}
                  responseExample={`{
  "success": true
}`}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers API */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customers API
                </CardTitle>
                <CardDescription>
                  Manage customers. Admin only access. Includes lead tracking statistics.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Endpoint
                  method="GET"
                  path="/manage-customers"
                  description="Fetch all customers with lead statistics."
                  auth="Admin only"
                  responseExample={`{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Corporation",
      "email": "contact@acme.com",
      "phone": "+1234567890",
      "company": "Acme Inc",
      "total_leads_sent": 15,
      "last_lead_sent_at": "2026-01-21T14:30:00Z",
      "created_at": "2026-01-01T10:00:00Z"
    }
  ]
}`}
                />

                <Endpoint
                  method="POST"
                  path="/manage-customers"
                  description="Add a new customer."
                  auth="Admin only"
                  requestBody={`{
  "name": "Customer Name (required)",
  "email": "email@example.com (required)",
  "phone": "+1234567890 (optional)",
  "company": "Company Name (optional)"
}`}
                  responseExample={`{
  "data": {
    "id": "new-customer-uuid",
    "name": "Customer Name",
    "email": "email@example.com",
    "phone": "+1234567890",
    "company": "Company Name",
    "total_leads_sent": 0,
    "last_lead_sent_at": null,
    "created_at": "2026-01-22T10:00:00Z"
  }
}`}
                />

                <Endpoint
                  method="DELETE"
                  path="/manage-customers"
                  description="Remove a customer by ID."
                  auth="Admin only"
                  queryParams={[{ name: "id", type: "uuid", description: "The customer ID to delete" }]}
                  responseExample={`{
  "success": true
}`}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leads API */}
          <TabsContent value="leads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Lead Tracking API
                </CardTitle>
                <CardDescription>
                  Track leads sent to customers. Increments the counter and updates timestamp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Endpoint
                  method="POST"
                  path="/record-lead-sent"
                  description="Record that a lead was sent to a customer. Increments total_leads_sent and updates last_lead_sent_at."
                  auth="Any authenticated user"
                  requestBody={`{
  "customer_id": "customer-uuid (required)"
}`}
                  responseExample={`{
  "data": {
    "id": "customer-uuid",
    "name": "Customer Name",
    "email": "email@example.com",
    "total_leads_sent": 16,
    "last_lead_sent_at": "2026-01-22T10:30:00Z"
  },
  "message": "Lead recorded. Total leads sent: 16"
}`}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channels API */}
          <TabsContent value="channels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Channels API
                </CardTitle>
                <CardDescription>
                  Send messages to chat channels from external sources. No authentication required.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Endpoint
                  method="POST"
                  path="/send-channel-message"
                  description="Send a message to a chat channel from webhooks or automations. No authentication required."
                  auth="None (public endpoint)"
                  requestBody={`{
  "channelId": "main",  // Use slug (main, dev, ops) or full UUID
  "message": "Hello from automation!\\\\n\\\\n**Bold text** and [links](https://example.com) work too!",
  "sender": "Daily Report Bot"  // Display name for the sender
}`}
                  responseExample={`{
  "success": true,
  "messageId": "generated-uuid",
  "channelId": "channel-uuid",
  "sender": "Daily Report Bot",
  "createdAt": "2026-01-26T10:00:00Z"
}`}
                />

                {/* Available Channels */}
                <div className="border rounded-lg p-4 space-y-4 bg-primary/5 border-primary/20">
                  <h4 className="font-medium text-foreground">Available Channel Slugs</h4>
                  <p className="text-sm text-muted-foreground">
                    Use these slugs in the <code className="text-primary">channelId</code> field:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        main
                      </Badge>
                      <span className="text-sm text-muted-foreground">Main channel - accessible by all roles</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        dev
                      </Badge>
                      <span className="text-sm text-muted-foreground">Developers channel - admin and dev only</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        ops
                      </Badge>
                      <span className="text-sm text-muted-foreground">Operations channel - admin and ops only</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 View all channels with their IDs at{" "}
                    <a href="/channels" className="text-primary hover:underline">
                      /channels
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outreach API */}
          <TabsContent value="outreach" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Outreach API
                </CardTitle>
                <CardDescription>
                  Add social media outreach entries and manage old entries. Designed for n8n integration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Endpoint
                  method="POST"
                  path="/outreach-add-entry"
                  description="Add a new outreach entry from Reddit, LinkedIn, or X. No authentication required (uses service role)."
                  auth="None (public endpoint)"
                  requestBody={`{
  "source": "reddit",           // Required: "reddit" | "linkedin" | "X"
  "date": "2026-02-04",         // Required: ISO date (YYYY-MM-DD)
  "link": "https://...",        // Required: URL string
  "comment": "Your comment",    // Required: string
  "notes": "Optional notes"     // Optional: string
}`}
                  responseExample={`{
  "success": true,
  "message": "Entry added successfully",
  "data": {
    "id": "uuid-here",
    "platform": "reddit",
    "date": "2026-02-04",
    "link": "https://..."
  }
}`}
                />

                {/* Error Examples */}
                <div className="border rounded-lg p-4 space-y-4 bg-destructive/5 border-destructive/20">
                  <h4 className="font-medium text-foreground">Error Responses</h4>
                  <div className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2 border-destructive/30 text-destructive">
                        400 - Missing Fields
                      </Badge>
                      <CodeBlock
                        code={`{
  "error": "Missing required fields",
  "required": {
    "source": "reddit | linkedin | X",
    "date": "ISO date string (YYYY-MM-DD)",
    "link": "string (URL)",
    "comment": "string"
  },
  "optional": {
    "notes": "string"
  }
}`}
                      />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2 border-destructive/30 text-destructive">
                        400 - Invalid Source
                      </Badge>
                      <CodeBlock
                        code={`{
  "error": "Invalid source. Must be: reddit, linkedin, or X"
}`}
                      />
                    </div>
                  </div>
                </div>

                <Endpoint
                  method="POST"
                  path="/outreach-delete-old"
                  description="Delete entries older than a specified number of days. Optionally filter by platform."
                  auth="None (public endpoint)"
                  requestBody={`{
  "days_old": 30,              // Required: number > 0
  "platform": "reddit"         // Optional: "reddit" | "linkedin" | "X"
}`}
                  responseExample={`{
  "success": true,
  "message": "Deleted entries older than 30 days",
  "deleted_count": 15,
  "cutoff_date": "2026-01-05",
  "platform": "reddit"
}`}
                />

                {/* n8n Integration Examples */}
                <div className="border rounded-lg p-4 space-y-4 bg-primary/5 border-primary/20">
                  <h4 className="font-medium text-foreground">n8n Integration Examples</h4>
                  <p className="text-sm text-muted-foreground">
                    Ready-to-use configurations for n8n HTTP Request nodes.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Add Entry from Reddit Scrape
                      </Badge>
                      <CodeBlock
                        code={`// HTTP Request Node Configuration
Method: POST
URL: ${BASE_URL}/outreach-add-entry
Headers: Content-Type: application/json
Body:
{
  "source": "reddit",
  "date": "{{ $now.format('YYYY-MM-DD') }}",
  "link": "{{ $json.post_url }}",
  "comment": "{{ $json.suggested_comment }}"
}`}
                      />
                    </div>

                    <div>
                      <Badge variant="outline" className="mb-2">
                        Daily Cleanup (Cron Trigger)
                      </Badge>
                      <CodeBlock
                        code={`// Schedule: 0 0 * * * (daily at midnight)
// HTTP Request Node Configuration
Method: POST
URL: ${BASE_URL}/outreach-delete-old
Headers: Content-Type: application/json
Body:
{
  "days_old": 30
}`}
                      />
                    </div>
                  </div>
                </div>

                {/* cURL Examples */}
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <h4 className="font-medium text-foreground">cURL Commands</h4>

                  <div className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Add Entry
                      </Badge>
                      <CodeBlock
                        code={`curl -X POST "${BASE_URL}/outreach-add-entry" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "reddit",
    "date": "2026-02-04",
    "link": "https://reddit.com/r/example/post",
    "comment": "Great insight! Have you considered...",
    "notes": "High priority lead"
  }'`}
                      />
                    </div>

                    <div>
                      <Badge variant="outline" className="mb-2">
                        Delete Old Entries
                      </Badge>
                      <CodeBlock
                        code={`curl -X POST "${BASE_URL}/outreach-delete-old" \\
  -H "Content-Type: application/json" \\
  -d '{
    "days_old": 30,
    "platform": "reddit"
  }'`}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Error Responses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Error Responses</CardTitle>
            <CardDescription>Common error response formats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium mb-2">401 Unauthorized</h4>
                <CodeBlock
                  code={`{
  "error": "Missing authorization header"
}
// or
{
  "error": "Invalid token"
}`}
                />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">403 Forbidden</h4>
                <CodeBlock
                  code={`{
  "error": "Only admins can create tasks"
}`}
                />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">400 Bad Request</h4>
                <CodeBlock
                  code={`{
  "error": "Missing required fields",
  "required": {
    "type": "lead-approval | ...",
    "title": "string"
  }
}`}
                />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">404 Not Found</h4>
                <CodeBlock
                  code={`{
  "error": "Customer not found"
}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
