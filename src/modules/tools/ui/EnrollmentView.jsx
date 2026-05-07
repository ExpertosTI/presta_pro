import React, { useMemo, useState } from 'react';
import Card from '../../../shared/components/ui/Card';
import { Smartphone, ShieldCheck, Trash2, Download, Search } from 'lucide-react';

const STORAGE_KEY = 'rebless_enrolled_devices';

function getSavedDevices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function EnrollmentView({ showToast }) {
  const [devices, setDevices] = useState(getSavedDevices);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    imei: '',
    serial: '',
    brand: '',
    model: '',
    phoneNumber: '',
    notes: '',
  });

  const persist = (next) => {
    setDevices(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return devices;
    const q = search.toLowerCase();
    return devices.filter((d) =>
      [d.imei, d.serial, d.brand, d.model, d.phoneNumber]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [devices, search]);

  const handleEnroll = (e) => {
    e.preventDefault();
    const imei = form.imei.trim();
    const serial = form.serial.trim();

    if (!imei || imei.length < 14) {
      showToast?.('IMEI inválido. Debe tener al menos 14 dígitos.', 'error');
      return;
    }
    if (!serial) {
      showToast?.('Serial del equipo es requerido.', 'error');
      return;
    }

    const exists = devices.some((d) => d.imei === imei || d.serial === serial);
    if (exists) {
      showToast?.('Este teléfono ya está enrolado.', 'error');
      return;
    }

    const next = [{
      id: crypto.randomUUID(),
      ...form,
      imei,
      serial,
      enrolledAt: new Date().toISOString(),
      status: 'ENROLADO',
    }, ...devices];

    persist(next);
    setForm({ imei: '', serial: '', brand: '', model: '', phoneNumber: '', notes: '' });
    showToast?.('Teléfono enrolado correctamente.', 'success');
  };

  const handleDelete = (id) => {
    const next = devices.filter((d) => d.id !== id);
    persist(next);
    showToast?.('Registro eliminado.', 'info');
  };

  const exportCsv = () => {
    if (devices.length === 0) {
      showToast?.('No hay teléfonos enrolados para exportar.', 'error');
      return;
    }
    const header = 'IMEI,Serial,Marca,Modelo,Telefono,Estado,FechaEnrolamiento,Notas';
    const rows = devices.map((d) =>
      [d.imei, d.serial, d.brand, d.model, d.phoneNumber, d.status, d.enrolledAt, (d.notes || '').replace(/,/g, ' ')].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rebless-enrolamiento-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-emerald-500" />
            Enrolamiento de Teléfonos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Registra IMEI y serial para control del parque financiado.</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <Card>
        <form onSubmit={handleEnroll} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" placeholder="IMEI *" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
          <input className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" placeholder="Serial *" value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} />
          <input className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" placeholder="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" placeholder="Modelo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <input className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" placeholder="Teléfono del cliente" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
          <input className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" className="md:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold">
            <ShieldCheck size={16} /> Enrolar Equipo
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            placeholder="Buscar por IMEI, serial, marca o teléfono"
          />
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500">No hay equipos enrolados.</p>
          )}
          {filtered.map((d) => (
            <div key={d.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{d.brand || 'Equipo'} {d.model || ''}</p>
                <p className="text-slate-600 dark:text-slate-400">IMEI: {d.imei} · Serial: {d.serial}</p>
                <p className="text-slate-500">{d.phoneNumber || 'Sin teléfono'} · {new Date(d.enrolledAt).toLocaleString('es-DO')}</p>
              </div>
              <button onClick={() => handleDelete(d.id)} className="text-rose-500 hover:text-rose-400 p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}