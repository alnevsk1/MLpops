import React, { useState, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import api from '../api';

function AdminPage() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'models';
  });
  const [notify, setNotify] = useState({ text: '', type: '' });
  
  const showNotify = (text, type = 'success') => {
    setNotify({ text, type });
    setTimeout(() => setNotify({ text: '', type: '' }), 4000);
  };
  
  // States: Models
  const [tags, setTags] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const [editingModelId, setEditingModelId] = useState(null);
  const defaultModelForm = { name: '', endpoint_url: '', hf_model_id: '', output_type: 'TEXT', status: 'UNKNOWN', tags: [] };
  const [modelForm, setModelForm] = useState(defaultModelForm);
  const [initialModelForm, setInitialModelForm] = useState(defaultModelForm);
  
  // States: Tags & Logs
  const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6' });
  const [globalLogs, setGlobalLogs] = useState([]);
  const [filters, setFilters] = useState({ user: '', model: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedImage, setExpandedImage] = useState(null);
  const itemsPerPage = 10;
  
  // States: Modals
  const [deleteModalModel, setDeleteModalModel] = useState(null);
  const [deleteModalTag, setDeleteModalTag] = useState(null);

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
    fetchTags();
    if (activeTab === 'models') fetchModels();
    if (activeTab === 'logs') fetchGlobalLogs();
  }, [activeTab]);

  const fetchTags = () => api.get('/tags/').then(res => setTags(res.data));
  const fetchModels = () => api.get('/models/').then(res => setModelsList(res.data));
  
  // Вспомогательный метод для сборки query-параметров из установленных фильтров
  const buildLogParams = () => {
    const params = new URLSearchParams();
    if (filters.user) params.append('user', filters.user);
    if (filters.model) params.append('model', filters.model);
    if (filters.status) params.append('status', filters.status);
    return params;
  };

  const fetchGlobalLogs = () => {
    const params = buildLogParams();
    api.get(`/logs/all/?${params.toString()}`).then(res => {
      setGlobalLogs(res.data);
      setCurrentPage(1);
    });
  };

  // --- MODELS LOGIC ---
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
        name: selected.name, endpoint_url: selected.endpoint_url || '',
        hf_model_id: selected.hf_model_id || '', output_type: selected.output_type,
        status: selected.status, tags: selected.tags.map(t => t.id)
      };
      setModelForm(formData); setInitialModelForm(JSON.parse(JSON.stringify(formData)));
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    fetchGlobalLogs();
  };

  const isModelFormDirty = () => JSON.stringify({ ...modelForm, tags: [...modelForm.tags].sort() }) !== JSON.stringify({ ...initialModelForm, tags: [...initialModelForm.tags].sort() });

  const handleSaveModel = async (e) => {
    e.preventDefault();
    if (modelForm.tags.length === 0) return showNotify('Необходимо выбрать хотя бы один тег', 'error');
    
    try {
      let savedModelId = editingModelId;
      if (editingModelId) {
        await api.put(`/models/${editingModelId}/`, modelForm); showNotify('Модель успешно обновлена!');
      } else {
        const res = await api.post('/models/', { ...modelForm, status: 'UNKNOWN' });
        savedModelId = res.data.id; showNotify('Модель добавлена. Проверяем доступность...', 'info');
      }

      const checkRes = await api.post(`/models/${savedModelId}/check-status/`);
      const finalStatus = checkRes.data.status;
      showNotify(`Статус: ${finalStatus}`, finalStatus === 'ONLINE' ? 'success' : 'error');

      await fetchModels();
      const updatedForm = { ...modelForm, status: finalStatus };
      setModelForm(updatedForm); setInitialModelForm(JSON.parse(JSON.stringify(updatedForm)));
      if (!editingModelId) setEditingModelId(savedModelId);
    } catch (err) { showNotify('Ошибка при сохранении модели', 'error'); }
  };

  const handleDeleteModel = async (id) => {
    try {
      await api.delete(`/models/${id}/`); setDeleteModalModel(null); fetchModels();
      setEditingModelId(null); setModelForm(defaultModelForm); setInitialModelForm(defaultModelForm); showNotify('Модель удалена!');
    } catch (err) { showNotify('Ошибка при удалении модели', 'error'); }
  };

  // --- TAGS LOGIC ---
  const handleSaveTag = async (e) => {
    e.preventDefault();
    try { await api.post('/tags/', newTag); setNewTag({ name: '', color: '#3b82f6' }); fetchTags(); showNotify('Тег создан!'); } 
    catch (err) { showNotify('Ошибка при создании тега', 'error'); }
  };

  const handleDeleteTag = async (id) => {
    try { await api.delete(`/tags/${id}/`); setDeleteModalTag(null); fetchTags(); if (activeTab === 'models') fetchModels(); showNotify('Тег удален!'); } 
    catch (err) { showNotify('Ошибка при удалении', 'error'); }
  };

  // EXPORT CSV LOGIC 
  const handleExportCSV = async () => {
    try {
      showNotify('Формирование файла экспорта...', 'info');
      const params = buildLogParams();
      
      // Запрашиваем файл
      const response = await api.get(`/logs/export/?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Создаем временную ссылку для скачивания файла на устройство
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Имя файла содержит текущую дату
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `logs_export_${dateStr}.csv`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotify('Логи успешно экспортированы!');
    } catch (err) { 
      showNotify('Ошибка при экспорте логов', 'error'); 
    }
  };

  return (
    <div className="max-w-6xl mx-auto relative pb-10">
      {notify.text && (
        <div className={`fixed top-4 left-4 right-4 sm:top-20 sm:left-auto sm:right-8 px-6 py-3 rounded shadow-lg z-50 text-white font-medium text-center sm:text-left ${notify.type === 'error' ? 'bg-red-500' : notify.type === 'info' ? 'bg-blue-500' : 'bg-green-500'}`}>
          {notify.text}
        </div>
      )}

      <h1 className="admin-title">Панель Администратора</h1>
      
      {/* Вкладки */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6 space-x-6 pb-1 scrollbar-hide">
        <button onClick={() => setActiveTab('models')} className={`tab-btn whitespace-nowrap ${activeTab === 'models' ? 'tab-active' : 'tab-default'}`}>Управление Моделями</button>
        <button onClick={() => setActiveTab('tags')} className={`tab-btn whitespace-nowrap ${activeTab === 'tags' ? 'tab-active' : 'tab-default'}`}>Настройка Тегов</button>
        <button onClick={() => setActiveTab('logs')} className={`tab-btn whitespace-nowrap ${activeTab === 'logs' ? 'tab-active' : 'tab-default'}`}>Логи и Экспорт</button>
      </div>

      {/* --- ВКЛАДКА 1: МОДЕЛИ --- */}
      {activeTab === 'models' && (
        <div className="card p-4 sm:p-6 max-w-2xl">
          <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <label className="form-label">Выберите модель для редактирования</label>
            <select onChange={handleSelectModel} value={editingModelId || 'NEW'} className="form-input">
              <option value="NEW">-- Создать новую модель --</option>
              {modelsList.map(m => <option key={m.id} value={m.id}>{m.name} ({m.status})</option>)}
            </select>
          </div>

          <form onSubmit={handleSaveModel} className="space-y-4">
            <div><label className="form-label">Имя модели</label><input required value={modelForm.name} onChange={e=>setModelForm({...modelForm, name: e.target.value})} className="form-input"/></div>
            <div><label className="form-label">Endpoint URL</label><input required type="url" value={modelForm.endpoint_url} onChange={e=>setModelForm({...modelForm, endpoint_url: e.target.value})} className="form-input"/></div>
            <div><label className="form-label">HF Model ID (Опционально)</label><input value={modelForm.hf_model_id} onChange={e=>setModelForm({...modelForm, hf_model_id: e.target.value})} className="form-input"/></div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1"><label className="form-label">Тип вывода</label>
                <select value={modelForm.output_type} onChange={e=>setModelForm({...modelForm, output_type: e.target.value})} className="form-input">
                  <option value="TEXT">Text</option><option value="IMAGE">Image</option>
                </select>
              </div>
              <div className="flex-1"><label className="form-label">Статус (Авто-проверка)</label>
                <input value={modelForm.status} disabled className="form-input font-bold" />
              </div>
            </div>

            <div>
              <label className="form-label">Присвоенные теги <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {tags.map(tag => (
                  <span key={tag.id} onClick={() => setModelForm(prev => ({...prev, tags: prev.tags.includes(tag.id) ? prev.tags.filter(id => id !== tag.id) : [...prev.tags, tag.id]}))} 
                        style={{ backgroundColor: tag.color, opacity: modelForm.tags.includes(tag.id) ? 1 : 0.3 }} 
                        className="badge cursor-pointer hover:opacity-80 py-1.5 px-3">
                    {tag.name}
                  </span>
                ))}
              </div>
              {modelForm.tags.length === 0 && <p className="text-red-500 text-xs mt-2">Выберите хотя бы один тег</p>}
            </div>
            
            <div className="pt-4 flex flex-col gap-3">
              <button type="submit" disabled={!isModelFormDirty() || modelForm.tags.length === 0} className="btn-purple w-full">
                {editingModelId ? 'Сохранить изменения' : 'Зарегистрировать и проверить'}
              </button>
              {editingModelId && <button type="button" onClick={() => setDeleteModalModel(editingModelId)} className="btn-danger w-full">Удалить модель</button>}
            </div>
          </form>
        </div>
      )}

      {/* --- ВКЛАДКА 2: ТЕГИ --- */}
      {activeTab === 'tags' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <form onSubmit={handleSaveTag} className="card p-4 sm:p-6">
            <h2 className="section-title">Создать новый тег</h2>
            <div className="mb-4">
              <label className="form-label">Название тега</label>
              <input required value={newTag.name} onChange={e=>setNewTag({...newTag, name: e.target.value})} className="form-input" placeholder="Например: NLP..."/>
            </div>
            <div className="mb-6">
              <label className="form-label">Цвет (HEX)</label>
              <div className="flex items-center space-x-3">
                <input required type="color" value={newTag.color} onChange={e=>setNewTag({...newTag, color: e.target.value})} className="h-10 w-16 p-0 border-0 rounded cursor-pointer"/>
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{newTag.color.toUpperCase()}</span>
              </div>
            </div>
            <button type="submit" className="btn-purple w-full sm:w-auto">Создать тег</button>
          </form>

          <div className="card p-4 sm:p-6">
            <h2 className="section-title">Существующие теги</h2>
            <div className="flex flex-wrap gap-3">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900 pr-2 rounded overflow-hidden border dark:border-gray-700">
                  <div className="w-4 h-full py-3" style={{ backgroundColor: tag.color }}></div>
                  <span className="text-sm font-medium px-1">{tag.name}</span>
                  <button type="button" onClick={() => setDeleteModalTag(tag.id)} className="text-red-500 hover:text-red-700 font-bold ml-2 text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- ВКЛАДКА 3: ЛОГИ И ЭКСПОРТ --- */}
      {activeTab === 'logs' && (
        <div className="space-y-8">
          <div className="space-y-4">
            {/* Панель Фильтров и кнопка Экспорта */}
            <form onSubmit={handleFormSubmit} className="bg-gray-100 dark:bg-gray-800 p-4 rounded flex flex-col sm:flex-row gap-4 sm:items-end">
              <div className="flex-1">
                <label className="form-label">User ID/Name</label>
                <input type="text" value={filters.user} onChange={e=>setFilters({...filters, user: e.target.value})} className="form-input py-2 text-sm"/>
              </div>
              <div className="flex-1">
                <label className="form-label">Model ID/Name</label>
                <input type="text" value={filters.model} onChange={e=>setFilters({...filters, model: e.target.value})} className="form-input py-2 text-sm"/>
              </div>
              <div className="flex-1">
                <label className="form-label">HTTP Статус</label>
                <input type="text" value={filters.status} onChange={e=>setFilters({...filters, status: e.target.value})} className="form-input py-2 text-sm"/>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button type="submit" className="btn-primary w-full sm:w-auto">
                  Применить фильтр
                </button>
                <button type="button" onClick={handleExportCSV} className="btn-purple w-full sm:w-auto">
                  Экспорт в CSV
                </button>
              </div>
            </form>
            
            {/* Таблица логов для Десктопа */}
            <div className="table-container hidden md:block">
              <table className="table-base">
                <thead className="table-header">
                  <tr><th className="p-3">ID / Дата</th><th className="p-3">User (ID)</th><th className="p-3">Модель (ID)</th><th className="p-3">Статус</th><th className="p-3">Latency</th></tr>
                </thead>
                <tbody>
                  {globalLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(log => (
                    <React.Fragment key={log.id}>
                      <tr className="table-row group">
                        <td className="p-3 text-gray-500">{log.id} | {new Date(log.created_at).toLocaleString('ru-RU')}</td>
                        <td className="p-3">{log.username ? `${log.username} (${log.user_id})` : 'N/A'}</td>
                        <td className="p-3 font-medium">{log.model_name ? `${log.model_name} (${log.model_id})` : 'N/A'}</td>
                        <td className="p-3"><span className={`badge ${log.http_status === 200 ? 'badge-success' : 'badge-error'}`}>{log.http_status}</span></td>
                        <td className="p-3 font-mono ">{log.latency_ms} ms</td>
                      </tr>
                      <tr className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                        <td colSpan="5" className="p-4">
                          <details className="cursor-pointer max-h-96 overflow-y-auto">
                            <summary className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 sticky top-0 bg-gray-50 dark:bg-gray-900/50 py-1">Показать детали (промпт и ответ)</summary>
                            <div className="mt-3 space-y-3">
                              <div className="card p-3"><p className="font-semibold mb-1">Промпт:</p><p className="break-words">{log.req_payload?.inputs || log.req_payload?.messages?.[0]?.content || 'Неизвестный формат'}</p></div>
                              {log.image_file ? (
                                <div className="card p-3">
                                  <p className="font-semibold mb-2">Результат:</p>
                                  <div className="relative w-24 h-24 group overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                    <img 
                                      src={log.image_file.startsWith('http') ? log.image_file : `http://127.0.0.1:8000${log.image_file}`} 
                                      alt="Result" 
                                      onClick={() => setExpandedImage(log.image_file)}
                                      className="h-full w-full object-cover cursor-pointer group-hover:scale-110 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 pointer-events-none flex items-center justify-center transition-opacity">
                                      <Eye size={14} className="text-white" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="card p-3"><p className="font-semibold mb-1">Ответ модели (JSON):</p><pre className="text-[12px] p-3 overflow-auto max-h-80 bg-gray-100 dark:bg-gray-900 rounded font-mono break-words whitespace-pre-wrap">{JSON.stringify(log.res_payload, null, 2)}</pre></div>
                              )}
                            </div>
                          </details>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Карточки логов для Мобильных */}
            <div className="md:hidden flex flex-col gap-4">
               {globalLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(log => (
                 <div key={log.id} className="card p-4 text-sm">
                   <div className="flex justify-between items-start mb-2">
                     <div><span className="font-bold">{log.model_name}</span> <span className="text-xs text-gray-500">({log.model_id})</span></div>
                     <span className={`badge ${log.http_status === 200 ? 'badge-success' : 'badge-error'}`}>{log.http_status}</span>
                   </div>
                   <div className="text-xs text-gray-500 mb-2">
                     Юзер: {log.username} ({log.user_id}) | {new Date(log.created_at).toLocaleString('ru-RU')}
                   </div>
                   <details className="cursor-pointer bg-gray-50 dark:bg-gray-700/30 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                      <summary className="text-xs text-blue-600 dark:text-blue-400 font-medium sticky top-0 bg-gray-50 dark:bg-gray-700/30 py-1">Показать детали</summary>
                      <div className="mt-3 space-y-2">
                        <div><p className="text-[10px] font-bold text-gray-500">Промпт:</p><p className="text-xs break-words">{log.req_payload?.inputs || log.req_payload?.messages?.[0]?.content || 'Неизвестный формат'}</p></div>
                        {log.image_file ? (
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 mb-1">Результат:</p>
                            <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                              <img 
                                src={log.image_file.startsWith('http') ? log.image_file : `http://127.0.0.1:8000${log.image_file}`} 
                                alt="Result" 
                                onClick={() => setExpandedImage(log.image_file)}
                                className="w-full h-36 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            </div>
                          </div>
                        ) : (
                          <div><p className="text-[10px] font-bold text-gray-500 mb-1">Ответ (JSON):</p><pre className="text-[10px] p-2 overflow-auto max-h-64 bg-gray-200 dark:bg-gray-900 rounded font-mono break-words whitespace-pre-wrap">{JSON.stringify(log.res_payload, null, 2)}</pre></div>
                        )}
                      </div>
                   </details>
                   <div className="text-xs mt-2 font-mono text-gray-400 text-right">{log.latency_ms} ms</div>
                 </div>
               ))}
            </div>

            {/* Пагинация */}
            {globalLogs.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>Показано {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, globalLogs.length)} из {globalLogs.length}</div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-outline px-3 py-1">← Назад</button>
                  <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(globalLogs.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(globalLogs.length / itemsPerPage)} className="btn-outline px-3 py-1">Вперед →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модалки удаления (Модели) */}
      {deleteModalModel && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm p-6">
            <h2 className="section-title text-gray-900 dark:text-gray-100">Удалить модель?</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">Вы уверены, что хотите удалить модель <strong>{modelsList.find(m => m.id === deleteModalModel)?.name}</strong>? Это действие необратимо.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setDeleteModalModel(null)} className="btn-outline flex-1">Отмена</button>
              <button onClick={() => handleDeleteModel(deleteModalModel)} className="btn-danger flex-1">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка удаления (Теги) */}
      {deleteModalTag && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm p-6">
            <h2 className="section-title text-gray-900 dark:text-gray-100">Удалить тег?</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">Вы уверены, что хотите удалить тег <strong>{tags.find(t => t.id === deleteModalTag)?.name}</strong>?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setDeleteModalTag(null)} className="btn-outline flex-1">Отмена</button>
              <button onClick={() => handleDeleteTag(deleteModalTag)} className="btn-danger flex-1">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка просмотра полноразмерного изображения */}
      {expandedImage && (
        <div className="modal-backdrop" onClick={() => setExpandedImage(null)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50" onClick={() => setExpandedImage(null)}>
            <div className="relative max-w-3xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setExpandedImage(null)} 
                className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2 transition-colors"
              >
                <X size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <img 
                src={expandedImage.startsWith('http') ? expandedImage : `http://127.0.0.1:8000${expandedImage}`}
                alt="Full size" 
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;