import React, { useState, useEffect } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';

function CatalogPage() {
  const [models, setModels] = useState([]);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    api.get('/models/').then(res => setModels(res.data));
  }, []);

  const getStatusColor = (status) => {
    if (status === 'ONLINE') return 'badge-success';
    if (status === 'OFFLINE') return 'badge-error';
    return 'badge-default';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="page-title mb-0">Каталог моделей</h1>
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}>
            <LayoutGrid size={20}/>
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}>
            <List size={20}/>
          </button>
        </div>
      </div>

      <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
        {models.map(model => (
          <div key={model.id} className={`card p-4 sm:p-6 ${viewMode === 'grid' ? 'flex flex-col' : 'flex flex-col sm:flex-row sm:items-center justify-between'}`}>
            <div className={viewMode === 'grid' ? 'w-full' : 'flex-1 min-w-0'}>
              <div className="flex justify-between items-start mb-4 gap-2">
                <h2 className="text-lg sm:text-xl font-semibold">{model.name}</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">{model.output_type}</span>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(model.status)}`} title={model.status}></div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                {model.tags.map(tag => (
                  <span key={tag.id} className="badge" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>

            <Link 
              to={`/playground/${model.id}`}
              className={`btn-primary ${viewMode === 'grid' ? 'w-full text-center' : 'mt-4 sm:mt-0 sm:ml-4'}`}
            >
              Тестировать
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CatalogPage;