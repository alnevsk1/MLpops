import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import api from '../api';

function SettingsPage() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [hasTokenSaved, setHasTokenSaved] = useState(false);

  useEffect(() => {
    api.get('/users/profile/')
      .then(res => setHasTokenSaved(res.data.has_token))
      .catch(err => console.error("Ошибка загрузки профиля", err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/profile/', { hf_token: token });
      setStatusMsg({ text: 'Токен успешно сохранен!', type: 'success' });
      setHasTokenSaved(true);
      setToken(''); // Очищаем поле ввода для безопасности
    } catch (err) {
      setStatusMsg({ text: 'Ошибка при сохранении токена', type: 'error' });
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Настройки профиля</h1>
      
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Концепция BYOK (Bring Your Own Key)</h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          В системе нет общего токена. Введите ваш личный Hugging Face токен (Read) для запуска инференса. Он надежно шифруется в базе данных.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSave}>
          <label className="block text-sm font-medium mb-2">
            Ваш Hugging Face Token 
            {hasTokenSaved && <span className="ml-2 text-green-500 text-xs">(Токен уже сохранен в системе)</span>}
          </label>
          
          <div className="relative mb-4">
            <input
              type={showToken ? 'text' : 'password'}
              placeholder={hasTokenSaved ? "Введите новый токен для замены" : "hf_..."}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              className="w-full border p-2 pr-10 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
            Сохранить токен
          </button>
        </form>

        {statusMsg.text && (
          <div className={`mt-4 p-3 rounded text-sm ${statusMsg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {statusMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;