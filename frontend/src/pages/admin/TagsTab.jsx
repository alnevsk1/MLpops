import React, { useState } from 'react';
import api from '../../api';

export default function TagsTab({ tags, showNotify, onTagsChange }) {
  const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6' });
  const [deleteModal, setDeleteModal] = useState(null);

  const handleSaveTag = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tags/', newTag);
      setNewTag({ name: '', color: '#3b82f6' });
      onTagsChange();
      showNotify('Тег создан!');
    } catch {
      showNotify('Ошибка при создании тега', 'error');
    }
  };

  const handleDeleteTag = async () => {
    try {
      await api.delete(`/tags/${deleteModal}/`);
      setDeleteModal(null);
      onTagsChange();
      showNotify('Тег удален!');
    } catch {
      showNotify('Ошибка при удалении', 'error');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <form onSubmit={handleSaveTag} className="card p-4 sm:p-6">
          <h2 className="section-title">Создать новый тег</h2>
          <div className="mb-4">
            <label className="form-label">Название тега</label>
            <input
              required
              value={newTag.name}
              onChange={e => setNewTag({ ...newTag, name: e.target.value })}
              className="form-input"
              placeholder="Например: NLP..."
            />
          </div>
          <div className="mb-6">
            <label className="form-label">Цвет (HEX)</label>
            <div className="flex items-center space-x-3">
              <input
                required
                type="color"
                value={newTag.color}
                onChange={e => setNewTag({ ...newTag, color: e.target.value })}
                className="h-10 w-16 p-0 border-0 rounded cursor-pointer"
              />
              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{newTag.color.toUpperCase()}</span>
            </div>
          </div>
          <button type="submit" className="btn-purple w-full sm:w-auto">Создать тег</button>
        </form>

        <div className="card p-4 sm:p-6">
          <h2 className="section-title">Существующие теги</h2>
          <div className="flex flex-wrap gap-3">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900 pr-2 rounded overflow-hidden border dark:border-gray-700">
                <div className="w-4 h-full py-3" style={{ backgroundColor: tag.color }}></div>
                <span className="text-sm font-medium px-1">{tag.name}</span>
                <button type="button" onClick={() => setDeleteModal(tag.id)} className="text-red-500 hover:text-red-700 font-bold ml-2 text-xs">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {deleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm p-6">
            <h2 className="section-title text-gray-900 dark:text-gray-100">Удалить тег?</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">
              Вы уверены, что хотите удалить тег <strong>{tags.find(t => t.id === deleteModal)?.name}</strong>?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setDeleteModal(null)} className="btn-outline flex-1">Отмена</button>
              <button onClick={handleDeleteTag} className="btn-danger flex-1">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
