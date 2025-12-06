import React, { useState } from 'react';
import Card from '../components/Card.jsx';
import { registerUser } from '../logic/authLogic';

export function SettingsView({
  systemSettings,
  setSystemSettings,
  collectors,
  addCollector,
  updateCollector,
  removeCollector,
  clients,
  assignCollectorToClient,
}) {
  const [form, setForm] = useState({
    companyName: systemSettings.companyName || 'Presta Pro',
    mainCurrency: systemSettings.mainCurrency || 'DOP',
    defaultPenaltyRate: systemSettings.defaultPenaltyRate ?? 5,
    themeColor: systemSettings.themeColor || 'indigo',
    securityUser: systemSettings.securityUser || 'admin',
    securityPassword: systemSettings.securityPassword || '1234',
  });

  const [collectorForm, setCollectorForm] = useState({ name: '', phone: '' });
  const [editingCollectorId, setEditingCollectorId] = useState('');
  const [editingCollectorForm, setEditingCollectorForm] = useState({ name: '', phone: '' });
  const [selectedCollectorId, setSelectedCollectorId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '' });
  const [userError, setUserError] = useState('');

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
       securityUser: form.securityUser.trim() || 'admin',
       securityPassword: form.securityPassword,
    });
  };

  const handleAddCollector = (e) => {
    e.preventDefault();
    if (!collectorForm.name.trim()) return;
    addCollector({ ...collectorForm });
    setCollectorForm({ name: '', phone: '' });
  };

  const startEditCollector = (collector) => {
    setEditingCollectorId(collector.id);
    setEditingCollectorForm({ name: collector.name || '', phone: collector.phone || '' });
  };

  const handleUpdateCollector = (collectorId) => {
    if (!editingCollectorForm.name.trim()) return;
    updateCollector({ id: collectorId, name: editingCollectorForm.name.trim(), phone: editingCollectorForm.phone.trim() });
    setEditingCollectorId('');
    setEditingCollectorForm({ name: '', phone: '' });
  };

  const handleRemoveCollector = (collectorId) => {
    removeCollector(collectorId);
    if (selectedCollectorId === collectorId) {
      setSelectedCollectorId('');
    }
  };

  const handleAssignRoute = (e) => {
    e.preventDefault();
    if (!selectedCollectorId || !selectedClientId) return;
    assignCollectorToClient(selectedClientId, selectedCollectorId);
    setSelectedClientId('');
  };

  const handleRegisterUser = () => {
    setUserError('');
    const result = registerUser(collectors, userForm.username, userForm.password, userForm.name);
    if (!result.success) {
      setUserError(result.error || 'No se pudo registrar el usuario');
      return;
    }
    addCollector(result.userData);
    setUserForm({ name: '', username: '', password: '' });
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

          <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Usuarios de acceso (cobradores)</h4>
            <p className="text-xs text-slate-500 mb-3">
              Crea usuarios con nombre de acceso y contraseña para que los cobradores entren al sistema.
            </p>
            {userError && (
              <p className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {userError}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nombre completo</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg bg-slate-50"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Usuario</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg bg-slate-50"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="usuario.cobrador"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
                <input
                  type="password"
                  className="w-full p-2 border rounded-lg bg-slate-50"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Mínimo 4 caracteres"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleRegisterUser}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm"
            >
              Registrar usuario de acceso
            </button>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Seguridad e inicio de sesión</h4>
            <p className="text-xs text-slate-500 mb-3">
              Estas credenciales se usan para acceder al panel en este dispositivo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Usuario administrador</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg bg-slate-50"
                  value={form.securityUser}
                  onChange={(e) => setForm({ ...form, securityUser: e.target.value })}
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña / PIN</label>
                <input
                  type="password"
                  className="w-full p-2 border rounded-lg bg-slate-50"
                  value={form.securityPassword}
                  onChange={(e) => setForm({ ...form, securityPassword: e.target.value })}
                  placeholder="••••••"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Protege solo este dispositivo. Usa también el bloqueo del sistema operativo.
                </p>
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
                {collectors.map((c) => {
                  const isEditing = editingCollectorId === c.id;
                  return (
                    <li key={c.id} className="py-2 flex flex-col gap-1">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="flex-1 p-2 border rounded-lg bg-slate-50"
                              value={editingCollectorForm.name}
                              onChange={(e) => setEditingCollectorForm({ ...editingCollectorForm, name: e.target.value })}
                              placeholder="Nombre del cobrador"
                            />
                            <input
                              type="text"
                              className="w-40 p-2 border rounded-lg bg-slate-50"
                              value={editingCollectorForm.phone}
                              onChange={(e) => setEditingCollectorForm({ ...editingCollectorForm, phone: e.target.value })}
                              placeholder="Teléfono"
                            />
                          </div>
                          <div className="flex gap-2 justify-end text-xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateCollector(c.id)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCollectorId('');
                                setEditingCollectorForm({ name: '', phone: '' });
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 font-semibold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.phone}</p>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => startEditCollector(c)}
                              className="px-3 py-1 rounded-lg bg-slate-900 text-white font-semibold"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCollector(c.id)}
                              className="px-3 py-1 rounded-lg bg-red-100 text-red-700 font-semibold"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Asignación de Clientes a Cobradores</h3>
        <p className="text-xs text-slate-500 mb-4">
          Elige un cobrador para cada cliente. El cambio se guarda inmediatamente cuando seleccionas un cobrador.
        </p>
        {clients.length === 0 ? (
          <p className="text-sm text-slate-400">No hay clientes registrados.</p>
        ) : collectors.length === 0 ? (
          <p className="text-sm text-slate-400">Primero agrega al menos un cobrador para poder asignarlo.</p>
        ) : (
          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">Cliente</th>
                  <th className="p-2 text-left">Teléfono</th>
                  <th className="p-2 text-left">Dirección</th>
                  <th className="p-2 text-left">Cobrador asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="p-2 font-medium text-slate-800">{client.name}</td>
                    <td className="p-2 text-slate-500">{client.phone || 'N/A'}</td>
                    <td className="p-2 text-slate-500 truncate max-w-[220px]">{client.address || 'N/A'}</td>
                    <td className="p-2">
                      <select
                        className="w-full p-2 border rounded-lg bg-slate-50 text-sm"
                        value={client.collectorId || ''}
                        onChange={(e) => assignCollectorToClient(client.id, e.target.value)}
                      >
                        <option value="">Sin asignar</option>
                        {collectors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default SettingsView;
