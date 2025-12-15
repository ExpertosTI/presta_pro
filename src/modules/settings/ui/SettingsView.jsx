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
    // NEW FIELDS
    dateFormat: systemSettings.dateFormat || 'DD/MM/YYYY',
    companyWhatsApp: systemSettings.companyWhatsApp || '',
    graceDays: systemSettings.graceDays ?? 0,
    enabledFrequencies: systemSettings.enabledFrequencies || { DAILY: true, WEEKLY: true, BIWEEKLY: true, MONTHLY: true },
    minLoanAmount: systemSettings.minLoanAmount ?? 1000,
    maxLoanAmount: systemSettings.maxLoanAmount ?? 500000,
    termsAndConditions: systemSettings.termsAndConditions || '',
    receiptFooter: systemSettings.receiptFooter || '',
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
      // Sync new fields
      dateFormat: systemSettings.dateFormat || prev.dateFormat,
      companyWhatsApp: systemSettings.companyWhatsApp || prev.companyWhatsApp,
      graceDays: systemSettings.graceDays ?? prev.graceDays,
      enabledFrequencies: systemSettings.enabledFrequencies || prev.enabledFrequencies,
      minLoanAmount: systemSettings.minLoanAmount ?? prev.minLoanAmount,
      maxLoanAmount: systemSettings.maxLoanAmount ?? prev.maxLoanAmount,
      termsAndConditions: systemSettings.termsAndConditions || prev.termsAndConditions,
      receiptFooter: systemSettings.receiptFooter || prev.receiptFooter,
    }));
  }, [systemSettings]);

  // MEJORA 14: Settings history
  const [settingsHistory, setSettingsHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  React.useEffect(() => {
    const saved = localStorage.getItem('settingsHistory');
    if (saved) setSettingsHistory(JSON.parse(saved));
  }, []);

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
      // New fields
      dateFormat: form.dateFormat,
      companyWhatsApp: form.companyWhatsApp,
      graceDays: parseInt(form.graceDays) || 0,
      enabledFrequencies: form.enabledFrequencies,
      minLoanAmount: parseFloat(form.minLoanAmount) || 1000,
      maxLoanAmount: parseFloat(form.maxLoanAmount) || 500000,
      termsAndConditions: form.termsAndConditions,
      receiptFooter: form.receiptFooter,
    };

    // MEJORA 14: Log history
    const historyEntry = { date: new Date().toISOString(), changedBy: auth?.user?.name || 'Admin' };
    const newHistory = [historyEntry, ...settingsHistory].slice(0, 20);
    setSettingsHistory(newHistory);
    localStorage.setItem('settingsHistory', JSON.stringify(newHistory));

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

  // MEJORA 15: Reset to defaults
  const handleResetToDefaults = () => {
    if (!window.confirm('¿Restaurar todos los ajustes a valores predeterminados?')) return;
    const defaults = {
      companyName: 'Presta Pro',
      mainCurrency: 'DOP',
      defaultPenaltyRate: 5,
      themeColor: 'indigo',
      securityUser: 'admin',
      securityPassword: '1234',
      ownerDisplayName: '',
      companyLogo: '',
      dateFormat: 'DD/MM/YYYY',
      companyWhatsApp: '',
      graceDays: 0,
      enabledFrequencies: { DAILY: true, WEEKLY: true, BIWEEKLY: true, MONTHLY: true },
      minLoanAmount: 1000,
      maxLoanAmount: 500000,
      termsAndConditions: '',
      receiptFooter: '',
      includeFutureInstallmentsInRoutes: true,
      enableRouteGpsNotification: true,
    };
    setForm(defaults);
    setSystemSettings(defaults);
    localStorage.setItem('systemSettings', JSON.stringify(defaults));
    if (showToast) showToast('Ajustes restaurados a valores predeterminados', 'success');
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

          {/* MEJORA 3: Date Format + MEJORA 5: WhatsApp + MEJORA 7: Grace Days */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg inline-block px-3">
              📅 Formato y Comunicación
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Formato de Fecha</label>
                <select
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={form.dateFormat}
                  onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">📱 WhatsApp Empresa</label>
                <input
                  type="tel"
                  placeholder="809-555-1234"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={form.companyWhatsApp}
                  onChange={(e) => setForm({ ...form, companyWhatsApp: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-1">Para mensajes automáticos</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Días de Gracia</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={form.graceDays}
                  onChange={(e) => setForm({ ...form, graceDays: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-1">Antes de aplicar mora</p>
              </div>
            </div>
          </div>

          {/* MEJORA 8: Frecuencias Habilitadas */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg inline-block px-3">
              🔄 Frecuencias de Pago Disponibles
            </h4>
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'DAILY', label: 'Diario' },
                { id: 'WEEKLY', label: 'Semanal' },
                { id: 'BIWEEKLY', label: 'Quincenal' },
                { id: 'MONTHLY', label: 'Mensual' }
              ].map(freq => (
                <label key={freq.id} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={form.enabledFrequencies?.[freq.id] ?? true}
                    onChange={(e) => setForm({ ...form, enabledFrequencies: { ...form.enabledFrequencies, [freq.id]: e.target.checked } })}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{freq.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">Solo las frecuencias activas estarán disponibles al crear préstamos</p>
          </div>

          {/* MEJORA 9: Límites de Préstamo */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg inline-block px-3">
              💰 Límites de Préstamo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Monto Mínimo ({form.mainCurrency})</label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={form.minLoanAmount}
                  onChange={(e) => setForm({ ...form, minLoanAmount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Monto Máximo ({form.mainCurrency})</label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={form.maxLoanAmount}
                  onChange={(e) => setForm({ ...form, maxLoanAmount: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* MEJORA 10: Términos y Condiciones + MEJORA 12: Footer de Recibos */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg inline-block px-3">
              📝 Textos Legales
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Términos y Condiciones</label>
                <textarea
                  rows={4}
                  placeholder="Ingrese los términos y condiciones que aparecerán en los contratos..."
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
                  value={form.termsAndConditions}
                  onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Footer de Recibos</label>
                <input
                  type="text"
                  placeholder="Texto que aparecerá al pie de cada recibo"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={form.receiptFooter}
                  onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-1">Ej: "Gracias por su pago" o información de contacto</p>
              </div>
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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <div className="flex gap-2">
              {/* MEJORA 15: Reset to defaults */}
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-4 py-2 border border-rose-300 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                🔄 Restaurar Defaults
              </button>
              {/* MEJORA 14: History button */}
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                📋 Historial ({settingsHistory.length})
              </button>
            </div>
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

      {/* MEJORA 14: Settings History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">📋 Historial de Cambios</h3>
            {settingsHistory.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Sin cambios registrados</p>
            ) : (
              <ul className="space-y-2">
                {settingsHistory.map((entry, i) => (
                  <li key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{new Date(entry.date).toLocaleString('es-DO')}</span>
                    <span className="text-slate-500 dark:text-slate-400">{entry.changedBy}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowHistory(false)}
              className="w-full mt-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div >
  );
}

export default SettingsView;
