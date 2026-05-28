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
    if (!token.startsWith('hf_')) {
      setStatusMsg({ text: 'Токен должен начинаться с "hf_"', type: 'error' }); return;
    }
    try {
      await api.post('/users/profile/', { hf_token: token });
      setStatusMsg({ text: 'Токен успешно сохранен!', type: 'success' });
      setHasTokenSaved(true); setToken('');
    } catch (err) {
      setStatusMsg({ text: 'Ошибка при сохранении токена', type: 'error' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="page-title">Настройки профиля</h1>
      
      <div className="alert-info">
        <div>
          <h3 className="font-semibold mb-1">Концепция BYOK (Bring Your Own Key)</h3>
          <p className="leading-relaxed">
            В системе нет общего токена. Введите ваш личный Hugging Face токен (Read) для запуска инференса. Он надежно шифруется в базе данных.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSave}>
          <label className="form-label text-base">
            Ваш Hugging Face Token 
            {hasTokenSaved && <span className="ml-2 text-green-500 text-xs">(Уже сохранен)</span>}
          </label>
          
          <div className="relative mb-6">
            <input
              type={showToken ? 'text' : 'password'}
              placeholder={hasTokenSaved ? "Введите новый токен для замены" : "hf_..."}
              value={token} onChange={(e) => setToken(e.target.value)}
              required className="form-input pr-10"
            />
            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon">
              {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="submit" className="btn-primary w-full sm:w-auto">Сохранить токен</button>
        </form>

        {statusMsg.text && (
          <div className={`mt-4 ${statusMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {statusMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;