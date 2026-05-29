import React, { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { MODEL_STATUS } from '../constants';

function CatalogPage() {
  const { data: models, loading, error } = useApi('/models/');
  const [viewMode, setViewMode] = useState('grid');

  const getStatusColor = (status) => {
    if (status === MODEL_STATUS.ONLINE) return 'bg-green-500';
    if (status === MODEL_STATUS.OFFLINE) return 'bg-red-500';
    return 'bg-gray-500';
  };

  if (loading) return <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="card p-12 text-center text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="page-title mb-0">Каталог моделей</h1>

        <div className="hidden sm:flex bg-gray-200 dark:bg-gray-700 rounded p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            title="Сетка"
          >
            <LayoutGrid size={20}/>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            title="Список"
          >
            <List size={20}/>
          </button>
        </div>
      </div>

      <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
        {(models || []).map(model => (
          <div
            key={model.id}
            className={`card p-4 sm:p-6 flex flex-col ${viewMode === 'list' ? 'sm:flex-row sm:items-center sm:justify-between' : 'h-full'}`}
          >
            <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'flex flex-col' : ''}`}>
              <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                <h2 className="text-lg sm:text-xl font-semibold truncate text-gray-900 dark:text-white">
                  {model.name}
                </h2>
                <div className={`flex items-center space-x-2 flex-shrink-0 ${viewMode === 'list' ? 'sm:hidden' : ''}`}>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{model.output_type}</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(model.status)}`} title={model.status}></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {model.tags.map(tag => (
                  <span key={tag.id} className="badge" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>

            <div className={`flex flex-col w-full sm:w-auto ${viewMode === 'list' ? 'mt-4 sm:mt-0 sm:items-end gap-2' : 'mt-auto pt-6'}`}>
              {viewMode === 'list' && (
                <div className="hidden sm:flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{model.output_type}</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(model.status)}`} title={model.status}></div>
                </div>
              )}
              <Link
                to={`/playground/${model.id}`}
                className={`btn-primary whitespace-nowrap ${viewMode === 'grid' ? 'w-full' : 'w-full sm:w-auto px-6'}`}
              >
                Тестировать
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CatalogPage;
