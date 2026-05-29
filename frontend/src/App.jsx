import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Sun, Moon, User, Menu, X } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import CatalogPage from './pages/CatalogPage';
import PlaygroundPage from './pages/PlaygroundPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import ErrorBoundary from './components/ErrorBoundary';
import { USER_ROLES } from './constants';

const ProtectedRoute = ({ children, isAdmin = false }) => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (isAdmin && role !== USER_ROLES.ADMIN) return <div className="text-center py-8">Доступ запрещен</div>;
  return children;
};

const NavLink = ({ to, label, isActive }) => (
  <Link to={to} className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-default'}`}>
    {label}
  </Link>
);

const Logo = ({ isDark }) => {
  return isDark ? (
    <svg className="w-auto h-12 sm:h-14 py-1" xmlns="http://www.w3.org/2000/svg" viewBox="50 60 400 350">
      <text x="250" y="210" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="135" fontWeight="bold" fill="#ffffff" textAnchor="middle">Open</text>
      <rect x="85" y="245" width="330" height="190" rx="18" ry="18" fill="#fa9506" />
      <text x="250" y="380" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="135" fontWeight="bold" fill="#1f2937" textAnchor="middle">hub</text>
    </svg>
  ) : (
    <svg className="w-auto h-12 sm:h-14 py-1" xmlns="http://www.w3.org/2000/svg" viewBox="50 60 400 350">
      <text x="250" y="210" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="135" fontWeight="bold" fill="#1f2937" textAnchor="middle">Open</text>
      <rect x="85" y="245" width="330" height="190" rx="18" ry="18" fill="#2b76f0" />
      <text x="250" y="380" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="135" fontWeight="bold" fill="#ffffff" textAnchor="middle">hub</text>
    </svg>
  );
};

function AppContent() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { username, role, isLoading, isAuthenticated, handleLogout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center h-full focus:outline-none">
            <Logo isDark={isDark} />
          </Link>

          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-xs sm:text-sm font-medium">
              {role === USER_ROLES.ADMIN && <NavLink to="/admin" label="Админ-панель" isActive={isActive('/admin')} />}
              <NavLink to="/" label="Каталог" isActive={isActive('/')} />
              <NavLink to="/history" label="История" isActive={isActive('/history')} />
              <NavLink to="/settings" label="Настройки" isActive={isActive('/settings')} />
              <div className="flex items-center text-gray-500 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 pl-4">
                <User size={16} className="mr-2" />
                <span className="hidden lg:inline">{username}</span>
              </div>
              <button onClick={handleLogout} className="text-red-500 hover:text-red-600 font-medium">Выйти</button>
            </nav>
          )}

          {isAuthenticated && (
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden ml-auto btn-icon mr-2">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}

          <button onClick={toggleTheme} className="btn-icon">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {isAuthenticated && mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
            {role === USER_ROLES.ADMIN && (
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={`block py-2 px-4 rounded transition-colors ${isActive('/admin') ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                Админ-панель
              </Link>
            )}
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`block py-2 px-4 rounded transition-colors ${isActive('/') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
              Каталог
            </Link>
            <Link to="/history" onClick={() => setMobileMenuOpen(false)} className={`block py-2 px-4 rounded transition-colors ${isActive('/history') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
              История
            </Link>
            <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className={`block py-2 px-4 rounded transition-colors ${isActive('/settings') ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
              Настройки
            </Link>
            <div className="flex items-center text-gray-500 dark:text-gray-400 py-2 px-4 border-t border-gray-200 dark:border-gray-700 mt-2">
              <User size={16} className="mr-2" />
              <span>{username}</span>
            </div>
            <button onClick={handleLogout} className="text-left text-red-500 hover:text-red-600 py-2 px-4 w-full rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
              Выйти
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
        ) : (
          <ErrorBoundary>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<ProtectedRoute><CatalogPage /></ProtectedRoute>} />
              <Route path="/playground/:id" element={<ProtectedRoute><PlaygroundPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute isAdmin={true}><AdminPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/auth"} replace />} />
            </Routes>
          </ErrorBoundary>
        )}
      </main>

      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="text-center text-gray-500 text-sm">© 2026 OpenHub. Сделано в Google AI Studio :)</div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
