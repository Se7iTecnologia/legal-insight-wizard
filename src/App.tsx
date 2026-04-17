import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import Casos from "@/pages/Casos";
import CasoDetalhe from "@/pages/CasoDetalhe";
import Templates from "@/pages/Templates";
import Usuarios from "@/pages/Usuarios";
import DashboardFinanceiro from "@/pages/financeiro/DashboardFinanceiro";
import FluxoCaixa from "@/pages/financeiro/FluxoCaixa";
import ContratosFinanceiros from "@/pages/financeiro/ContratosFinanceiros";
import ContratoDetalhe from "@/pages/financeiro/ContratoDetalhe";
import RelatoriosFinanceiros from "@/pages/financeiro/RelatoriosFinanceiros";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/casos" element={<Casos />} />
              <Route path="/casos/:id" element={<CasoDetalhe />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/financeiro" element={<DashboardFinanceiro />} />
              <Route path="/financeiro/fluxo-caixa" element={<FluxoCaixa />} />
              <Route path="/financeiro/contratos" element={<ContratosFinanceiros />} />
              <Route path="/financeiro/contratos/:id" element={<ContratoDetalhe />} />
              <Route path="/financeiro/relatorios" element={<RelatoriosFinanceiros />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
