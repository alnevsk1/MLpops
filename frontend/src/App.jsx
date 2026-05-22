import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Sun, Moon, User } from 'lucide-react';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import api from './api'; 
import CatalogPage from './pages/CatalogPage';
import PlaygroundPage from './pages/PlaygroundPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';

// Компонент для защиты маршрутов
const ProtectedRoute = ({ children, isAuthenticated, isAdmin = false, role = 'USER' }) => {
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  if (isAdmin && role !== 'ADMIN') {
    return <div className="text-center py-8">Доступ запрещен</div>;
  }
  return children;
};

function App() {
  const [isDark, setIsDark] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('USER');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));

  // Инициализация темы и загрузка профиля
  useEffect(() => {
    const initializeApp = async () => {
      // 1. Инициализация темы
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      }

      // 2. Управление данными профиля
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/users/profile/');
          setUsername(res.data.username);
          setRole(res.data.role);
          setIsAuthenticated(true);
        } catch (err) {
          console.error("Ошибка загрузки профиля", err);
          // Если токен невалидный, удаляем его
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
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              MLOps Hub
            </div>
            
            {isAuthenticated && (
              <nav className="flex items-center space-x-6 text-sm font-medium">
                {role === 'ADMIN' && (
                  <Link to="/admin" className="text-purple-600 dark:text-purple-400 font-bold hover:text-purple-500 transition-colors">Админ-панель</Link>
                )}
                <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors">Каталог</Link>
                <Link to="/history" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors">История</Link>
                <Link to="/settings" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors">Настройки</Link>
                
                <div className="flex items-center text-gray-500 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 pl-6">
                  <User size={16} className="mr-2" />
                  <span>{username}</span>
                </div>
                <button onClick={handleLogout} className="text-red-500 hover:text-red-600 ml-4">Выйти</button>
              </nav>
            )}

            <button onClick={toggleTheme} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Основной контент */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              
              <Route path="/" element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <CatalogPage />
                </ProtectedRoute>
              } />
              
              <Route path="/playground/:id" element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <PlaygroundPage />
                </ProtectedRoute>
              } />
              
              <Route path="/history" element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <HistoryPage />
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute isAuthenticated={isAuthenticated} isAdmin={true} role={role}>
                  <AdminPage />
                </ProtectedRoute>
              } />
              
              {/* Редирект неизвестных маршрутов */}
              <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/auth"} replace />} />
            </Routes>
          )}
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;