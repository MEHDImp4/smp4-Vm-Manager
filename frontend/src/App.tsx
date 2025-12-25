import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Account from "./pages/Account";
import CreateInstance from "./pages/CreateInstance";
import InstanceDetails from "./pages/InstanceDetails";
import InstanceDomains from "./pages/InstanceDomains";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import Contact from "./pages/Contact";

import DockerGuide from "./pages/DockerGuide";
import Templates from "./pages/Templates";
import Tarification from "./pages/Tarification";

const queryClient = new QueryClient();

import Footer from "./components/Footer";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/account" element={<Account />} />
          <Route path="/guide" element={<DockerGuide />} />
          <Route path="/docker-guide" element={<DockerGuide />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/tarification" element={<Tarification />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />

          <Route path="/create" element={<CreateInstance />} />
          <Route path="/instance/:id" element={<InstanceDetails />} />
          <Route path="/instance/:id/domains" element={<InstanceDomains />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
