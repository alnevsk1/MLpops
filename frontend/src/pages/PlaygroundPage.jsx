import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, Send, X } from 'lucide-react';
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
    api.get(`/models/${id}/`).then(res => setModel(res.data));
    api.get('/users/profile/').then(res => setHasToken(res.data.has_token));
  }, [id]);

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(''); setResult(null);

    const payload = model.output_type === 'TEXT' 
      ? { messages: [{ role: "user", content: prompt }] }
      : { inputs: prompt };

    try {
      const res = await api.post(`/models/${id}/proxy/`, payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка инференса');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl; link.download = filename || 'image.jpg';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (!model) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div className="h-full flex flex-col">
      <h1 className="page-title mb-4">Песочница: {model.name}</h1>

      {!hasToken && (
        <div className="alert-warning">
          <AlertCircle size={20} className="flex-shrink-0" />
          <div><strong>Доступ ограничен.</strong> У вас не настроен токен. <Link to="/settings" className="underline ml-2">Настроить</Link></div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        <div className="card p-4 flex-1 flex flex-col">
          <h3 className="section-title text-sm">Ваш Промпт</h3>
          <textarea
            value={prompt} onChange={(e) => setPrompt(e.target.value)}
            disabled={!hasToken || loading}
            placeholder={model.output_type === 'TEXT' ? "Что такое пудж" : "Очень диталлизированный pudge..."}
            className="form-input flex-1 resize-none"
          />
          <button 
            onClick={handleRun} disabled={!hasToken || loading || !prompt}
            className="btn-primary w-full mt-4"
          >
            {loading ? 'Генерация...' : <><Send size={18} className="mr-2" /> Запустить</>}
          </button>
        </div>

        <div className="card p-4 flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 border-dashed">
          <h3 className="section-title text-sm">Результат</h3>
          <div className="card p-4 flex-1 overflow-auto border-none shadow-none text-sm">
            {error && <div className="text-red-500 mb-4">{error}</div>}
            
            {result && model.output_type === 'TEXT' && (
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {result.result?.choices?.[0]?.message?.content || result.result?.[0]?.generated_text || JSON.stringify(result.result)}
                </ReactMarkdown>
              </div>
            )}

            {result && model.output_type === 'IMAGE' && result.image_url && (
              <div className="flex flex-col items-center">
                <img src={result.image_url} alt="Gen" onClick={() => setExpandedImage(result.image_url)} className="max-w-full rounded cursor-pointer hover:opacity-90" />
                <button onClick={() => downloadImage(result.image_url)} className="btn-primary mt-4">Скачать</button>
              </div>
            )}

            {result && <div className="mt-4 pt-4 border-t text-xs text-gray-500">Latency: {result.latency_ms} ms | Status: {result.http_status}</div>}
          </div>
        </div>
      </div>

      {expandedImage && (
        <div className="modal-backdrop" onClick={() => setExpandedImage(null)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="section-title mb-0">Просмотр</h2>
              <button onClick={() => setExpandedImage(null)} className="btn-icon"><X/></button>
            </div>
            <div className="p-4 flex flex-col items-center">
              <img src={expandedImage} alt="Full" className="max-h-[70vh] rounded" />
              <button onClick={() => downloadImage(expandedImage)} className="btn-primary mt-4 w-full sm:w-auto">Скачать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlaygroundPage;