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
  setActiveTab,
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
            onClick={() => setActiveTab && setActiveTab('pricing')}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors shadow-lg"
          >
            Mejorar Plan
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">Configuración del Sistema</h3>
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nombre de la Empresa</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Mi Financiera"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nombre en Encabezado</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
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

          {/* Future Route Toggle Section */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg inline-block px-3">
              🛣️ Opciones de Ruta
            </h4>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Incluir cuotas futuras en ruta</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cuando está activo, las cuotas que aún no vencen aparecerán en la ruta de cobro</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={systemSettings.includeFutureInstallmentsInRoutes ?? true}
                    onChange={(e) => {
                      const newSettings = { ...systemSettings, includeFutureInstallmentsInRoutes: e.target.checked };
                      setSystemSettings(newSettings);
                      localStorage.setItem('systemSettings', JSON.stringify(newSettings));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </div>
              </label>

              <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Notificaciones GPS en ruta</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Solicitar ubicación al iniciar y finalizar una ruta de cobro</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={systemSettings.enableRouteGpsNotification ?? true}
                    onChange={(e) => {
                      const newSettings = { ...systemSettings, enableRouteGpsNotification: e.target.checked };
                      setSystemSettings(newSettings);
                      localStorage.setItem('systemSettings', JSON.stringify(newSettings));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg inline-block px-3">
              Seguridad: Contraseña Maestra
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Usuario Maestro</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm"
                  value={form.securityUser}
                  onChange={(e) => setForm({ ...form, securityUser: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Contraseña Maestra actual</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm font-mono tracking-wider"
                  value={form.securityPassword}
                  onChange={(e) => setForm({ ...form, securityPassword: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1">
              <span className="text-amber-500">⚠️</span> Esta credencial permite eliminar registros sensibles.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 active:scale-95 transform"
            >
              Guardar Cambios Configuración
            </button>
          </div>
        </form>
      </Card>

      {/* Collectors management has been moved to the dedicated Cobradores module - Access via main menu "Cobradores" */}

      {/* Backup Section */}
      <Card className="mt-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">📦 Copia de Seguridad</h3>
        <p className="text-xs text-slate-400 mb-4">
          Exporta todos tus datos (clientes, préstamos, pagos) o restaura desde un archivo anterior.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Export Button */}
          <button
            type="button"
            onClick={() => {
              // Verify master password before export
              const inputPassword = window.prompt('Ingresa la contraseña maestra para exportar los datos:');
              if (!inputPassword) return;

              if (inputPassword !== (systemSettings.securityPassword || '1234')) {
                if (showToast) showToast('Contraseña incorrecta', 'error');
                return;
              }

              // Get all data from localStorage or context
              const backupData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                systemSettings,
                collectors,
                clients,
              };

              // Create blob and download
              const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `presta_pro_backup_${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);

              if (showToast) showToast('Backup exportado correctamente', 'success');
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            📥 Exportar Datos
          </button>

          {/* Restore Button */}
          <label className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer">
            📤 Restaurar Backup
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const backup = JSON.parse(event.target.result);

                    if (!backup.version || !backup.exportDate) {
                      if (showToast) showToast('Archivo de backup inválido', 'error');
                      return;
                    }

                    // Confirm before restoring
                    if (window.confirm(`¿Restaurar backup del ${new Date(backup.exportDate).toLocaleDateString('es-DO')}?\n\nEsto reemplazará tus datos actuales.`)) {
                      // Restore settings
                      if (backup.systemSettings) {
                        setSystemSettings(backup.systemSettings);
                        localStorage.setItem('systemSettings', JSON.stringify(backup.systemSettings));
                      }

                      // Note: collectors and clients would need to be restored via API or passed handler
                      if (showToast) showToast('Backup restaurado. Recarga la página para ver los cambios.', 'success');
                    }
                  } catch (err) {
                    console.error('Restore error:', err);
                    if (showToast) showToast('Error al leer el archivo de backup', 'error');
                  }
                };
                reader.readAsText(file);
                e.target.value = ''; // Reset file input
              }}
            />
          </label>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          💡 Tip: Guarda el archivo de backup en un lugar seguro (Google Drive, USB, etc.)
        </p>
      </Card>
    </div >
  );
}

export default SettingsView;
