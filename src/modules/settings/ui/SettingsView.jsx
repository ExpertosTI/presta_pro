import React, { useState } from 'react';
import Card from '../../../shared/components/ui/Card';
import { registerUser } from '../../../logic/authLogic';
import { settingsService } from '../../../services/api';

// Use relative URLs - nginx will proxy to backend
const API_BASE_URL = '';

export function SettingsView({
  systemSettings,
  setSystemSettings,
  collectors,
  addCollector,
  updateCollector,
  removeCollector,
  clients,
  assignCollectorToClient,
  auth,
  showToast,
}) {
  const [form, setForm] = useState({
    companyName: systemSettings.companyName || 'Presta Pro',
    mainCurrency: systemSettings.mainCurrency || 'DOP',
    defaultPenaltyRate: systemSettings.defaultPenaltyRate ?? 5,
    themeColor: systemSettings.themeColor || 'indigo',
    securityUser: systemSettings.securityUser || 'admin',
    securityPassword: systemSettings.securityPassword || '1234',
    ownerDisplayName: systemSettings.ownerDisplayName || '',
    companyLogo: systemSettings.companyLogo || '',
  });

  const [collectorForm, setCollectorForm] = useState({ name: '', phone: '', photoUrl: '' });
  const [editingCollectorId, setEditingCollectorId] = useState('');
  const [editingCollectorForm, setEditingCollectorForm] = useState({ name: '', phone: '', photoUrl: '' });
  const [selectedCollectorId, setSelectedCollectorId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '' });
  const [userError, setUserError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  /* Sincronizar formulario cuando llegan settings del backend */
  React.useEffect(() => {
    setForm(prev => ({
      ...prev,
      companyName: systemSettings.companyName || prev.companyName,
      mainCurrency: systemSettings.mainCurrency || prev.mainCurrency,
      defaultPenaltyRate: systemSettings.defaultPenaltyRate || prev.defaultPenaltyRate,
      themeColor: systemSettings.themeColor || prev.themeColor,
      securityUser: systemSettings.securityUser || prev.securityUser,
      ownerDisplayName: systemSettings.ownerDisplayName || prev.ownerDisplayName,
      companyLogo: systemSettings.companyLogo || prev.companyLogo,
    }));
  }, [systemSettings]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const newSettings = {
      ...systemSettings,
      companyName: form.companyName,
      mainCurrency: form.mainCurrency,
      defaultPenaltyRate: Number(form.defaultPenaltyRate) || 0,
      themeColor: form.themeColor,
      enableRouteGpsNotification: systemSettings.enableRouteGpsNotification ?? true,
      includeFutureInstallmentsInRoutes: systemSettings.includeFutureInstallmentsInRoutes ?? true,
      securityUser: form.securityUser.trim() || 'admin',
      securityPassword: form.securityPassword,
      ownerDisplayName: form.ownerDisplayName || '',
      companyLogo: form.companyLogo || systemSettings.companyLogo || '',
    };

    try {
      // Persist to backend
      await settingsService.update(newSettings);
      setSystemSettings(newSettings);
      // Persist to localStorage as backup
      localStorage.setItem('systemSettings', JSON.stringify(newSettings));
      if (showToast) showToast('Ajustes guardados en servidor', 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      if (showToast) showToast('Error al guardar ajustes en servidor', 'error');
      // Fallback local update
      setSystemSettings(newSettings);
    }
  };

  const handleAddCollector = (e) => {
    e.preventDefault();
    if (!collectorForm.name.trim()) return;
    addCollector({ ...collectorForm });
    setCollectorForm({ name: '', phone: '', photoUrl: '' });
  };

  const handleCollectorImageChange = async (e, isEditing = false) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { fileToBase64, resizeImage } = await import('../../../shared/utils/imageUtils.js');
      const base64 = await fileToBase64(file);
      const resized = await resizeImage(base64, 300, 300);

      if (isEditing) {
        setEditingCollectorForm(prev => ({ ...prev, photoUrl: resized }));
      } else {
        setCollectorForm(prev => ({ ...prev, photoUrl: resized }));
      }
    } catch (error) {
      console.error("Error processing image", error);
    }
  };

  const handleCompanyLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { fileToBase64, resizeImage } = await import('../../../shared/utils/imageUtils.js');
      const base64 = await fileToBase64(file);
      const resized = await resizeImage(base64, 400, 400);
      setForm(prev => ({ ...prev, companyLogo: resized }));
    } catch (error) {
      console.error('Error processing company logo', error);
    }
  };

  const startEditCollector = (collector) => {
    setEditingCollectorId(collector.id);
    setEditingCollectorForm({
      name: collector.name || '',
      phone: collector.phone || '',
      photoUrl: collector.photoUrl || ''
    });
  };

  const handleUpdateCollector = (collectorId) => {
    if (!editingCollectorForm.name.trim()) return;
    updateCollector({
      id: collectorId,
      name: editingCollectorForm.name.trim(),
      phone: editingCollectorForm.phone.trim(),
      photoUrl: editingCollectorForm.photoUrl
    });
    setEditingCollectorId('');
    setEditingCollectorForm({ name: '', phone: '', photoUrl: '' });
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

  const handleResendVerificationEmail = async () => {
    if (!auth || !auth.user || !auth.user.token) {
      setResendMessage('Esta instalación no está conectada al servidor SaaS.');
      return;
    }

    setResendLoading(true);
    setResendMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenants/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.user.token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        setResendMessage(data.error || 'No se pudo reenviar el correo de verificación.');
      } else {
        setResendMessage('Correo de verificación reenviado. Revisa tu bandeja de entrada.');
      }
    } catch (error) {
      console.error('Resend verification email error', error);
      setResendMessage('Error de conexión al intentar reenviar el correo.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Ajustes</h2>

      {/* Subscription Status Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-sm font-medium text-blue-100">Tu Plan Actual</p>
            <h3 className="text-2xl font-bold">Plan Gratuito</h3>
            <p className="text-sm text-blue-200 mt-1">10 clientes • 5 préstamos • 1 usuario</p>
          </div>
          <button
            onClick={() => {
              // Navigate to pricing
              const event = new CustomEvent('navigate-to-tab', { detail: 'pricing' });
              window.dispatchEvent(event);
            }}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors shadow-lg"
          >
            Mejorar Plan
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Configuración del Sistema</h3>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Nombre de la Empresa</label>
            <input
              type="text"
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Nombre que se muestra en el encabezado</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.ownerDisplayName}
                onChange={(e) => setForm({ ...form, ownerDisplayName: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {form.companyLogo ? (
                  <img src={form.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Logo</span>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Cambiar Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCompanyLogoChange}
                  />
                </label>
                <p className="text-[11px] text-slate-500 mt-1">Se usará en el encabezado y en los recibos.</p>
              </div>
            </div>
          </div>

          {auth?.user?.tenantId && (
            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Correo de confirmación de cuenta SaaS</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Si no llegó el correo de activación de la cuenta, puedes reenviarlo al email del administrador.
              </p>
              {resendMessage && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2">{resendMessage}</p>
              )}
              <button
                type="button"
                data-verify-email
                onClick={handleResendVerificationEmail}
                disabled={resendLoading}
                className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 hover:bg-emerald-700 transition-colors"
              >
                {resendLoading ? 'Reenviando...' : 'Reenviar correo de confirmación'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Moneda Principal</label>
              <select
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.mainCurrency}
                onChange={(e) => setForm({ ...form, mainCurrency: e.target.value })}
              >
                <option value="DOP">Peso Dominicano (DOP)</option>
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Tasa de Mora por Defecto (%)</label>
              <input
                type="number"
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.defaultPenaltyRate}
                onChange={(e) => setForm({ ...form, defaultPenaltyRate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Apariencia</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'indigo', bg: 'bg-indigo-700', label: 'Índigo' },
                  { id: 'blue', bg: 'bg-blue-600', label: 'Azul' },
                  { id: 'emerald', bg: 'bg-emerald-500', label: 'Verde' },
                  { id: 'violet', bg: 'bg-violet-500', label: 'Violeta' },
                  { id: 'slate', bg: 'bg-slate-700', label: 'Gris Oscuro' },
                  { id: 'zinc', bg: 'bg-zinc-900', label: 'Negro' },
                ].map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    title={color.label}
                    onClick={() => {
                      const newSettings = { ...systemSettings, themeColor: color.id };
                      setSystemSettings(newSettings);
                      setForm({ ...form, themeColor: color.id });
                      // Persist to localStorage
                      localStorage.setItem('systemSettings', JSON.stringify(newSettings));
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.themeColor === color.id
                      ? 'border-slate-900 dark:border-slate-100 scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-blue-500'
                      : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                      } ${color.bg}`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">Colores corporativos oscuros: Gris Oscuro y Negro</p>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Usuarios de acceso (cobradores)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Crea usuarios con nombre de acceso y contraseña para que los cobradores entren al sistema.
            </p>
            {userError && (
              <p className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {userError}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Nombre completo</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Usuario</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="usuario.cobrador"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Contraseña</label>
                <input
                  type="password"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Usuario administrador</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.securityUser}
                  onChange={(e) => setForm({ ...form, securityUser: e.target.value })}
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Contraseña / PIN</label>
                <input
                  type="password"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Notificación GPS para Rutas</p>
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
              className={`w-11 h-6 flex items-center rounded-full px-1 transition-colors ${systemSettings.enableRouteGpsNotification ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${systemSettings.enableRouteGpsNotification ? 'translate-x-4' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Incluir cuotas futuras en Rutas</p>
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
              className={`w-11 h-6 flex items-center rounded-full px-1 transition-colors ${systemSettings.includeFutureInstallmentsInRoutes ? 'bg-blue-600' : 'bg-slate-300'
                }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${systemSettings.includeFutureInstallmentsInRoutes ? 'translate-x-4' : 'translate-x-0'
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
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Gestión de Cobradores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleAddCollector} className="space-y-3">
            <div className="flex justify-center mb-2">
              <div className="relative group cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                  {collectorForm.photoUrl ? (
                    <img src={collectorForm.photoUrl} alt="New" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl text-slate-400">+</span>
                  )}
                </div>
                <label className="absolute inset-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCollectorImageChange(e, false)}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Nombre del Cobrador</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={collectorForm.name}
                onChange={(e) => setCollectorForm({ ...collectorForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Teléfono</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={collectorForm.phone}
                onChange={(e) => setCollectorForm({ ...collectorForm, phone: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition"
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
                        <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="relative group w-12 h-12 flex-shrink-0">
                              <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center">
                                {editingCollectorForm.photoUrl ? (
                                  <img src={editingCollectorForm.photoUrl} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">Foto</span>
                                )}
                              </div>
                              <label className="absolute inset-0 cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleCollectorImageChange(e, true)}
                                />
                              </label>
                            </div>
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm"
                                value={editingCollectorForm.name}
                                onChange={(e) => setEditingCollectorForm({ ...editingCollectorForm, name: e.target.value })}
                                placeholder="Nombre"
                              />
                              <input
                                type="text"
                                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm"
                                value={editingCollectorForm.phone}
                                onChange={(e) => setEditingCollectorForm({ ...editingCollectorForm, phone: e.target.value })}
                                placeholder="Teléfono"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end text-xs pt-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateCollector(c.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold shadow-sm"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCollectorId('');
                                setEditingCollectorForm({ name: '', phone: '', photoUrl: '' });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center overflow-hidden border border-indigo-200 dark:border-indigo-500/30">
                              {c.photoUrl ? (
                                <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-indigo-500 dark:text-indigo-400 text-xs">{c.name.substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{c.name}</p>
                              <p className="text-xs text-slate-500">{c.phone}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => startEditCollector(c)}
                              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-semibold hover:bg-slate-200 dark:hover:bg-slate-600"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCollector(c.id)}
                              className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold hover:bg-red-100 dark:hover:bg-red-900/50"
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
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Asignación de Clientes a Cobradores</h3>
        <p className="text-xs text-slate-400 mb-4">
          Elige un cobrador para cada cliente. El cambio se guarda inmediatamente cuando seleccionas un cobrador.
        </p>
        {clients.length === 0 ? (
          <p className="text-sm text-slate-400">No hay clientes registrados.</p>
        ) : collectors.length === 0 ? (
          <p className="text-sm text-slate-400">Primero agrega al menos un cobrador para poder asignarlo.</p>
        ) : (
          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="p-2 text-left">Cliente</th>
                  <th className="p-2 text-left">Teléfono</th>
                  <th className="p-2 text-left">Dirección</th>
                  <th className="p-2 text-left">Cobrador asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-800/20">
                    <td className="p-2 font-medium text-slate-200">{client.name}</td>
                    <td className="p-2 text-slate-500">{client.phone || 'N/A'}</td>
                    <td className="p-2 text-slate-500 truncate max-w-[220px]">{client.address || 'N/A'}</td>
                    <td className="p-2">
                      <select
                        className="w-full p-2 border border-slate-700 rounded-lg bg-slate-900 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
    </div >
  );
}

export default SettingsView;
