import React, { useState, useEffect } from 'react';

// MEJORA 11: Dominican cedula format validation
const formatCedula = (value) => {
  // Remove non-digits
  const digits = value.replace(/\D/g, '');

  // Format as 000-0000000-0
  if (digits.length <= 3) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10, 11)}`;
};

const validateCedula = (cedula) => {
  if (!cedula) return true; // Optional field
  const clean = cedula.replace(/\D/g, '');
  return clean.length === 11;
};

export function ClientModal({ open, onClose, onSave, initialClient, collectors = [] }) {
  const emptyForm = {
    name: '',
    phone: '',
    address: '',
    idNumber: '',
    notes: '',
    email: '',
    birthDate: '',
    collectorId: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (initialClient) {
      setForm({
        name: initialClient.name || '',
        phone: initialClient.phone || '',
        address: initialClient.address || '',
        idNumber: initialClient.idNumber || '',
        notes: initialClient.notes || '',
        photoUrl: initialClient.photoUrl || '',
        email: initialClient.email || '',
        birthDate: initialClient.birthDate ? new Date(initialClient.birthDate).toISOString().split('T')[0] : '',
        collectorId: initialClient.collectorId || '',
      });
    } else {
      setForm({ ...emptyForm, photoUrl: '' });
    }
    setErrors({});
  }, [open, initialClient]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    // MEJORA 11: Format cedula as user types
    if (name === 'idNumber') {
      setForm(prev => ({ ...prev, [name]: formatCedula(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }

    // MEJORA 11: Validate cedula format
    if (form.idNumber && !validateCedula(form.idNumber)) {
      newErrors.idNumber = 'Formato: 000-0000000-0';
    }

    // MEJORA 14: Validate email format
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = initialClient && initialClient.id
      ? { ...initialClient, ...form }
      : form;

    onSave(payload);
    setForm(emptyForm);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { fileToBase64, resizeImage } = await import('../../../shared/utils/imageUtils.js');
        const base64 = await fileToBase64(file);
        const resized = await resizeImage(base64, 300, 300);
        setForm(prev => ({ ...prev, photoUrl: resized }));
      } catch (error) {
        console.error("Error processing image", error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-2xl p-6 w-full max-w-lg border border-white/20 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          {initialClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo upload */}
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-500/30 shadow-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="Client" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-slate-300">📷</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition-colors" title="Cambiar foto">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </label>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre completo *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`w-full p-2.5 border ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
              placeholder="Ej: Juan Pérez"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Phone and Cedula */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Teléfono *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={`w-full p-2.5 border ${errors.phone ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
                placeholder="809-000-0000"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            {/* MEJORA 11: Cedula with validation */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Cédula / ID</label>
              <input
                name="idNumber"
                value={form.idNumber}
                onChange={handleChange}
                maxLength={13}
                className={`w-full p-2.5 border ${errors.idNumber ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
                placeholder="000-0000000-0"
              />
              {errors.idNumber && <p className="text-xs text-red-500 mt-1">{errors.idNumber}</p>}
            </div>
          </div>

          {/* MEJORA 14: Email and MEJORA 15: Birthday */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full p-2.5 border ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
                placeholder="cliente@email.com"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha de nacimiento</label>
              <input
                name="birthDate"
                type="date"
                value={form.birthDate}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Sector, calle, referencia"
            />
          </div>

          {/* MEJORA 4: Collector assignment */}
          {collectors.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Cobrador asignado</label>
              <select
                name="collectorId"
                value={form.collectorId}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                <option value="">Sin asignar</option>
                {collectors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 min-h-[60px] text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Información adicional del cliente"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors font-medium"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md transition-all"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientModal;
