import React, { useState } from 'react';
import Card from '../components/Card.jsx';

export function SettingsView({
  systemSettings,
  setSystemSettings,
  collectors,
  addCollector,
  clients,
  assignCollectorToClient,
}) {
  const [form, setForm] = useState({
    companyName: systemSettings.companyName || 'Presta Pro',
    mainCurrency: systemSettings.mainCurrency || 'DOP',
    defaultPenaltyRate: systemSettings.defaultPenaltyRate ?? 5,
    themeColor: systemSettings.themeColor || 'indigo',
  });

  const [collectorForm, setCollectorForm] = useState({ name: '', phone: '' });
  const [selectedCollectorId, setSelectedCollectorId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSystemSettings({
      ...systemSettings,
      companyName: form.companyName,
      mainCurrency: form.mainCurrency,
      defaultPenaltyRate: Number(form.defaultPenaltyRate) || 0,
      themeColor: form.themeColor,
      enableRouteGpsNotification: systemSettings.enableRouteGpsNotification ?? true,
      includeFutureInstallmentsInRoutes: systemSettings.includeFutureInstallmentsInRoutes ?? true,
    });
  };

  const handleAddCollector = (e) => {
    e.preventDefault();
    if (!collectorForm.name.trim()) return;
    addCollector({ ...collectorForm });
    setCollectorForm({ name: '', phone: '' });
  };

  const handleAssignRoute = (e) => {
    e.preventDefault();
    if (!selectedCollectorId || !selectedClientId) return;
    assignCollectorToClient(selectedClientId, selectedCollectorId);
    setSelectedClientId('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Ajustes</h2>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Configuración del Sistema</h3>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre de la Empresa</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg bg-slate-50"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Moneda Principal</label>
              <select
                className="w-full p-2 border rounded-lg bg-slate-50"
                value={form.mainCurrency}
                onChange={(e) => setForm({ ...form, mainCurrency: e.target.value })}
              >
                <option value="DOP">Peso Dominicano (DOP)</option>
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tasa de Mora por Defecto (%)</label>
              <input
                type="number"
                className="w-full p-2 border rounded-lg bg-slate-50"
                value={form.defaultPenaltyRate}
                onChange={(e) => setForm({ ...form, defaultPenaltyRate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Apariencia</label>
              <div className="flex gap-2">
                {['indigo', 'blue', 'emerald', 'violet'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, themeColor: color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      form.themeColor === color ? 'border-slate-900' : 'border-transparent'
                    } ${
                      color === 'indigo'
                        ? 'bg-indigo-700'
                        : color === 'blue'
                        ? 'bg-blue-600'
                        : color === 'emerald'
                        ? 'bg-emerald-500'
                        : 'bg-violet-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Notificación GPS para Rutas</p>
              <p className="text-xs text-slate-500">Si está activo, al iniciar una ruta se mostrará alerta de GPS/navegación.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSystemSettings({
                  ...systemSettings,
                  enableRouteGpsNotification: !systemSettings.enableRouteGpsNotification,
                })
              }
              className={`w-11 h-6 flex items-center rounded-full px-1 transition-colors ${
                systemSettings.enableRouteGpsNotification ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                  systemSettings.enableRouteGpsNotification ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Incluir cuotas futuras en Rutas</p>
              <p className="text-xs text-slate-500">Si está activo, la Ruta Inteligente mostrará todas las cuotas pendientes, no solo las vencidas hoy.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSystemSettings({
                  ...systemSettings,
                  includeFutureInstallmentsInRoutes: !systemSettings.includeFutureInstallmentsInRoutes,
                })
              }
              className={`w-11 h-6 flex items-center rounded-full px-1 transition-colors ${
                systemSettings.includeFutureInstallmentsInRoutes ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                  systemSettings.includeFutureInstallmentsInRoutes ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            type="submit"
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold"
          >
            Guardar Cambios
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Gestión de Cobradores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleAddCollector} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nombre del Cobrador</label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg bg-slate-50"
                value={collectorForm.name}
                onChange={(e) => setCollectorForm({ ...collectorForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono</label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg bg-slate-50"
                value={collectorForm.phone}
                onChange={(e) => setCollectorForm({ ...collectorForm, phone: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold"
            >
              Agregar Cobrador
            </button>
          </form>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Listado</h4>
            {collectors.length === 0 ? (
              <p className="text-sm text-slate-400">No hay cobradores registrados.</p>
            ) : (
              <ul className="text-sm divide-y divide-slate-100">
                {collectors.map((c) => (
                  <li key={c.id} className="py-1 flex justify-between">
                    <span>{c.name}</span>
                    <span className="text-xs text-slate-500">{c.phone}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Asignación de Rutas / Cobradores</h3>
        <form onSubmit={handleAssignRoute} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Cliente</label>
            <select
              className="w-full p-2 border rounded-lg bg-slate-50"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">Seleccionar Cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Cobrador</label>
            <select
              className="w-full p-2 border rounded-lg bg-slate-50"
              value={selectedCollectorId}
              onChange={(e) => setSelectedCollectorId(e.target.value)}
            >
              <option value="">Seleccionar Cobrador</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold"
          >
            Asignar Ruta
          </button>
        </form>
      </Card>
    </div>
  );
}

export default SettingsView;
