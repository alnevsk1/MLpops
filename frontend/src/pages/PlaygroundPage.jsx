import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

function PlaygroundPage() {
  const { id } = useParams();
  const [model, setModel] = useState(null);
  const [hasToken, setHasToken] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedImage, setExpandedImage] = useState(null);

  useEffect(() => {
    // Получаем модель
    api.get(`/models/${id}/`).then(res => setModel(res.data));
    // Проверяем наличие токена
    api.get('/users/profile/').then(res => setHasToken(res.data.has_token));
  }, [id]);

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    // УМНОЕ ФОРМИРОВАНИЕ PAYLOAD
    const payload = model.output_type === 'TEXT' 
      ? { messages: [{ role: "user", content: prompt }] }
      : { inputs: prompt };

    try {
      const res = await api.post(`/models/${id}/proxy/`, payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при выполнении инференса');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!model) return <div>Загрузка...</div>;

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Песочница: {model.name}</h1>

      {!hasToken && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded flex items-center mb-6">
          <AlertCircle className="text-yellow-600 dark:text-yellow-500 mr-3" />
          <div className="text-yellow-800 dark:text-yellow-400">
            <strong>Доступ ограничен.</strong> У вас не настроен Hugging Face токен. 
            <Link to="/settings" className="underline ml-2">Перейти в настройки</Link>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        {/* Левая панель - Ввод */}
        <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
          <h3 className="font-semibold mb-2">Ваш Промпт</h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!hasToken || loading}
            placeholder={model.output_type === 'TEXT' ? "What is the capital of France?" : "A beautiful sunset, highly detailed, 8k..."}
            className={`flex-1 w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${!hasToken ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <button 
            onClick={handleRun}
            disabled={!hasToken || loading || !prompt}
            className={`mt-4 py-3 rounded flex items-center justify-center text-white transition-colors
              ${(!hasToken || loading || !prompt) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            {loading ? 'Генерация...' : <><Send size={18} className="mr-2" /> Запустить Инференс</>}
          </button>
        </div>

        {/* Правая панель - Вывод */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col">
          <h3 className="font-semibold mb-2">Результат</h3>
          
          <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
            {error && <div className="text-red-500">{error}</div>}
            
            {result && model.output_type === 'TEXT' && (
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>
                  {result.result?.choices?.[0]?.message?.content || result.result?.[0]?.generated_text || JSON.stringify(result.result, null, 2)}
                </ReactMarkdown>
              </div>
            )}

            {result && model.output_type === 'IMAGE' && result.image_url && (
              <div className="flex flex-col items-center">
                <img
                  src={result.image_url}
                  alt="Generated"
                  onClick={() => setExpandedImage(result.image_url)}
                  className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                />
                <button
                  onClick={() => downloadImage(result.image_url, `generated_${Date.now()}.jpg`)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors text-sm"
                >
                  Скачать
                </button>
              </div>
            )}

            {result && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                Запрос выполнен за {result.latency_ms} ms | Статус: {result.http_status}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* MODAL ДЛЯ ПРОСМОТРА КАРТИНКИ */}
      {expandedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setExpandedImage(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Просмотр изображения</h2>
              <button
                onClick={() => setExpandedImage(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-4 flex flex-col items-center">
              <img
                src={expandedImage}
                alt="Full size"
                className="max-w-full max-h-96 rounded"
              />
              <button
                onClick={() => downloadImage(expandedImage, `generated_${Date.now()}.jpg`)}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                Скачать
              </button>
            </div>
          </div>
        </div>
      )}    </div>
  );
}

export default PlaygroundPage;