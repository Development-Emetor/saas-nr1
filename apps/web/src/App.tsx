import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@workspace/auth-web";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import NR1Page from "@/pages/nr1/NR1Page";
import CampaignDetail from "@/pages/nr1/CampaignDetail";
import MatrizRiscoPage from "@/pages/nr1/MatrizRiscoPage";
import PlanoAcaoPage from "@/pages/nr1/PlanoAcaoPage";
import EvidenciasPage from "@/pages/nr1/EvidenciasPage";
import OrganizationsPage from "@/pages/OrganizationsPage";
import CarteiraPsicologoPage from "@/pages/profissional/CarteiraPsicologoPage";
import DocumentosAssinaturaPage from "@/pages/profissional/DocumentosAssinaturaPage";
import AgendaTecnicaPage from "@/pages/profissional/AgendaTecnicaPage";
import JobsPage from "@/pages/recruitment/JobsPage";
import JobDetail from "@/pages/recruitment/JobDetail";
import CandidatesPage from "@/pages/recruitment/CandidatesPage";
import CandidateDetail from "@/pages/recruitment/CandidateDetail";
import FoldersPage from "@/pages/recruitment/FoldersPage";
import ClientesPage from "@/pages/admin/ClientesPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0F4C75] flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-sm">PS</span>
          </div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        {/* NR-1 */}
        <Route path="/nr1" component={NR1Page} />
        <Route path="/nr1/ativa" component={NR1Page} />
        <Route path="/nr1/matriz-risco" component={MatrizRiscoPage} />
        <Route path="/nr1/plano-acao" component={PlanoAcaoPage} />
        <Route path="/nr1/evidencias" component={EvidenciasPage} />
        <Route path="/nr1/:id" component={CampaignDetail} />
        <Route path="/organizations" component={OrganizationsPage} />
        {/* Profissional */}
        <Route path="/profissional/carteira" component={CarteiraPsicologoPage} />
        <Route path="/profissional/documentos" component={DocumentosAssinaturaPage} />
        <Route path="/profissional/agenda" component={AgendaTecnicaPage} />
        {/* Recrutamento */}
        <Route path="/recruitment/jobs" component={JobsPage} />
        <Route path="/recruitment/jobs/:id" component={JobDetail} />
        <Route path="/recruitment/candidates" component={CandidatesPage} />
        <Route path="/recruitment/candidates/:id" component={CandidateDetail} />
        <Route path="/recruitment/folders" component={FoldersPage} />
        {/* Admin */}
        <Route path="/admin/clientes" component={ClientesPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthGate>
              <Router />
            </AuthGate>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
