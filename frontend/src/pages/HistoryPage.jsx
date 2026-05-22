import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import api from '../api';

function HistoryPage() {
  const [logs, setLogs] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedModal, setExpandedModal] = useState(null); // { type: 'prompt' | 'response', content: string }

  useEffect(() => {
    api.get('/logs/').then(res => setLogs(res.data));
  }, []);

  // Извлекаем текст промпта из JSON
  const getPromptText = (payload) => {
    if (!payload) return '';
    if (payload.inputs) return payload.inputs;
    if (payload.messages && payload.messages.length > 0) return payload.messages[0].content;
    return 'Неизвестный формат';
  };

  // Извлекаем текстовый ответ из JSON
  const getResponseText = (payload) => {
    if (!payload) return 'Нет ответа';
    
    // Для текстовых моделей (chat-like)
    if (typeof payload === 'object') {
      if (payload.choices && Array.isArray(payload.choices) && payload.choices.length > 0) {
        const choice = payload.choices[0];
        if (choice.message && choice.message.content) return choice.message.content;
        if (choice.text) return choice.text;
      }
      if (payload[0] && payload[0].generated_text) return payload[0].generated_text;
      if (typeof payload === 'string') return payload;
    }
    
    return 'Неизвестный формат';
  };

  const downloadImage = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl.startsWith('http') ? imageUrl : `http://127.0.0.1:8000${imageUrl}`;
    link.download = filename || 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Обрезаем текст для предпросмотра (80 символов)
  const truncateText = (text, length = 80) => {
    if (text.length > length) {
      return text.substring(0, length) + '...';
    }
    return text;
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">История генераций</h1>
      
      {logs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          У вас еще нет истории запросов
        </div>
      ) : (
        <>
          {/* Desktop таблица - скрыта на мобильных */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-4">Дата</th>
                  <th className="p-4">Модель</th>
                  <th className="p-4 w-1/3">Промпт</th>
                  <th className="p-4">Результат</th>
                  <th className="p-4">Статус / Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="p-4 font-medium text-sm">{log.model_name}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setExpandedModal({ type: 'prompt', content: getPromptText(log.req_payload) })}>
                        <span className="text-xs text-gray-600 dark:text-gray-300 italic flex-1 line-clamp-2">
                          "{truncateText(getPromptText(log.req_payload), 80)}"
                        </span>
                        <Eye size={16} className="flex-shrink-0 text-gray-400" />
                      </div>
                    </td>
                    <td className="p-4">
                      {log.image_file ? (
                        <img 
                          src={log.image_file.startsWith('http') ? log.image_file : `http://127.0.0.1:8000${log.image_file}`} 
                          alt="Miniature" 
                          onClick={() => setExpandedImage(log.image_file)}
                          className="h-12 w-12 object-cover rounded border cursor-pointer hover:scale-150 transition-transform origin-left"
                        />
                      ) : (
                        <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setExpandedModal({ type: 'response', content: getResponseText(log.res_payload) })}>
                          <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 line-clamp-2">
                            {truncateText(getResponseText(log.res_payload), 80)}
                          </span>
                          <Eye size={16} className="flex-shrink-0 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs text-white ${log.http_status === 200 ? 'bg-green-500' : 'bg-red-500'}`}>
                          {log.http_status}
                        </span>
                        <span className="text-xs text-gray-400">{log.latency_ms} ms</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Мобильная версия - карточки */}
          <div className="md:hidden flex flex-col gap-3 sm:gap-4">
            {logs.map(log => (
              <div key={log.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base">{log.model_name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <span className={`px-2 py-1 rounded text-xs text-white ${log.http_status === 200 ? 'bg-green-500' : 'bg-red-500'}`}>
                      {log.http_status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Промпт</p>
                    <div 
                      className="flex items-center gap-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-700/30 p-2 rounded text-xs"
                      onClick={() => setExpandedModal({ type: 'prompt', content: getPromptText(log.req_payload) })}
                    >
                      <span className="flex-1 line-clamp-2 text-gray-600 dark:text-gray-300">
                        "{truncateText(getPromptText(log.req_payload), 60)}"
                      </span>
                      <Eye size={14} className="flex-shrink-0" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Результат</p>
                    {log.image_file ? (
                      <img 
                        src={log.image_file.startsWith('http') ? log.image_file : `http://127.0.0.1:8000${log.image_file}`} 
                        alt="Result" 
                        onClick={() => setExpandedImage(log.image_file)}
                        className="w-full h-40 object-cover rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-700/30 p-2 rounded text-xs"
                        onClick={() => setExpandedModal({ type: 'response', content: getResponseText(log.res_payload) })}
                      >
                        <span className="flex-1 line-clamp-3 text-gray-600 dark:text-gray-300">
                          {truncateText(getResponseText(log.res_payload), 80)}
                        </span>
                        <Eye size={14} className="flex-shrink-0" />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    {log.latency_ms} ms
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL ДЛЯ ПРОСМОТРА КАРТИНКИ */}
      {expandedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setExpandedImage(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 sm:p-4 border-b dark:border-gray-700">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Просмотр изображения</h2>
              <button
                onClick={() => setExpandedImage(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-3 sm:p-4 flex flex-col items-center">
              <img
                src={expandedImage.startsWith('http') ? expandedImage : `http://127.0.0.1:8000${expandedImage}`}
                alt="Full size"
                className="max-w-full max-h-96 rounded"
              />
              <button
                onClick={() => downloadImage(expandedImage, `image_${Date.now()}.jpg`)}
                className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded font-medium transition-colors text-sm"
              >
                Скачать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ДЛЯ ПРОСМОТРА ПРОМПТА ИЛИ ОТВЕТА */}
      {expandedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setExpandedModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 sm:p-4 border-b dark:border-gray-700 flex-shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                {expandedModal.type === 'prompt' ? 'Полный промпт' : 'Полный ответ модели'}
              </h2>
              <button
                onClick={() => setExpandedModal(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-3 sm:p-4 overflow-auto flex-1">
              <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                {expandedModal.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;