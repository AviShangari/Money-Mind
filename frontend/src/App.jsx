import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Overview from "./pages/Overview";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Debt from "./pages/Debt";
import Insights from "./pages/Insights";
import Chat from "./pages/Chat";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="debt" element={<Debt />} />
              <Route path="insights" element={<Insights />} />
              <Route path="chat" element={<Chat />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
