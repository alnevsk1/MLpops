import React, { useState, useEffect } from 'react';
import { Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
import api from '../api';

function HistoryPage() {
  const [logs, setLogs] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedModal, setExpandedModal] = useState(null); // { type: 'prompt' | 'response', content: string }
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    api.get('/logs/').then(res => {
      setLogs(res.data);
      setCurrentPage(1);
    });
  }, []);

  const getPromptText = (payload) => {
    if (!payload) return '';
    if (payload.inputs) return payload.inputs;
    if (payload.messages?.length > 0) return payload.messages[0].content;
    return 'Неизвестный формат';
  };

  const getResponseText = (payload) => {
    if (!payload) return 'Нет ответа';
    if (typeof payload === 'object') {
      if (payload.choices?.length > 0) return payload.choices[0].message?.content || payload.choices[0].text;
      if (payload[0]?.generated_text) return payload[0].generated_text;
    }
    return typeof payload === 'string' ? payload : 'Неизвестный формат';
  };

  const downloadImage = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl.startsWith('http') ? imageUrl : `http://127.0.0.1:8000${imageUrl}`;
    link.download = filename || 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const truncateText = (text, length = 80) => text.length > length ? text.substring(0, length) + '...' : text;

  return (
    <div>
      <h1 className="page-title">История генераций</h1>
      
      {logs.length === 0 ? (
        <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
          У вас еще нет истории запросов
        </div>
      ) : (
        <>
          {/* Десктопная версия (Таблица) */}
          <div className="table-container hidden md:block">
            <table className="table-base">
              <thead className="table-header">
                <tr>
                  <th className="p-4">Дата</th>
                  <th className="p-4">Модель</th>
                  <th className="p-4 w-1/3">Промпт</th>
                  <th className="p-4">Результат</th>
                  <th className="p-4">Статус / Время</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(log => (
                  <tr key={log.id} className="table-row">
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
                        <span className={`badge ${log.http_status === 200 ? 'badge-success' : 'badge-error'}`}>
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

          {/* Мобильная версия (Карточки) */}
          <div className="md:hidden flex flex-col gap-3 sm:gap-4">
            {logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(log => (
              <div key={log.id} className="card p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base">{log.model_name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <span className={`badge ${log.http_status === 200 ? 'badge-success' : 'badge-error'}`}>
                      {log.http_status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Промпт</p>
                    <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-700/30 p-2 rounded text-xs" onClick={() => setExpandedModal({ type: 'prompt', content: getPromptText(log.req_payload) })}>
                      <span className="flex-1 line-clamp-2 text-gray-600 dark:text-gray-300">"{truncateText(getPromptText(log.req_payload), 60)}"</span>
                      <Eye size={14} className="flex-shrink-0" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Результат</p>
                    {log.image_file ? (
                      <img 
                        src={log.image_file.startsWith('http') ? log.image_file : `http://127.0.0.1:8000${log.image_file}`} 
                        alt="Result" onClick={() => setExpandedImage(log.image_file)}
                        className="w-full h-40 object-cover rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-700/30 p-2 rounded text-xs" onClick={() => setExpandedModal({ type: 'response', content: getResponseText(log.res_payload) })}>
                        <span className="flex-1 line-clamp-3 text-gray-600 dark:text-gray-300">{truncateText(getResponseText(log.res_payload), 80)}</span>
                        <Eye size={14} className="flex-shrink-0" />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    Latency: {log.latency_ms} ms
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Пагинация */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
            <p>
              Показано {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, logs.length)} из {logs.length}
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-outline px-3 py-1 flex items-center gap-1">
                <ChevronLeft size={16} /><span className="hidden sm:inline">Назад</span>
              </button>
              
              <div className="flex items-center gap-1 hidden sm:flex">
                {Array.from({ length: Math.ceil(logs.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`px-2 py-1 rounded transition-colors text-sm ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    {page}
                  </button>
                ))}
              </div>

              <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(logs.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(logs.length / itemsPerPage)} className="btn-outline px-3 py-1 flex items-center gap-1">
                <span className="hidden sm:inline">Вперед</span><ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Модалка для изображения */}
      {expandedImage && (
        <div className="modal-backdrop" onClick={() => setExpandedImage(null)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 sm:p-4 border-b dark:border-gray-700">
              <h2 className="section-title mb-0">Просмотр изображения</h2>
              <button onClick={() => setExpandedImage(null)} className="btn-icon"><X/></button>
            </div>
            <div className="p-4 flex flex-col items-center">
              <img src={expandedImage.startsWith('http') ? expandedImage : `http://127.0.0.1:8000${expandedImage}`} alt="Full size" className="max-w-full max-h-[70vh] rounded" />
              <button onClick={() => downloadImage(expandedImage, `image_${Date.now()}.jpg`)} className="btn-primary mt-4 w-full sm:w-auto">Скачать</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка для текста */}
      {expandedModal && (
        <div className="modal-backdrop" onClick={() => setExpandedModal(null)}>
          <div className="modal-content max-w-2xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 sm:p-4 border-b dark:border-gray-700 flex-shrink-0">
              <h2 className="section-title mb-0">{expandedModal.type === 'prompt' ? 'Полный промпт' : 'Полный ответ модели'}</h2>
              <button onClick={() => setExpandedModal(null)} className="btn-icon"><X/></button>
            </div>
            <div className="p-4 overflow-auto">
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