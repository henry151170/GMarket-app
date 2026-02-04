import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import WorkerDashboard from './pages/dashboard/WorkerDashboard';
import RegisterIncomePage from './pages/worker/RegisterIncomePage';
import UsersPage from './pages/admin/UsersPage';
import IncomesPage from './pages/admin/IncomesPage';
import ExpensesPage from './pages/admin/ExpensesPage';
import SuppliersPage from './pages/admin/SuppliersPage';
import PurchasesPage from './pages/admin/PurchasesPage';
import ReportsPage from './pages/admin/ReportsPage';
import OtherIncomesPage from './pages/admin/OtherIncomesPage';
import FinancialHealthPage from './pages/admin/FinancialHealthPage';
import TransfersPage from './pages/admin/TransfersPage';
import SettingsPage from './pages/admin/SettingsPage';
import ForecastPage from './pages/admin/ForecastPage';
import WorkerExpensesPage from './pages/worker/WorkerExpensesPage';
import WorkerHistoryPage from './pages/worker/WorkerHistoryPage';

function RootRedirect() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-500">Cargando...</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile?.role === 'worker') return <Navigate to="/worker" replace />;

  // User is authenticated but has no profile or invalid role
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Error de Perfil</h2>
        <p className="text-gray-600 mb-6">
          Tu usuario está autenticado pero no tiene un perfil asignado en esta base de datos.
          Esto puede ocurrir si cambiaste de entorno.
        </p>
        <button
          onClick={() => signOut()}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          Cerrar Sesión e Intentar Nuevamente
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="incomes" element={<IncomesPage />} />
              <Route path="incomes/new" element={<RegisterIncomePage />} />
              <Route path="incomes/edit/:id" element={<RegisterIncomePage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="financial-health" element={<FinancialHealthPage />} />
              <Route path="forecast" element={<ForecastPage />} />
              <Route path="other-incomes" element={<OtherIncomesPage />} />
              <Route path="transfers" element={<TransfersPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Worker Routes */}
          <Route path="/worker" element={<ProtectedRoute allowedRoles={['worker']} />}>
            <Route element={<AppLayout />}>
              <Route index element={<WorkerDashboard />} />
              <Route path="incomes/new" element={<RegisterIncomePage />} />
              {/* Added Edit Route for Worker */}
              <Route path="incomes/edit/:id" element={<RegisterIncomePage />} />
              <Route path="expenses/new" element={<WorkerExpensesPage />} />
              <Route path="history" element={<WorkerHistoryPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
