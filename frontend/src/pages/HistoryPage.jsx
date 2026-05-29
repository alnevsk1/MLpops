import React, { useState } from 'react';
import { Eye, ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useApi } from '../hooks/useApi';
import { downloadImage, buildImageUrl } from '../utils';
import { ITEMS_PER_PAGE } from '../constants';

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

const stripMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#+\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/-\s+/g, '')
    .replace(/\n+/g, ' ');
};

const truncateText = (text, length = 80) => {
  const cleanText = stripMarkdown(text);
  return cleanText.length > length ? cleanText.substring(0, length) + '...' : cleanText;
};

function HistoryPage() {
  const { data: logs, loading, error } = useApi('/logs/');
  const [expandedImage, setExpandedImage] = useState(null);
  const [expandedModal, setExpandedModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="card p-12 text-center text-red-500">{error}</div>;

  const allLogs = logs || [];
  const totalPages = Math.ceil(allLogs.length / ITEMS_PER_PAGE);
  const pageLogs = allLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <h1 className="page-title">История генераций</h1>

      {allLogs.length === 0 ? (
        <div className="card p-12 text-center text-gray-500 dark:text-gray-400 font-medium">
          У вас еще нет истории запросов
        </div>
      ) : (
        <>
          {/* Десктопная версия */}
          <div className="table-container hidden md:block shadow-md rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <table className="table-base w-full border-collapse">
              <thead className="table-header bg-gray-50 dark:bg-gray-900/80">
                <tr>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-32">Дата</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-40">Модель</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Промпт</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Результат</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-44">Статус / Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {pageLogs.map(log => (
                  <tr key={log.id} className="table-row hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="p-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="p-4 font-semibold text-sm text-gray-900 dark:text-gray-100">{log.model_name}</td>
                    <td className="p-4 max-w-[300px]">
                      <div
                        className="flex items-center justify-between gap-3 cursor-pointer bg-gray-50 dark:bg-gray-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 p-2.5 rounded-lg border border-gray-200/60 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-800 transition-all text-xs group"
                        onClick={() => setExpandedModal({ type: 'prompt', content: getPromptText(log.req_payload) })}
                      >
                        <span className="text-gray-600 dark:text-gray-300 italic line-clamp-2 break-words flex-1">
                          "{truncateText(getPromptText(log.req_payload), 90)}"
                        </span>
                        <Eye size={15} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                      </div>
                    </td>
                    <td className="p-4 max-w-[300px]">
                      {log.image_file ? (
                        <div className="relative w-12 h-12 group overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                          <img
                            src={buildImageUrl(log.image_file)}
                            alt="Miniature"
                            onClick={() => setExpandedImage(log.image_file)}
                            className="h-full w-full object-cover cursor-pointer group-hover:scale-110 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 pointer-events-none flex items-center justify-center transition-opacity">
                            <Eye size={14} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-between gap-3 cursor-pointer bg-gray-50 dark:bg-gray-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 p-2.5 rounded-lg border border-gray-200/60 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-800 transition-all text-xs group"
                          onClick={() => setExpandedModal({ type: 'response', content: getResponseText(log.res_payload) })}
                        >
                          <span className="text-gray-600 dark:text-gray-300 line-clamp-2 break-words flex-1">
                            {truncateText(getResponseText(log.res_payload), 90)}
                          </span>
                          <Eye size={15} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2.5">
                        <span className={`badge px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${log.http_status === 200 ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                          {log.http_status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{log.latency_ms} ms</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Мобильная версия */}
          <div className="md:hidden flex flex-col gap-4">
            {pageLogs.map(log => (
              <div key={log.id} className="card p-4 shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl">
                <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{log.model_name}</h3>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">{new Date(log.created_at).toLocaleString('ru-RU')}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span className={`badge px-2 py-0.5 rounded-full text-[11px] font-bold ${log.http_status === 200 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {log.http_status}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">{log.latency_ms}ms</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Промпт</p>
                    <div className="flex items-center justify-between gap-2 cursor-pointer bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg text-xs border border-gray-100 dark:border-gray-700/60" onClick={() => setExpandedModal({ type: 'prompt', content: getPromptText(log.req_payload) })}>
                      <span className="flex-1 line-clamp-2 text-gray-600 dark:text-gray-300 italic break-words">"{truncateText(getPromptText(log.req_payload), 70)}"</span>
                      <Eye size={14} className="text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Результат</p>
                    {log.image_file ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={buildImageUrl(log.image_file)}
                          alt="Result"
                          onClick={() => setExpandedImage(log.image_file)}
                          className="w-full h-36 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 cursor-pointer bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg text-xs border border-gray-100 dark:border-gray-700/60" onClick={() => setExpandedModal({ type: 'response', content: getResponseText(log.res_payload) })}>
                        <span className="flex-1 line-clamp-3 text-gray-600 dark:text-gray-300 break-words">{truncateText(getResponseText(log.res_payload), 100)}</span>
                        <Eye size={14} className="text-gray-400 flex-shrink-0" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Пагинация */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <p className="font-medium">
              Показано <span className="text-gray-800 dark:text-gray-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, allLogs.length)}</span> из <span className="text-gray-800 dark:text-gray-200">{allLogs.length}</span>
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5 rounded-lg disabled:opacity-40">
                <ChevronLeft size={14} /><span>Назад</span>
              </button>
              <div className="flex items-center gap-1 hidden sm:flex">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`px-2.5 py-1 rounded-md transition-colors text-xs font-semibold ${page === currentPage ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {page}
                  </button>
                ))}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5 rounded-lg disabled:opacity-40">
                <span>Вперед</span><ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Модалка для изображения */}
      {expandedImage && (
        <div className="modal-backdrop backdrop-blur-sm" onClick={() => setExpandedImage(null)}>
          <div className="modal-content max-w-2xl bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Просмотр изображения</h2>
              <button onClick={() => setExpandedImage(null)} className="btn-icon rounded-lg"><X size={18}/></button>
            </div>
            <div className="p-5 flex flex-col items-center bg-white dark:bg-gray-800">
              <img src={buildImageUrl(expandedImage)} alt="Full size" className="max-w-full max-h-[65vh] rounded-lg shadow-md border dark:border-gray-700 object-contain" />
              <button onClick={() => downloadImage(expandedImage, `image_${Date.now()}.jpg`)} className="btn-primary mt-4 w-full sm:w-auto font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-lg shadow-sm">
                <Download size={16} className="mr-2" /> Скачать оригинал
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка для текста */}
      {expandedModal && (
        <div className="modal-backdrop backdrop-blur-sm" onClick={() => setExpandedModal(null)}>
          <div className="modal-content max-w-2xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex-shrink-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {expandedModal.type === 'prompt' ? 'Полный промпт запроса' : 'Полный ответ модели'}
              </h2>
              <button onClick={() => setExpandedModal(null)} className="btn-icon rounded-lg"><X size={18}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
              {expandedModal.type === 'prompt' ? (
                <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed font-sans">
                  {expandedModal.content}
                </p>
              ) : (
                <div className="prose dark:prose-invert max-w-none text-sm sm:text-base break-words">
                  <ReactMarkdown>{expandedModal.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
