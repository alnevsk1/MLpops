import React, { useState } from 'react';
import api from '../api';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', password_confirm: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Очищаем ошибку поля при изменении
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Клиентская валидация для регистрации
    if (!isLogin) {
      const newErrors = {};
      
      if (!formData.username || formData.username.trim() === '') {
        newErrors.username = 'Логин не может быть пустым';
      }
      if (!formData.password || formData.password.trim() === '') {
        newErrors.password = 'Пароль не может быть пустым';
      }
      if (formData.password !== formData.password_confirm) {
        newErrors.password_confirm = 'Пароли не совпадают';
      }
      
      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
        setError('Исправьте ошибки в форме');
        return;
      }
    }

    try {
      if (!isLogin) {
        await api.post('/auth/register/', { username: formData.username, password: formData.password, password_confirm: formData.password_confirm });
      }
      
      const res = await api.post('/auth/login/', { username: formData.username, password: formData.password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      window.location.href = '/';
    } catch (err) {
      const data = err.response?.data;
      const newErrors = {};

      // Парсим ошибки от DRF (они могут быть в разных форматах)
      if (typeof data === 'object' && data !== null) {
        // Обработка ошибок по полям
        if (data.username) {
          const msg = Array.isArray(data.username) ? data.username[0] : data.username;
          newErrors.username = msg;
        }
        if (data.password) {
          const msg = Array.isArray(data.password) ? data.password[0] : data.password;
          newErrors.password = msg;
        }
        if (data.password_confirm) {
          const msg = Array.isArray(data.password_confirm) ? data.password_confirm[0] : data.password_confirm;
          newErrors.password_confirm = msg;
        }
        
        // Обработка общих ошибок
        if (data.detail) {
          setError(data.detail);
        } else if (data.non_field_errors) {
          const msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
          setError(msg);
        } else if (Object.keys(newErrors).length === 0) {
          setError('Ошибка авторизации. Проверьте данные.');
        }
      } else {
        setError('Ошибка авторизации. Проверьте данные.');
      }

      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-0">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
          {isLogin ? 'Вход в систему' : 'Регистрация'}
        </h2>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Логин</label>
            <input 
              type="text" name="username" required
              className={`w-full border p-2 sm:p-3 rounded text-base dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${fieldErrors.username ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
              onChange={handleChange}
            />
            {fieldErrors.username && <p className="text-red-600 text-sm mt-1">{fieldErrors.username}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <input 
              type="password" name="password" required
              className={`w-full border p-2 sm:p-3 rounded text-base dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${fieldErrors.password ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
              onChange={handleChange}
            />
            {fieldErrors.password && <p className="text-red-600 text-sm mt-1">{fieldErrors.password}</p>}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1">Подтверждение пароля</label>
              <input 
                type="password" name="password_confirm" required={!isLogin}
                className={`w-full border p-2 sm:p-3 rounded text-base dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${fieldErrors.password_confirm ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                onChange={handleChange}
              />
              {fieldErrors.password_confirm && <p className="text-red-600 text-sm mt-1">{fieldErrors.password_confirm}</p>}
            </div>
          )}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-2 sm:p-3 rounded transition-colors font-medium text-base">
            {isLogin ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {isLogin ? 'Еще нет аккаунта? ' : 'Уже есть аккаунт? '}
          </span>
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-500 hover:underline font-medium">
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;