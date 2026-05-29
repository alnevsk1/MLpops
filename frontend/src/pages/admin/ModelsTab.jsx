import React, { useReducer, useEffect, useRef } from 'react';
import api from '../../api';
import { OUTPUT_TYPE } from '../../constants';

const DEFAULT_FORM = { name: '', endpoint_url: '', hf_model_id: '', output_type: OUTPUT_TYPE.TEXT, status: 'UNKNOWN', tags: [] };

const formReducer = (state, action) => {
  switch (action.type) {
    case 'SELECT_NEW':
      return { editingModelId: null, modelForm: DEFAULT_FORM, initialModelForm: DEFAULT_FORM, deleteModal: null };
    case 'SELECT_MODEL': {
      const form = {
        name: action.model.name,
        endpoint_url: action.model.endpoint_url || '',
        hf_model_id: action.model.hf_model_id || '',
        output_type: action.model.output_type,
        status: action.model.status,
        tags: action.model.tags.map(t => t.id),
      };
      return { editingModelId: action.model.id, modelForm: form, initialModelForm: structuredClone(form), deleteModal: null };
    }
    case 'FORM_CHANGE':
      return { ...state, modelForm: { ...state.modelForm, ...action.patch } };
    case 'TOGGLE_TAG': {
      const tags = state.modelForm.tags.includes(action.tagId)
        ? state.modelForm.tags.filter(id => id !== action.tagId)
        : [...state.modelForm.tags, action.tagId];
      return { ...state, modelForm: { ...state.modelForm, tags } };
    }
    case 'SAVE_SUCCESS': {
      const updatedForm = { ...state.modelForm, status: action.status };
      return { ...state, modelForm: updatedForm, initialModelForm: structuredClone(updatedForm), editingModelId: action.modelId };
    }
    case 'DELETE_CONFIRM':
      return { ...state, deleteModal: state.editingModelId };
    case 'DELETE_CANCEL':
      return { ...state, deleteModal: null };
    case 'DELETE_SUCCESS':
      return { editingModelId: null, modelForm: DEFAULT_FORM, initialModelForm: DEFAULT_FORM, deleteModal: null };
    default:
      return state;
  }
};

const isFormDirty = (form, initial) => {
  const keys = Object.keys(DEFAULT_FORM);
  return keys.some(key => {
    if (key === 'tags') {
      // Tags order is arbitrary (API vs user clicks), sort before comparing.
      return [...form.tags].sort().join(',') !== [...initial.tags].sort().join(',');
    }
    return form[key] !== initial[key];
  });
};

