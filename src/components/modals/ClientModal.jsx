import React, { useState } from 'react';

export function ClientModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    idNumber: '',
    notes: '',
  });

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    onSave(form);
    setForm({ name: '', phone: '', address: '', idNumber: '', notes: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Nuevo Cliente</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre completo</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
                placeholder="Ej: 809-000-0000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cédula / ID</label>
              <input
                name="idNumber"
                value={form.idNumber}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              placeholder="Sector, calle, referencia"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg min-h-[60px] text-sm"
              placeholder="Información adicional del cliente"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="px-4 py-2 rounded-lg bg-slate-100" onClick={onClose}>Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientModal;
