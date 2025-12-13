import React, { useState, useEffect } from 'react';
import Card from '../../../shared/components/ui/Card';
import { formatDateTime } from '../../../shared/utils/formatters';
import api from '../../../services/api';

export function NotesView({ showToast }) {
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.get('/notes');
      setNotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading notes:', error);
      showToast?.('Error cargando notas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;

    try {
      setSaving(true);
      const newNote = await api.post('/notes', { text: note.trim() });
      setNotes(prev => [newNote, ...prev]);
      setNote('');
      showToast?.('Nota guardada', 'success');
    } catch (error) {
      console.error('Error saving note:', error);
      showToast?.('Error guardando nota', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateNote = async (id) => {
    if (!editText.trim()) return;
    try {
      const updated = await api.put(`/notes/${id}`, { text: editText.trim() });
      setNotes(prev => prev.map(n => n.id === id ? { ...n, text: editText.trim() } : n));
      setEditingId(null);
      showToast?.('Nota actualizada', 'success');
    } catch (error) {
      console.error('Error updating note:', error);
      showToast?.('Error actualizando nota', 'error');
    }
  };

  const deleteNote = async (id) => {
    try {
      await api.delete(`/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
      showToast?.('Nota eliminada', 'success');
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast?.('Error eliminando nota', 'error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  const startEdit = (n) => {
    setEditingId(n.id);
    setEditText(n.text);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Card>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          📝 Bloc de Notas
        </h2>
        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            placeholder="Escribe una nota rápida..."
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
          />
          <button
            onClick={addNote}
            disabled={saving || !note.trim()}
            className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '...' : 'Agregar'}
          </button>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-8">Cargando notas...</p>
        ) : (
          <div className="space-y-3">
            {notes.map(n => (
              <div key={n.id} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl relative group">
                {editingId === n.id ? (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 p-2 border border-blue-400 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => updateNote(n.id)}
                      onKeyDown={e => e.key === 'Enter' && updateNote(n.id)}
                      autoFocus
                    />
                    <button onClick={() => updateNote(n.id)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm">✓</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-400 text-white rounded-lg text-sm">✕</button>
                  </div>
                ) : (
                  <p
                    className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-800/30 p-1 rounded transition-colors"
                    onClick={() => startEdit(n)}
                    title="Click para editar"
                  >{n.text}</p>
                )}
                <p className="text-xs text-slate-400 mt-2">{formatDateTime(n.createdAt || n.date)}</p>
                <button
                  onClick={() => deleteNote(n.id)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xl font-bold"
                  title="Eliminar nota"
                >
                  ×
                </button>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="text-center text-slate-400 py-4">No hay notas guardadas.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default NotesView;
