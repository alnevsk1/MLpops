import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Sun, Moon, User, Menu, X } from 'lucide-react';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import api from './api'; 
import CatalogPage from './pages/CatalogPage';
import PlaygroundPage from './pages/PlaygroundPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';

const ProtectedRoute = ({ children, isAuthenticated, isAdmin = false, role = 'USER' }) => {
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (isAdmin && role !== 'ADMIN') return <div className="text-center py-8">Доступ запрещен</div>;
  return children;
};

const NavLink = ({ to, label, isActive }) => (
  <Link to={to} className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-default'}`}>
    {label}
  </Link>
);

function App() {
  // Логика инициализации оставлена без изменений
  const [isDark, setIsDark] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('USER');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      }

      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/users/profile/');
          setUsername(res.data.username);
          setRole(res.data.role);
          setIsAuthenticated(true);
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };
    initializeApp();
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDark(!isDark);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth';
  };

  return (
    <BrowserRouter>
      <AppContent 
        isDark={isDark} toggleTheme={toggleTheme} username={username} role={role} 
        isLoading={isLoading} isAuthenticated={isAuthenticated} handleLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
      />
    </BrowserRouter>
  );
}

function AppContent({ isDark, toggleTheme, username, role, isLoading, isAuthenticated, handleLogout, mobileMenuOpen, setMobileMenuOpen }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
            Open Hub
          </div>
          
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-xs sm:text-sm font-medium">
              {role === 'ADMIN' && <NavLink to="/admin" label="Админ-панель" isActive={isActive('/admin')} />}
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
            {role === 'ADMIN' && <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={`block py-2 px-4 rounded ${isActive('/admin') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}>Админ-панель</Link>}
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`block py-2 px-4 rounded ${isActive('/') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>Каталог</Link>
            <Link to="/history" onClick={() => setMobileMenuOpen(false)} className={`block py-2 px-4 rounded ${isActive('/history') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>История</Link>
            <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className={`block py-2 px-4 rounded ${isActive('/settings') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>Настройки</Link>
            <div className="flex items-center text-gray-500 dark:text-gray-400 py-2 px-4 border-t border-gray-300 dark:border-gray-600 mt-2">
              <User size={16} className="mr-2" /><span>{username}</span>
            </div>
            <button onClick={handleLogout} className="text-left text-red-500 hover:text-red-600 py-2 px-4 w-full rounded hover:bg-gray-100">Выйти</button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
        ) : (
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute isAuthenticated={isAuthenticated}><CatalogPage /></ProtectedRoute>} />
            <Route path="/playground/:id" element={<ProtectedRoute isAuthenticated={isAuthenticated}><PlaygroundPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute isAuthenticated={isAuthenticated}><HistoryPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute isAuthenticated={isAuthenticated}><SettingsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute isAuthenticated={isAuthenticated} isAdmin={true} role={role}><AdminPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/auth"} replace />} />
          </Routes>
        )}
      </main>

      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
           <div className="text-center text-gray-500 text-sm">© 2026 Open Hub. Сделано в Google AI Studio :)</div>
        </div>
      </footer>
    </div>
  );
}

export default App;