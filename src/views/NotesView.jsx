import React, { useState } from 'react';
import Card from '../components/Card.jsx';
import { formatDateTime } from '../utils/formatters';

export function NotesView({ notes, setNotes }) {
  const [note, setNote] = useState('');

  const addNote = () => {
    if (!note) return;
    setNotes(prev => [...prev, { id: Date.now().toString(), text: note, date: new Date().toISOString() }]);
    setNote('');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Card>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Bloc de Notas</h2>
        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 p-3 border rounded-xl"
            placeholder="Escribe una nota rápida..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button onClick={addNote} className="bg-blue-600 text-white px-6 rounded-xl font-bold">
            Agregar
          </button>
        </div>
        <div className="space-y-3">
          {notes.map(n => (
            <div key={n.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl relative group">
              <p className="text-slate-800">{n.text}</p>
              <p className="text-xs text-slate-400 mt-2">{formatDateTime(n.date)}</p>
              <button
                onClick={() => setNotes(prev => prev.filter(x => x.id !== n.id))}
                className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
          {notes.length === 0 && <p className="text-center text-slate-400">No hay notas guardadas.</p>}
        </div>
      </Card>
    </div>
  );
}

export default NotesView;
