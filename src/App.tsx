import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RealtimeNotificationsProvider } from "@/components/notifications/RealtimeNotificationsProvider";
import Index from "./pages/Index";
import Tasks from "./pages/Tasks";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import CreateTask from "./pages/admin/CreateTask";
import ApiDocs from "./pages/admin/ApiDocs";
import TokenManagement from "./pages/admin/TokenManagement";
import WebhookManagement from "./pages/admin/WebhookManagement";
import WebhookLogs from "./pages/admin/WebhookLogs";
import CompletedTasks from "./pages/admin/CompletedTasks";
import ChannelManagement from "./pages/admin/ChannelManagement";
import CustomerDashboard from "./pages/admin/CustomerDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RealtimeNotificationsProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              } />
              <Route path="/chat" element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } />
              {/* API Docs accessible by admin and dev */}
              <Route path="/api-docs" element={
                <ProtectedRoute requireDevOrAdmin>
                  <ApiDocs />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requireAdmin>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/create-task" element={
                <ProtectedRoute requireAdmin>
                  <CreateTask />
                </ProtectedRoute>
              } />
              <Route path="/admin/completed-tasks" element={
                <ProtectedRoute requireAdmin>
                  <CompletedTasks />
                </ProtectedRoute>
              } />
              <Route path="/tokens" element={
                <ProtectedRoute requireDevOrAdmin>
                  <TokenManagement />
                </ProtectedRoute>
              } />
              <Route path="/webhooks" element={
                <ProtectedRoute requireDevOrAdmin>
                  <WebhookManagement />
                </ProtectedRoute>
              } />
              <Route path="/webhook-logs" element={
                <ProtectedRoute requireDevOrAdmin>
                  <WebhookLogs />
                </ProtectedRoute>
              } />
              <Route path="/channels" element={
                <ProtectedRoute requireDevOrAdmin>
                  <ChannelManagement />
                </ProtectedRoute>
              } />
              <Route path="/customers" element={
                <ProtectedRoute requireOpsOrAdmin>
                  <CustomerDashboard />
                </ProtectedRoute>
              } />
              {/* Keep old route for backwards compatibility */}
              <Route path="/admin/api-docs" element={
                <ProtectedRoute requireDevOrAdmin>
                  <ApiDocs />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RealtimeNotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
