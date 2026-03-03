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
import CustomerDashboard from "./pages/admin/CustomerDashboard";
import CrmDashboard from "./pages/crm/CrmDashboard";
import SourcesMonitor from "./pages/admin/SourcesMonitor";
import ActivityLog from "./pages/admin/ActivityLog";
import DevTools from "./pages/admin/DevTools";

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
              <Route path="/customers" element={
                <ProtectedRoute requireOpsOrAdmin>
                  <CustomerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/crm" element={
                <ProtectedRoute requireOpsOrAdmin>
                  <CrmDashboard />
                </ProtectedRoute>
              } />
              <Route path="/sources" element={
                <ProtectedRoute requireOpsOrAdmin>
                  <SourcesMonitor />
                </ProtectedRoute>
              } />
              <Route path="/activity" element={
                <ProtectedRoute requireAdmin>
                  <ActivityLog />
                </ProtectedRoute>
              } />
              <Route path="/dev-tools" element={
                <ProtectedRoute requireAdmin>
                  <DevTools />
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
