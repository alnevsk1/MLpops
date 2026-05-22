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
    
    // Проверка формата токена
    if (!token.startsWith('hf_')) {
      setStatusMsg({ text: 'Токен должен начинаться с "hf_"', type: 'error' });
      return;
    }
    
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
    <div className="max-w-3xl mx-auto px-0 sm:px-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Настройки профиля</h1>
      
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 sm:p-4 rounded-lg mb-6 text-sm sm:text-base">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Концепция BYOK (Bring Your Own Key)</h3>
        <p className="text-blue-700 dark:text-blue-400 leading-relaxed">
          В системе нет общего токена. Введите ваш личный Hugging Face токен (Read) для запуска инференса. Он надежно шифруется в базе данных.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
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
              className="w-full border p-2 sm:p-3 pr-10 rounded text-base dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
            >
              {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 sm:py-3 rounded transition-colors font-medium text-sm">
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