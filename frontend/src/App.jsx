import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Sun, Moon, User } from 'lucide-react';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import api from './api'; 
import CatalogPage from './pages/CatalogPage';
import PlaygroundPage from './pages/PlaygroundPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';

function App() {
  const [isDark, setIsDark] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('USER')
  const isAuthenticated = !!localStorage.getItem('access_token');

  // Инициализация темы
useEffect(() => {
  // 1. Инициализация темы (отрабатывает один раз при монтировании)
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    setIsDark(true);
    document.documentElement.classList.add('dark');
  }

  // 2. Управление данными профиля
  if (isAuthenticated) {
    api.get('/users/profile/')
      .then(res => {
        setUsername(res.data.username);
        setRole(res.data.role);
      }) // <-- Синтаксис исправлен здесь
      .catch(err => console.error("Ошибка загрузки профиля", err));
  } else {
    // Очищаем данные, если пользователь не авторизован
    setUsername('');
    setRole('USER');
  }
}, [isAuthenticated]); // Если api меняется, его тоже стоит добавить сюда

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
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {isAuthenticated ? (
              <>
                <Route path="/" element={<CatalogPage />} />
                <Route path="/playground/:id" element={<PlaygroundPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/admin" element={role === 'ADMIN' ? <AdminPage /> : <div>Доступ запрещен</div>} />
              </>
            ) : (
              <Route path="*" element={<AuthPage />} />
            )}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;