export default function ModelsTab({ tags, modelsList, showNotify, onModelsChange }) {
  const [state, dispatch] = useReducer(formReducer, {
    editingModelId: null,
    modelForm: DEFAULT_FORM,
    initialModelForm: DEFAULT_FORM,
    deleteModal: null,
  });

  const { editingModelId, modelForm, initialModelForm, deleteModal } = state;

  const handleSelectModel = (e) => {
    const val = e.target.value;
    if (val === 'NEW') {
      dispatch({ type: 'SELECT_NEW' });
    } else {
      const selected = modelsList.find(m => m.id === parseInt(val));
      dispatch({ type: 'SELECT_MODEL', model: selected });
    }
  };

  const handleSaveModel = async (e) => {
    e.preventDefault();
    if (modelForm.tags.length === 0) return showNotify('Необходимо выбрать хотя бы один тег', 'error');

    try {
      let savedModelId = editingModelId;
      if (editingModelId) {
        await api.put(`/models/${editingModelId}/`, modelForm);
        showNotify('Модель успешно обновлена!');
      } else {
        const res = await api.post('/models/', { ...modelForm, status: 'UNKNOWN' });
        savedModelId = res.data.id;
        showNotify('Модель добавлена. Проверяем доступность...', 'info');
      }

      const checkRes = await api.post(`/models/${savedModelId}/check-status/`);
      const finalStatus = checkRes.data.status;
      showNotify(`Статус: ${finalStatus}`, finalStatus === 'ONLINE' ? 'success' : 'error');

      dispatch({ type: 'SAVE_SUCCESS', status: finalStatus, modelId: savedModelId });
      onModelsChange();
    } catch {
      showNotify('Ошибка при сохранении модели', 'error');
    }
  };

  const handleDeleteModel = async () => {
    try {
      await api.delete(`/models/${deleteModal}/`);
      dispatch({ type: 'DELETE_SUCCESS' });
      onModelsChange();
      showNotify('Модель удалена!');
    } catch {
      showNotify('Ошибка при удалении модели', 'error');
    }
  };

  const dirty = isFormDirty(modelForm, initialModelForm);

  return (
    <>
      <div className="card p-4 sm:p-6 max-w-2xl">
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <label className="form-label">Выберите модель для редактирования</label>
          <select onChange={handleSelectModel} value={editingModelId || 'NEW'} className="form-input">
            <option value="NEW">-- Создать новую модель --</option>
            {modelsList.map(m => <option key={m.id} value={m.id}>{m.name} ({m.status})</option>)}
          </select>
        </div>

        <form onSubmit={handleSaveModel} className="space-y-4">
          <div>
            <label className="form-label">Имя модели</label>
            <input required value={modelForm.name} onChange={e => dispatch({ type: 'FORM_CHANGE', patch: { name: e.target.value } })} className="form-input"/>
          </div>
          <div>
            <label className="form-label">Endpoint URL</label>
            <input required type="url" value={modelForm.endpoint_url} onChange={e => dispatch({ type: 'FORM_CHANGE', patch: { endpoint_url: e.target.value } })} className="form-input"/>
          </div>
          <div>
            <label className="form-label">HF Model ID (Опционально)</label>
            <input value={modelForm.hf_model_id} onChange={e => dispatch({ type: 'FORM_CHANGE', patch: { hf_model_id: e.target.value } })} className="form-input"/>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="form-label">Тип вывода</label>
              <select value={modelForm.output_type} onChange={e => dispatch({ type: 'FORM_CHANGE', patch: { output_type: e.target.value } })} className="form-input">
                <option value={OUTPUT_TYPE.TEXT}>Text</option>
                <option value={OUTPUT_TYPE.IMAGE}>Image</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="form-label">Статус (Авто-проверка)</label>
              <input value={modelForm.status} disabled className="form-input font-bold" />
            </div>
          </div>

          <div>
            <label className="form-label">Присвоенные теги <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {tags.map(tag => (
                <span
                  key={tag.id}
                  onClick={() => dispatch({ type: 'TOGGLE_TAG', tagId: tag.id })}
                  style={{ backgroundColor: tag.color, opacity: modelForm.tags.includes(tag.id) ? 1 : 0.3 }}
                  className="badge cursor-pointer hover:opacity-80 py-1.5 px-3"
                >
                  {tag.name}
                </span>
              ))}
            </div>
            {modelForm.tags.length === 0 && <p className="text-red-500 text-xs mt-2">Выберите хотя бы один тег</p>}
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button type="submit" disabled={!dirty || modelForm.tags.length === 0} className="btn-purple w-full">
              {editingModelId ? 'Сохранить изменения' : 'Зарегистрировать и проверить'}
            </button>
            {editingModelId && (
              <button type="button" onClick={() => dispatch({ type: 'DELETE_CONFIRM' })} className="btn-danger w-full">
                Удалить модель
              </button>
            )}
          </div>
        </form>
      </div>

      {deleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm p-6">
            <h2 className="section-title text-gray-900 dark:text-gray-100">Удалить модель?</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">
              Вы уверены, что хотите удалить модель <strong>{modelsList.find(m => m.id === deleteModal)?.name}</strong>? Это действие необратимо.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => dispatch({ type: 'DELETE_CANCEL' })} className="btn-outline flex-1">Отмена</button>
              <button onClick={handleDeleteModel} className="btn-danger flex-1">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
