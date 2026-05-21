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
    if (status === 'ONLINE') return 'bg-green-500';
    if (status === 'OFFLINE') return 'bg-red-500';
    return 'bg-gray-500';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Каталог моделей</h1>
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded p-1">
          <button 
            onClick={() => setViewMode('grid')} 
            className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
          >
            <LayoutGrid size={20}/>
          </button>
          <button 
            onClick={() => setViewMode('list')} 
            className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
          >
            <List size={20}/>
          </button>
        </div>
      </div>
      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col space-y-4"}>
        {models.map(model => (
          <div key={model.id} className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${viewMode === 'grid' ? 'flex flex-col' : 'flex flex-row items-center justify-between'}`}>
            <div className={viewMode === 'grid' ? 'w-full' : 'flex-1'}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">{model.name}</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{model.output_type}</span>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(model.status)}`} title={model.status}></div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6 flex-1">
                {model.tags.map(tag => (
                  <span key={tag.id} className="px-2 py-1 text-xs text-white rounded" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>

            <Link 
              to={`/playground/${model.id}`}
              className={`${viewMode === 'grid' ? 'block w-full text-center' : 'ml-4 flex-shrink-0'} bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors`}
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