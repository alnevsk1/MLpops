import React, { useState, useEffect } from 'react';
import api from '../api';

function HistoryPage() {
  const [logs, setLogs] = useState([]);

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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">История генераций</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                <td className="p-4 whitespace-nowrap text-gray-500">
                  {new Date(log.created_at).toLocaleString('ru-RU')}
                </td>
                <td className="p-4 font-medium">{log.model_name}</td>
                <td className="p-4 text-gray-600 dark:text-gray-300 italic">
                  "{getPromptText(log.req_payload)}"
                </td>
                <td className="p-4">
                  {log.image_file ? (
                    <img 
                      src={log.image_file.startsWith('http') ? log.image_file : `http://127.0.0.1:8000${log.image_file}`} 
                      alt="Miniature" 
                      className="h-12 w-12 object-cover rounded border cursor-pointer hover:scale-150 transition-transform origin-left"
                    />
                  ) : (
                    <details className="cursor-pointer">
                        <summary className="text-xs text-blue-600 dark:text-blue-400 font-medium">Показать JSON</summary>
                        <pre className="text-[10px] bg-gray-100 dark:bg-gray-900 p-2 mt-2 rounded max-w-xs overflow-x-auto text-gray-800 dark:text-gray-300">
                        {JSON.stringify(log.res_payload, null, 2)}
                        </pre>
                    </details>
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
            {logs.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">У вас еще нет истории запросов</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistoryPage;