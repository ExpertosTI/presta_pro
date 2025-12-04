import React, { useState } from 'react';

export function EmployeeModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    role: 'Cobrador',
    phone: '',
  });

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    onSave(form);
    setForm({ name: '', role: '', phone: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Nuevo Empleado</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cargo / Rol</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg bg-white"
            >
              <option value="Cobrador">Cobrador</option>
              <option value="Secretaria">Secretaria</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Administrador">Administrador</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg"
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

export default EmployeeModal;
