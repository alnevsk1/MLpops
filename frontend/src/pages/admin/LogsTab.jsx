import React, { useState, useCallback, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import api from '../../api';
import { buildImageUrl, downloadBlob } from '../../utils';
import { ITEMS_PER_PAGE } from '../../constants';

export default function LogsTab({ showNotify }) {
  const [globalLogs, setGlobalLogs] = useState([]);
  const [filters, setFilters] = useState({ user: '', model: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedImage, setExpandedImage] = useState(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.user) params.append('user', filters.user);
    if (filters.model) params.append('model', filters.model);
    if (filters.status) params.append('status', filters.status);
    return params;
  }, [filters]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get(`/logs/all/?${buildParams().toString()}`);
      setGlobalLogs(res.data);
      setCurrentPage(1);
    } catch {
      showNotify('Ошибка при загрузке логов', 'error');
    }
  }, [buildParams, showNotify]);

  // Load all logs on mount with no filters. Empty deps are intentional —
  // re-fetching on every fetchLogs identity change would fire on each keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(); }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleExportCSV = async () => {
    try {
      showNotify('Формирование файла экспорта...', 'info');
      const response = await api.get(`/logs/export/?${buildParams().toString()}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `logs_export_${dateStr}.csv`);
      showNotify('Логи успешно экспортированы!');
    } catch {
      showNotify('Ошибка при экспорте логов', 'error');
    }
  };

  const totalPages = Math.ceil(globalLogs.length / ITEMS_PER_PAGE);
  const pageLogs = globalLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <form onSubmit={handleFilterSubmit} className="bg-gray-100 dark:bg-gray-800 p-4 rounded flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className="form-label">User ID/Name</label>
            <input type="text" value={filters.user} onChange={e => setFilters({ ...filters, user: e.target.value })} className="form-input py-2 text-sm"/>
          </div>
          <div className="flex-1">
            <label className="form-label">Model ID/Name</label>
            <input type="text" value={filters.model} onChange={e => setFilters({ ...filters, model: e.target.value })} className="form-input py-2 text-sm"/>
          </div>
          <div className="flex-1">
            <label className="form-label">HTTP Статус</label>
            <input type="text" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="form-input py-2 text-sm"/>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button type="submit" className="btn-primary w-full sm:w-auto">Применить фильтр</button>
            <button type="button" onClick={handleExportCSV} className="btn-purple w-full sm:w-auto">Экспорт в CSV</button>
          </div>
        </form>

        {/* Таблица для Десктопа */}
        <div className="table-container hidden md:block">
          <table className="table-base">
            <thead className="table-header">
              <tr>
                <th className="p-3">ID / Дата</th>
                <th className="p-3">User (ID)</th>
                <th className="p-3">Модель (ID)</th>
                <th className="p-3">Статус</th>
                <th className="p-3">Latency</th>
              </tr>
            </thead>
            <tbody>
              {pageLogs.map(log => (
                <React.Fragment key={log.id}>
                  <tr className="table-row group">
                    <td className="p-3 text-gray-500">{log.id} | {new Date(log.created_at).toLocaleString('ru-RU')}</td>
                    <td className="p-3">{log.username ? `${log.username} (${log.user_id})` : 'N/A'}</td>
                    <td className="p-3 font-medium">{log.model_name ? `${log.model_name} (${log.model_id})` : 'N/A'}</td>
                    <td className="p-3"><span className={`badge ${log.http_status === 200 ? 'badge-success' : 'badge-error'}`}>{log.http_status}</span></td>
                    <td className="p-3 font-mono">{log.latency_ms} ms</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                    <td colSpan="5" className="p-4">
                      <details className="cursor-pointer max-h-96 overflow-y-auto">
                        <summary className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 sticky top-0 bg-gray-50 dark:bg-gray-900/50 py-1">
                          Показать детали (промпт и ответ)
                        </summary>
                        <div className="mt-3 space-y-3">
                          <div className="card p-3">
                            <p className="font-semibold mb-1">Промпт:</p>
                            <p className="break-words">{log.req_payload?.inputs || log.req_payload?.messages?.[0]?.content || 'Неизвестный формат'}</p>
                          </div>
                          {log.image_file ? (
                            <div className="card p-3">
                              <p className="font-semibold mb-2">Результат:</p>
                              <div className="relative w-24 h-24 group overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                <img
                                  src={buildImageUrl(log.image_file)}
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
                            <div className="card p-3">
                              <p className="font-semibold mb-1">Ответ модели (JSON):</p>
                              <pre className="text-[12px] p-3 overflow-auto max-h-80 bg-gray-100 dark:bg-gray-900 rounded font-mono break-words whitespace-pre-wrap">
                                {JSON.stringify(log.res_payload, null, 2)}
                              </pre>
                            </div>
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

        {/* Карточки для Мобильных */}
        <div className="md:hidden flex flex-col gap-4">
          {pageLogs.map(log => (
            <div key={log.id} className="card p-4 text-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold">{log.model_name}</span>
                  <span className="text-xs text-gray-500"> ({log.model_id})</span>
                </div>
                <span className={`badge ${log.http_status === 200 ? 'badge-success' : 'badge-error'}`}>{log.http_status}</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Юзер: {log.username} ({log.user_id}) | {new Date(log.created_at).toLocaleString('ru-RU')}
              </div>
              <details className="cursor-pointer bg-gray-50 dark:bg-gray-700/30 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                <summary className="text-xs text-blue-600 dark:text-blue-400 font-medium sticky top-0 bg-gray-50 dark:bg-gray-700/30 py-1">Показать детали</summary>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500">Промпт:</p>
                    <p className="text-xs break-words">{log.req_payload?.inputs || log.req_payload?.messages?.[0]?.content || 'Неизвестный формат'}</p>
                  </div>
                  {log.image_file ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 mb-1">Результат:</p>
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={buildImageUrl(log.image_file)}
                          alt="Result"
                          onClick={() => setExpandedImage(log.image_file)}
                          className="w-full h-36 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 mb-1">Ответ (JSON):</p>
                      <pre className="text-[10px] p-2 overflow-auto max-h-64 bg-gray-200 dark:bg-gray-900 rounded font-mono break-words whitespace-pre-wrap">
                        {JSON.stringify(log.res_payload, null, 2)}
                      </pre>
                    </div>
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
            <div>Показано {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, globalLogs.length)} из {globalLogs.length}</div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-outline px-3 py-1">← Назад</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-outline px-3 py-1">Вперед →</button>
            </div>
          </div>
        )}
      </div>

      {/* Модалка просмотра изображения */}
      {expandedImage && (
        <div className="modal-backdrop" onClick={() => setExpandedImage(null)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50" onClick={() => setExpandedImage(null)}>
            <div className="relative max-w-3xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <button onClick={() => setExpandedImage(null)} className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <img src={buildImageUrl(expandedImage)} alt="Full size" className="max-w-full max-h-[90vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
