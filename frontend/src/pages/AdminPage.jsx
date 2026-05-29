import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { NOTIFY_DURATION_MS } from '../constants';
import ModelsTab from './admin/ModelsTab';
import TagsTab from './admin/TagsTab';
import LogsTab from './admin/LogsTab';

const TABS = [
  { id: 'models', label: 'Управление Моделями' },
  { id: 'tags', label: 'Настройка Тегов' },
  { id: 'logs', label: 'Логи и Экспорт' },
];

function AdminPage() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminActiveTab') || 'models');
  const [notify, setNotify] = useState({ text: '', type: '' });
  const [tags, setTags] = useState([]);
  const [modelsList, setModelsList] = useState([]);
  const notifyTimerRef = useRef(null);

  const showNotify = useCallback((text, type = 'success') => {
    // Clear previous timer so rapid calls don't stack and hide each other early.
    if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    setNotify({ text, type });
    notifyTimerRef.current = setTimeout(() => setNotify({ text: '', type: '' }), NOTIFY_DURATION_MS);
  }, []);

  useEffect(() => {
    // Prevent setState on an unmounted component if the tab is closed mid-notification.
    return () => { if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current); };
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await api.get('/tags/');
      setTags(res.data);
    } catch {
      showNotify('Ошибка при загрузке тегов', 'error');
    }
  }, [showNotify]);

  const fetchModels = useCallback(async () => {
    try {
      const res = await api.get('/models/');
      setModelsList(res.data);
    } catch {
      showNotify('Ошибка при загрузке моделей', 'error');
    }
  }, [showNotify]);

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
    fetchTags();
    if (activeTab === 'models') fetchModels();
  }, [activeTab, fetchTags, fetchModels]);

  const handleTabChange = (tabId) => setActiveTab(tabId);

  return (
    <div className="max-w-6xl mx-auto relative pb-10">
      {notify.text && (
        <div className={`fixed top-4 left-4 right-4 sm:top-20 sm:left-auto sm:right-8 px-6 py-3 rounded shadow-lg z-50 text-white font-medium text-center sm:text-left ${notify.type === 'error' ? 'bg-red-500' : notify.type === 'info' ? 'bg-blue-500' : 'bg-green-500'}`}>
          {notify.text}
        </div>
      )}

      <h1 className="admin-title">Панель Администратора</h1>

      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6 space-x-6 pb-1 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`tab-btn whitespace-nowrap ${activeTab === tab.id ? 'tab-active' : 'tab-default'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'models' && (
        <ModelsTab
          tags={tags}
          modelsList={modelsList}
          showNotify={showNotify}
          onModelsChange={fetchModels}
        />
      )}
      {activeTab === 'tags' && (
        <TagsTab
          tags={tags}
          showNotify={showNotify}
          onTagsChange={fetchTags}
        />
      )}
      {activeTab === 'logs' && (
        <LogsTab showNotify={showNotify} />
      )}
    </div>
  );
}

export default AdminPage;
