import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../api';
import { useApi } from '../hooks/useApi';
import { downloadImage } from '../utils';
import { OUTPUT_TYPE } from '../constants';

function PlaygroundPage() {
  const { id } = useParams();
  const { data: model, loading: modelLoading, error: modelError } = useApi(`/models/${id}/`, [id]);
  const { data: profile, loading: profileLoading } = useApi('/users/profile/');

  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedImage, setExpandedImage] = useState(null);

  const textareaRef = useRef(null);

  const hasToken = profile?.has_token ?? true;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(''); setResult(null);

    const payload = model.output_type === OUTPUT_TYPE.TEXT
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

  if (modelLoading || profileLoading) return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (modelError) return <div className="card p-12 text-center text-red-500">{modelError}</div>;

  return (
    <div className="h-full flex flex-col">
      <h1 className="page-title mb-4">Песочница: {model.name}</h1>

      {!hasToken && (
        <div className="alert-warning">
          <AlertCircle size={20} className="flex-shrink-0" />
          <div><strong>Доступ ограничен.</strong> У вас не настроен токен.<Link to="/settings" className="underline ml-2">Настроить</Link></div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        <div className="card p-4 flex-1 flex flex-col">
          <h3 className="section-title text-xl mb-4">Ваш Промпт</h3>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!hasToken || loading}
            placeholder={model.output_type === OUTPUT_TYPE.TEXT ? "Что такое пудж" : "Очень детализированный pudge..."}
            className="form-input resize-none overflow-y-auto min-h-[120px] max-h-[300px]"
            rows={1}
          />
          <div className="mt-auto pt-4">
            <button
              onClick={handleRun}
              disabled={!hasToken || loading || !prompt}
              className="btn-primary w-full"
            >
              {loading ? 'Генерация...' : <><Send size={18} className="mr-2" /> Запустить</>}
            </button>
          </div>
        </div>

        <div className="card p-4 flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 border-dashed">
          <h3 className="section-title text-xl">Результат</h3>
          <div className="card p-4 flex-1 overflow-auto border-none shadow-none text-sm">
            {error && <div className="text-red-500 mb-4">{error}</div>}

            {result && model.output_type === OUTPUT_TYPE.TEXT && (
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {result.result?.choices?.[0]?.message?.content || result.result?.[0]?.generated_text || JSON.stringify(result.result)}
                </ReactMarkdown>
              </div>
            )}

            {result && model.output_type === OUTPUT_TYPE.IMAGE && result.image_url && (
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
