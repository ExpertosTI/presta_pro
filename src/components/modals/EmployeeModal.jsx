import React, { useState, useEffect } from 'react';

export function EmployeeModal({ open, onClose, onSave, initialEmployee }) {
  const emptyForm = {
    name: '',
    phone: '',
    address: '',
    idNumber: '', // Cédula
    role: 'Empleado',
    notes: '',
    photoUrl: '',
    email: '',
  };

  const [form, setForm] = useState(emptyForm);

  const roles = [
    { value: 'Empleado', label: 'Empleado General' },
    { value: 'Cobrador', label: 'Cobrador' },
    { value: 'Secretaria', label: 'Secretaria' },
    { value: 'Supervisor', label: 'Supervisor' },
    { value: 'Admin', label: 'Administrador' },
  ];

  useEffect(() => {
    if (!open) return;
    if (initialEmployee) {
      setForm({
        name: initialEmployee.name || '',
        phone: initialEmployee.phone || '',
        address: initialEmployee.address || '',
        idNumber: initialEmployee.idNumber || '',
        role: initialEmployee.role || 'Empleado',
        notes: initialEmployee.notes || '',
        photoUrl: initialEmployee.photoUrl || '',
        email: initialEmployee.email || '',
      });
    } else {
      setForm({ ...emptyForm });
    }
  }, [open, initialEmployee]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;

    const payload = initialEmployee && initialEmployee.id
      ? { ...initialEmployee, ...form }
      : form;

    onSave(payload);
    setForm(emptyForm);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Dynamic import to avoid issues if utils not loaded
        const { fileToBase64, resizeImage } = await import('../../shared/utils/imageUtils.js');
        const base64 = await fileToBase64(file);
        const resized = await resizeImage(base64, 300, 300);
        setForm(prev => ({ ...prev, photoUrl: resized }));
      } catch (error) {
        console.error("Error processing image", error);
        // Fallback or alert if utils fail
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-2xl p-6 w-full max-w-md border border-white/20 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          {initialEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* FOTO */}
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-500/30 shadow-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="Employee" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-slate-300">👤</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition-colors" title="Cambiar foto">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </label>
            </div>
          </div>

          {/* NOMBRE */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre completo</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Ej: María Rodríguez"
              required
            />
          </div>

          {/* ROL */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Cargo / Rol</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            >
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {form.role === 'Cobrador' && (
              <p className="text-xs text-blue-500 mt-1">ℹ️ Este empleado se agregará automáticamente a la lista de cobradores.</p>
            )}
          </div>

          {/* TELÉFONO Y CÉDULA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Ej: 809-555-5555"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Cédula / ID</label>
              <input
                name="idNumber"
                value={form.idNumber}
                onChange={handleChange}
                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Documento de identidad"
              />
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email (Opcional)</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          {/* DIRECCIÓN */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Sector, calle, # casa"
            />
          </div>

          {/* NOTAS */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 min-h-[60px] text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors font-medium" onClick={onClose}>Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md transition-all">Guardar Empleado</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeModal;
