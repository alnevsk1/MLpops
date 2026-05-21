import React, { useState, useEffect } from 'react';
import api from '../api';

function AdminPage() {
  const [activeTab, setActiveTab] = useState('models');
  
  // Уведомления (вместо alert)
  const [notify, setNotify] = useState({ text: '', type: '' });
  const showNotify = (text, type = 'success') => {
    setNotify({ text, type });
    setTimeout(() => setNotify({ text: '', type: '' }), 4000);
  };
  
  // Состояния для моделей
  const [tags, setTags] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [editingModelId, setEditingModelId] = useState(null);
  
  const defaultModelForm = { name: '', endpoint_url: '', hf_model_id: '', output_type: 'TEXT', status: 'UNKNOWN', tags: [] };
  const [modelForm, setModelForm] = useState(defaultModelForm);
  const [initialModelForm, setInitialModelForm] = useState(defaultModelForm); // Хранит исходное состояние
  
  // Состояния для тегов и логов
  const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6' });
  const [globalLogs, setGlobalLogs] = useState([]);
  const [filters, setFilters] = useState({ user: '', model: '', status: '' });
  const [csvFile, setCsvFile] = useState(null);

  useEffect(() => {
    fetchTags();
    if (activeTab === 'models') fetchModels();
    if (activeTab === 'logs') fetchGlobalLogs();
  }, [activeTab]);

  const fetchTags = () => api.get('/tags/').then(res => setTags(res.data));
  const fetchModels = () => api.get('/models/').then(res => setModelsList(res.data));
  const fetchGlobalLogs = () => {
    const params = new URLSearchParams();
    if (filters.user) params.append('user', filters.user);
    if (filters.model) params.append('model', filters.model);
    if (filters.status) params.append('status', filters.status);
    api.get(`/logs/all/?${params.toString()}`).then(res => setGlobalLogs(res.data));
  };

  // --- ЛОГИКА ФОРМЫ МОДЕЛЕЙ ---
  const handleSelectModel = (e) => {
    const val = e.target.value;
    if (val === 'NEW') {
      setEditingModelId(null);
      setModelForm(defaultModelForm);
      setInitialModelForm(defaultModelForm);
    } else {
      const selected = modelsList.find(m => m.id === parseInt(val));
      setEditingModelId(selected.id);
      const formData = {
        name: selected.name,
        endpoint_url: selected.endpoint_url || '',
        hf_model_id: selected.hf_model_id || '',
        output_type: selected.output_type,
        status: selected.status,
        tags: selected.tags.map(t => t.id)
      };
      setModelForm(formData);
      setInitialModelForm(JSON.parse(JSON.stringify(formData))); // Сохраняем исходник для проверки изменений
    }
  };

  // Умная проверка изменений (чтобы блокировать кнопку)
  const isModelFormDirty = () => {
    const current = { ...modelForm, tags: [...modelForm.tags].sort() };
    const initial = { ...initialModelForm, tags: [...initialModelForm.tags].sort() };
    return JSON.stringify(current) !== JSON.stringify(initial);
  };

  const handleSaveModel = async (e) => {
    e.preventDefault();
    
    // Проверка обязательности тегов
    if (modelForm.tags.length === 0) {
      showNotify('Необходимо выбрать хотя бы один тег', 'error');
      return;
    }
    
    try {
      let savedModelId = editingModelId;
      
      if (editingModelId) {
        await api.put(`/models/${editingModelId}/`, modelForm);
        showNotify('Модель успешно обновлена!');
      } else {
        // При создании принудительно ставим UNKNOWN, затем проверяем
        const res = await api.post('/models/', { ...modelForm, status: 'UNKNOWN' });
        savedModelId = res.data.id;
        showNotify('Модель добавлена. Проверяем доступность...', 'info');
      }

      // АВТО-ПРОВЕРКА СТАТУСА
      const checkRes = await api.post(`/models/${savedModelId}/check-status/`);
      const finalStatus = checkRes.data.status;
      
      if (finalStatus === 'ONLINE') showNotify(`Модель активна (${finalStatus})`, 'success');
      else showNotify(`Модель недоступна (${finalStatus})`, 'error');

      // Обновляем списки и сбрасываем "грязность" формы
      await fetchModels();
      const updatedForm = { ...modelForm, status: finalStatus };
      setModelForm(updatedForm);
      setInitialModelForm(JSON.parse(JSON.stringify(updatedForm)));
      
      if (!editingModelId) setEditingModelId(savedModelId); // Переводим форму в режим редактирования
      
    } catch (err) {
      showNotify('Ошибка при сохранении модели', 'error');
    }
  };

  // --- ЛОГИКА ТЕГОВ И CSV ---
  const handleSaveTag = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tags/', newTag);
      setNewTag({ name: '', color: '#3b82f6' });
      fetchTags();
      showNotify('Тег создан!');
    } catch (err) {
      showNotify('Ошибка при создании тега', 'error');
    }
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm("Удалить этот тег?")) return;
    try {
      await api.delete(`/tags/${id}/`);
      fetchTags();
      if (activeTab === 'models') fetchModels();
      showNotify('Тег удален!');
    } catch (err) {
      showNotify('Ошибка при удалении', 'error');
    }
  };

  const handleImportCSV = async (e) => {
    e.preventDefault();
    if (!csvFile) return showNotify('Выберите файл', 'error');
    const formData = new FormData();
    formData.append('file', csvFile);
    try {
      const res = await api.post('/logs/import/', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      showNotify(res.data.message);
      setCsvFile(null);
      fetchGlobalLogs();
    } catch (err) {
      showNotify(err.response?.data?.error || 'Ошибка импорта', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto relative">
      {/* ПЛАВАЮЩИЕ УВЕДОМЛЕНИЯ */}
      {notify.text && (
        <div className={`fixed top-20 right-8 px-6 py-3 rounded shadow-lg z-50 transition-all font-medium text-white ${notify.type === 'error' ? 'bg-red-500' : notify.type === 'info' ? 'bg-blue-500' : 'bg-green-500'}`}>
          {notify.text}
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6 text-purple-600 dark:text-purple-400">Панель Администратора</h1>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 space-x-6">
        <button onClick={() => setActiveTab('models')} className={`pb-3 font-medium transition-colors ${activeTab === 'models' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>Управление Моделями</button>
        <button onClick={() => setActiveTab('tags')} className={`pb-3 font-medium transition-colors ${activeTab === 'tags' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>Настройка Тегов</button>
        <button onClick={() => setActiveTab('logs')} className={`pb-3 font-medium transition-colors ${activeTab === 'logs' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>Логи и Импорт</button>
      </div>

      {/* ВКЛАДКА 1: МОДЕЛИ */}
      {activeTab === 'models' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 max-w-2xl">
          <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-semibold mb-2">Выберите модель для редактирования</label>
            <select onChange={handleSelectModel} value={editingModelId || 'NEW'} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 font-medium">
              <option value="NEW">-- Создать новую модель --</option>
              {modelsList.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.status})</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSaveModel} className="space-y-4">
            <div><label className="block text-sm mb-1">Имя модели</label><input required value={modelForm.name} onChange={e=>setModelForm({...modelForm, name: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600"/></div>
            <div><label className="block text-sm mb-1">Endpoint URL</label><input required type="url" value={modelForm.endpoint_url} onChange={e=>setModelForm({...modelForm, endpoint_url: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600"/></div>
            <div><label className="block text-sm mb-1">HF Model ID (Опционально)</label><input value={modelForm.hf_model_id} onChange={e=>setModelForm({...modelForm, hf_model_id: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600"/></div>
            
            <div className="flex space-x-4">
              <div className="flex-1"><label className="block text-sm mb-1">Тип вывода</label>
                <select value={modelForm.output_type} onChange={e=>setModelForm({...modelForm, output_type: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600">
                  <option value="TEXT">Text</option><option value="IMAGE">Image</option>
                </select>
              </div>
              <div className="flex-1"><label className="block text-sm mb-1">Статус (Авто-проверка)</label>
                <input value={modelForm.status} disabled className="w-full border p-2 rounded bg-gray-100 dark:bg-gray-900 text-gray-500 font-bold" />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">Присвоенные теги <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {tags.map(tag => (
                  <span 
                    key={tag.id} 
                    onClick={() => setModelForm(prev => ({...prev, tags: prev.tags.includes(tag.id) ? prev.tags.filter(id => id !== tag.id) : [...prev.tags, tag.id]}))} 
                    style={{ backgroundColor: tag.color, opacity: modelForm.tags.includes(tag.id) ? 1 : 0.3 }} 
                    className="px-3 py-1 text-white rounded cursor-pointer text-sm font-medium transition-opacity hover:opacity-80"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              {modelForm.tags.length === 0 && <p className="text-red-500 text-xs mt-1">Выберите хотя бы один тег</p>}
            </div>
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={!isModelFormDirty() || modelForm.tags.length === 0}
                className={`w-full px-4 py-2 rounded transition-colors font-medium text-white 
                  ${isModelFormDirty() && modelForm.tags.length > 0 ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed opacity-70'}
                `}
              >
                {editingModelId ? 'Сохранить изменения' : 'Зарегистрировать и проверить'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ВКЛАДКА 2: ТЕГИ */}
      {activeTab === 'tags' && (
        <div className="grid md:grid-cols-2 gap-8">
          <form onSubmit={handleSaveTag} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-4">Создать новый тег</h2>
            <div className="mb-4">
              <label className="block text-sm mb-1">Название тега</label>
              <input required value={newTag.name} onChange={e=>setNewTag({...newTag, name: e.target.value})} className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Например: NLP, Stable Diffusion..."/>
            </div>
            <div className="mb-6">
              <label className="block text-sm mb-1">Цвет (HEX)</label>
              <div className="flex items-center space-x-3">
                <input required type="color" value={newTag.color} onChange={e=>setNewTag({...newTag, color: e.target.value})} className="h-10 w-16 p-0 border-0 rounded cursor-pointer"/>
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{newTag.color.toUpperCase()}</span>
              </div>
            </div>
            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">Создать тег</button>
          </form>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-4">Существующие теги</h2>
            <div className="flex flex-wrap gap-3">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900 pr-2 rounded overflow-hidden border dark:border-gray-700">
                  <div className="w-4 h-full py-3" style={{ backgroundColor: tag.color }}></div>
                  <span className="text-sm font-medium px-1">{tag.name}</span>
                  <button onClick={() => handleDeleteTag(tag.id)} className="text-red-500 hover:text-red-700 font-bold ml-2 text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ВКЛАДКА 3: ЛОГИ И CSV ИМПОРТ */}
      {activeTab === 'logs' && (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded flex gap-4 items-end">
              <div><label className="block text-xs mb-1">User Name или ID</label><input type="text" placeholder="" onChange={e=>setFilters({...filters, user: e.target.value})} className="border p-2 w-32 rounded dark:bg-gray-700 dark:border-gray-600"/></div>
              <div><label className="block text-xs mb-1">Model Name или ID</label><input type="text" placeholder="" onChange={e=>setFilters({...filters, model: e.target.value})} className="border p-2 w-32 rounded dark:bg-gray-700 dark:border-gray-600"/></div>
              <div><label className="block text-xs mb-1">HTTP Статус</label><input type="number" onChange={e=>setFilters({...filters, status: e.target.value})} className="border p-2 w-24 rounded dark:bg-gray-700 dark:border-gray-600"/></div>
              <button onClick={fetchGlobalLogs} className="bg-blue-600 text-white px-4 py-2 rounded">Применить фильтр</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm bg-white dark:bg-gray-800 rounded shadow">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <tr><th className="p-3">ID / Дата</th><th className="p-3">User (ID)</th><th className="p-3">Модель (ID)</th><th className="p-3">Статус</th><th className="p-3">Latency</th></tr>
                </thead>
                <tbody>
                  {globalLogs.map(log => (
                    <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-3 text-xs text-gray-500">{log.id} | {new Date(log.created_at).toLocaleString('ru-RU')}</td>
                      <td className="p-3">{log.username ? `${log.username} (${log.user_id})` : 'N/A'}</td>
                      <td className="p-3 font-medium">{log.model_name ? `${log.model_name} (${log.model_id})` : 'N/A'}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-white text-xs ${log.http_status === 200 ? 'bg-green-500' : 'bg-red-500'}`}>{log.http_status}</span></td>
                      <td className="p-3 font-mono text-xs">{log.latency_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 max-w-xl">
            <h2 className="font-semibold mb-2 text-lg">Массовый импорт старых логов (CSV)</h2>
            <p className="text-xs text-gray-500 mb-4">Требуемые колонки: model_id, user_id, latency_ms, http_status, req_payload, res_payload.</p>
            <form onSubmit={handleImportCSV} className="flex gap-4">
              <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} className="flex-1 border border-gray-200 dark:border-gray-600 p-2 rounded text-sm" />
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">Загрузить</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
