import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Condominiums from "@/pages/Condominiums";
import Condominium from "@/pages/Condominium";
import AuditReport from "@/pages/AuditReport";
import DefaultReport from "@/pages/DefaultReport";
import Settings from "@/pages/Settings";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log("Auth state:", { isAuthenticated, isLoading });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <Switch>
          <Route path="/" component={Condominiums} />
          <Route path="/condominiums" component={Condominiums} />
          <Route path="/condominium/:id" component={Condominium} />
          <Route path="/audit-report/:id" component={AuditReport} />
          <Route path="/default-report" component={DefaultReport} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={AdminPanel} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
