import React, { useState } from 'react';
import api from '../api';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', confirm: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && formData.password !== formData.confirm) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      if (!isLogin) {
        await api.post('/auth/register/', { username: formData.username, password: formData.password });
      }
      
      const res = await api.post('/auth/login/', { username: formData.username, password: formData.password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      window.location.href = '/';
    } catch (err) {
      const data = err.response?.data;
      
      // Обработка ошибки от DRF, если логин уже занят
      if (data?.username) {
        setError('Такой пользователь уже существует');
      } else if (data?.detail) {
        setError(data.detail);
      } else {
        setError('Ошибка авторизации. Проверьте данные.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isLogin ? 'Вход в систему' : 'Регистрация'}
      </h2>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Логин</label>
          <input 
            type="text" name="username" required
            className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Пароль</label>
          <input 
            type="password" name="password" required
            className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={handleChange}
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-sm mb-1">Подтверждение пароля</label>
            <input 
              type="password" name="confirm" required={!isLogin}
              className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleChange}
            />
          </div>
        )}

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors">
          {isLogin ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {isLogin ? 'Еще нет аккаунта? ' : 'Уже есть аккаунт? '}
        </span>
        <button onClick={() => setIsLogin(!isLogin)} className="text-blue-500 hover:underline">
          {isLogin ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </div>
    </div>
  );
}

export default AuthPage;