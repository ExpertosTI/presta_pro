import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../../shared/components/ui/Card';
import {
  Calculator, Download, Share2, Calendar, DollarSign,
  TrendingUp, Percent, Clock, Zap
} from 'lucide-react';
import { calculateSchedule, calculateInstallmentVal, calculateRateFromInstallment } from '../../../shared/utils/amortization';
import {
  calculateOpenLoanSchedule,
  calculatePeriodInterest,
  getPeriodRatePercent,
  OPEN_LOAN_FREQUENCIES,
  previewRetrospectiveLoan
} from '../../../shared/utils/openLoanInterest';
import { toDateInputValue } from '../../../shared/utils/dateUtils';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { printHtmlContent } from '../../../shared/utils/printUtils';
import { WhatsAppIcon } from '../../../shared/components/ui/WhatsAppIcon';

// MEJORA 6: Product presets
const PRESETS = [
  { name: 'Corto Plazo', loanMode: 'FIXED', amount: 5000, rate: 15, term: 4, frequency: 'Semanal', amortizationType: 'FLAT', icon: Zap },
  { name: 'Personal', loanMode: 'FIXED', amount: 20000, rate: 10, term: 12, frequency: 'Mensual', amortizationType: 'FLAT', icon: DollarSign },
  { name: 'Largo Plazo', loanMode: 'FIXED', amount: 50000, rate: 8, term: 24, frequency: 'Mensual', amortizationType: 'FRENCH', icon: TrendingUp },
  { name: 'Micro Diario', loanMode: 'FIXED', amount: 3000, rate: 20, term: 30, frequency: 'Diario', amortizationType: 'FLAT', icon: Clock },
  { name: 'Abierto Mensual', loanMode: 'OPEN', amount: 25000, rate: 24, term: 12, frequency: 'Mensual', periodRate: '', icon: Percent },
  { name: 'Abierto Semanal', loanMode: 'OPEN', amount: 10000, rate: 36, term: 16, frequency: 'Semanal', periodRate: '', icon: Clock }
];

export function CalculatorView() {
  const [simData, setSimData] = useState({
    loanMode: 'FIXED',
    amount: 10000,
    rate: 10,
    term: 12,
    frequency: 'Mensual',
    startDate: new Date().toISOString().split('T')[0],
    amortizationType: 'FLAT',
    closingCosts: 0,
    periodRate: '',
    installment: '916.67'
  });

  const isOpenMode = simData.loanMode === 'OPEN';

  const retrospectivePreview = useMemo(() => {
    if (!isOpenMode) return null;
    return previewRetrospectiveLoan({
      loanType: 'OPEN',
      amount: simData.amount,
      closingCosts: simData.closingCosts,
      rate: simData.rate,
      frequency: simData.frequency,
      dailyRate: simData.periodRate,
      startDate: simData.startDate
    });
  }, [isOpenMode, simData]);

  const handleSimDataChange = (fields) => {
    setSimData(prev => {
      let updated = { ...prev, ...fields };
      if (updated.loanMode === 'OPEN') return updated;

      const totalAmount = (parseFloat(updated.amount) || 0) + (parseFloat(updated.closingCosts) || 0);
      if (fields.hasOwnProperty('installment')) {
        const rateVal = calculateRateFromInstallment(totalAmount, fields.installment, updated.term, updated.frequency, updated.amortizationType);
        updated.rate = rateVal;
      } else {
        const instVal = calculateInstallmentVal(totalAmount, updated.rate, updated.term, updated.frequency, updated.amortizationType);
        updated.installment = instVal;
      }
      return updated;
    });
  };

  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    if (!simData.amount || !simData.rate || !simData.term) {
      setSchedule([]);
      return;
    }

    const totalAmount = parseFloat(simData.amount) + parseFloat(simData.closingCosts || 0);
    const customPeriodRate = simData.periodRate ? parseFloat(simData.periodRate) : null;

    if (simData.loanMode === 'OPEN') {
      setSchedule(calculateOpenLoanSchedule(
        totalAmount,
        simData.rate,
        simData.frequency,
        simData.term,
        simData.startDate,
        customPeriodRate
      ));
      return;
    }

    setSchedule(
      calculateSchedule(
        totalAmount,
        simData.rate,
        simData.term,
        simData.frequency,
        simData.startDate,
        simData.amortizationType
      ),
    );
  }, [simData]);

  // MEJORA 4: Summary calculations
  const summary = useMemo(() => {
    if (schedule.length === 0) return null;

    const totalInterest = schedule.reduce((a, b) => a + (b.interest || 0), 0);
    const totalPrincipal = schedule.reduce((a, b) => a + (b.principal || 0), 0);
    const totalPayment = schedule.reduce((a, b) => a + (b.payment || 0), 0);
    const baseAmount = parseFloat(simData.amount) || 0;
    const closingCosts = parseFloat(simData.closingCosts) || 0;
    const financedAmount = baseAmount + closingCosts;
    const costOfCredit = totalInterest + closingCosts;
    const effectiveRate = baseAmount > 0 ? ((costOfCredit / baseAmount) * 100).toFixed(2) : 0;
    const periodInterest = isOpenMode
      ? calculatePeriodInterest(
        financedAmount,
        simData.rate,
        simData.frequency,
        simData.periodRate ? parseFloat(simData.periodRate) : null
      )
      : (simData.amortizationType === 'INTEREST_ONLY' ? (schedule[0]?.interest || 0) : (schedule[0]?.payment || 0));

    return {
      monthlyPayment: schedule[0]?.payment || 0,
      periodInterest,
      totalInterest,
      totalPrincipal,
      totalPayment,
      costOfCredit,
      effectiveRate,
      closingCosts,
      baseAmount,
      financedAmount,
      capitalUnchanged: isOpenMode || simData.amortizationType === 'INTEREST_ONLY'
    };
  }, [schedule, simData.amount, simData.closingCosts, simData.loanMode, simData.amortizationType, simData.rate, simData.frequency, simData.periodRate, isOpenMode]);

  // MEJORA 9: Chart data for amortization visualization
  const chartData = useMemo(() => {
    if (schedule.length === 0) return [];
    return schedule.map(item => ({
      number: item.number,
      principal: item.principal || 0,
      interest: item.interest || 0,
      balance: item.balance || 0
    }));
  }, [schedule]);

  // MEJORA 6: Apply preset
  const applyPreset = (preset) => {
    const totalAmount = parseFloat(preset.amount) || 0;
    const loanMode = preset.loanMode || 'FIXED';
    const inst = loanMode === 'OPEN'
      ? calculatePeriodInterest(totalAmount, preset.rate, preset.frequency, preset.periodRate ? parseFloat(preset.periodRate) : null).toFixed(2)
      : calculateInstallmentVal(totalAmount, preset.rate, preset.term, preset.frequency, preset.amortizationType || simData.amortizationType);
    setSimData({
      ...simData,
      loanMode,
      amount: preset.amount,
      rate: preset.rate,
      term: preset.term,
      frequency: preset.frequency,
      amortizationType: preset.amortizationType || simData.amortizationType,
      periodRate: preset.periodRate || '',
      installment: inst
    });
  };

  const amortizationTypeLabel = (type) => {
    if (type === 'FLAT') return 'Saldo Absoluto';
    if (type === 'FRENCH') return 'Saldo Insoluto';
    if (type === 'INTEREST_ONLY') return 'Solo Interés';
    return type;
  };

  const getModeDescription = () => {
    if (isOpenMode) {
      return `Préstamo abierto • Interés ${simData.frequency.toLowerCase()} • Capital intacto`;
    }
    return `${amortizationTypeLabel(simData.amortizationType)} • ${simData.term} cuotas ${simData.frequency.toLowerCase()}`;
  };

  // MEJORA 7: Export to PDF
  const exportToPDF = () => {
    if (schedule.length === 0 || !summary) return;

    const rows = schedule.map(item => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${item.number}</td>
        <td style="padding:8px;border:1px solid #ddd">${formatDate(item.date)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(item.payment)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(item.interest)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(item.principal)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(item.balance)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto">
        <h1 style="color:#1e293b;border-bottom:2px solid #3b82f6;padding-bottom:10px">Simulación de Préstamo</h1>
        
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:20px 0">
          <div style="background:#f0fdf4;padding:15px;border-radius:8px;border:1px solid #86efac">
            <p style="margin:0;font-size:12px;color:#166534">Monto a Prestar</p>
            <p style="margin:5px 0 0;font-size:20px;font-weight:bold;color:#166534">${formatCurrency(summary.baseAmount)}</p>
          </div>
          <div style="background:#eff6ff;padding:15px;border-radius:8px;border:1px solid #93c5fd">
            <p style="margin:0;font-size:12px;color:#1e40af">${isOpenMode ? `Interés ${simData.frequency}` : `Cuota ${simData.frequency}`}</p>
            <p style="margin:5px 0 0;font-size:20px;font-weight:bold;color:#1e40af">${formatCurrency(isOpenMode ? summary.periodInterest : summary.monthlyPayment)}</p>
          </div>
          <div style="background:#fef3c7;padding:15px;border-radius:8px;border:1px solid #fcd34d">
            <p style="margin:0;font-size:12px;color:#92400e">${isOpenMode || simData.amortizationType === 'INTEREST_ONLY' ? 'Total Interés Simulado' : 'Total a Pagar'}</p>
            <p style="margin:5px 0 0;font-size:20px;font-weight:bold;color:#92400e">${formatCurrency(isOpenMode || simData.amortizationType === 'INTEREST_ONLY' ? summary.totalInterest : summary.totalPayment)}</p>
          </div>
        </div>
        
        <p style="margin:10px 0;font-size:14px;color:#64748b">
          <strong>Modo:</strong> ${getModeDescription()} | 
          <strong>Tasa:</strong> ${simData.rate}%${isOpenMode ? ` (${getPeriodRatePercent(simData.rate, simData.frequency, simData.periodRate ? parseFloat(simData.periodRate) : null).toFixed(4)}% por período)` : ''}
        </p>
        
        <h2 style="color:#1e293b;margin-top:30px">${isOpenMode ? 'Proyección de Intereses (capital intacto)' : 'Tabla de Amortización'}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:8px;border:1px solid #ddd;text-align:left">#</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Fecha</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Cuota</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Interés</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Capital</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#f8fafc;font-weight:bold">
              <td colspan="2" style="padding:8px;border:1px solid #ddd">TOTALES</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatCurrency(summary.totalPayment)}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#dc2626">${formatCurrency(summary.totalInterest)}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#16a34a">${formatCurrency(summary.totalPrincipal)}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right">-</td>
            </tr>
          </tbody>
        </table>
        
        <p style="margin-top:30px;font-size:10px;color:#94a3b8;text-align:center">
          Generado el ${new Date().toLocaleDateString('es-DO')} | Presta Pro
        </p>
      </div>
    `;

    printHtmlContent('Simulación de Préstamo', html);
  };

  // MEJORA 11: Share via WhatsApp
  const shareWhatsApp = () => {
    if (!summary) return;

    const message = `📊 *Simulación de Préstamo*

💰 Monto: ${formatCurrency(summary.baseAmount)}
📅 ${isOpenMode ? `Períodos: ${simData.term} (${simData.frequency.toLowerCase()})` : `Plazo: ${simData.term} cuotas ${simData.frequency.toLowerCase()}`}
📈 Tasa: ${simData.rate}%
🏦 ${getModeDescription()}

💵 *${isOpenMode ? `Interés ${simData.frequency}` : `Cuota ${simData.frequency}`}:* ${formatCurrency(isOpenMode ? summary.periodInterest : summary.monthlyPayment)}
💰 *${isOpenMode || simData.amortizationType === 'INTEREST_ONLY' ? 'Total interés simulado' : 'Total a pagar'}:* ${formatCurrency(isOpenMode || simData.amortizationType === 'INTEREST_ONLY' ? summary.totalInterest : summary.totalPayment)}
📉 *Costo del Crédito:* ${formatCurrency(summary.costOfCredit)}
${summary.capitalUnchanged ? '🔒 Capital se mantiene intacto con abonos solo a interés' : ''}

_Simulación generada con Presta Pro_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Calculate max values for chart
  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map(d => d.principal + d.interest)) || 100;
  }, [chartData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-blue-600" />
          Calculadora de Préstamos
        </h2>
        <div className="flex gap-2">
          {/* MEJORA 7: Export PDF */}
          <button
            onClick={exportToPDF}
            disabled={schedule.length === 0}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-500 disabled:opacity-50"
          >
            <Download size={16} /> PDF
          </button>
          {/* MEJORA 11: Share WhatsApp */}
          <button
            onClick={shareWhatsApp}
            disabled={!summary}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-green-500 disabled:opacity-50"
          >
            <WhatsAppIcon size={16} /> Compartir
          </button>
        </div>
      </div>

      {/* MEJORA 6: Product Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(preset => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-300 transition-colors"
          >
            <preset.icon size={14} className="text-blue-500" />
            {preset.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Calculator size={20} /> Parámetros
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Modo de préstamo</label>
                <select
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.loanMode}
                  onChange={e => handleSimDataChange({ loanMode: e.target.value })}
                >
                  <option value="FIXED">Cuotas fijas</option>
                  <option value="OPEN">Abierto (solo interés / capital intacto)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Monto a Prestar</label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.amount}
                  onChange={e => handleSimDataChange({ amount: e.target.value })}
                />
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatCurrency(simData.amount || 0)}
                </p>
              </div>

              {/* MEJORA 3: Closing costs */}
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Gastos de Cierre</label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.closingCosts}
                  onChange={e => handleSimDataChange({ closingCosts: e.target.value })}
                  placeholder="0"
                />
                {simData.closingCosts > 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Total a financiar: {formatCurrency(parseFloat(simData.amount || 0) + parseFloat(simData.closingCosts || 0))}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">{isOpenMode ? 'Períodos a simular' : 'Plazo'}</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={simData.term}
                    onChange={e => handleSimDataChange({ term: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Frecuencia</label>
                  <select
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={simData.frequency}
                    onChange={e => handleSimDataChange({ frequency: e.target.value })}
                  >
                    {(isOpenMode ? OPEN_LOAN_FREQUENCIES : ['Diario', 'Semanal', 'Quincenal', 'Mensual']).map(freq => (
                      <option key={freq}>{freq}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!isOpenMode ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={simData.amortizationType}
                    onChange={e => handleSimDataChange({ amortizationType: e.target.value })}
                  >
                    <option value="FLAT">Saldo Absoluto</option>
                    <option value="FRENCH">Saldo Insoluto</option>
                    <option value="INTEREST_ONLY">Solo Interés (capital intacto)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Valor de la Cuota</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-900/50 text-blue-600 dark:text-blue-400 font-bold"
                    value={simData.installment}
                    onChange={e => handleSimDataChange({ installment: e.target.value })}
                  />
                </div>
              </div>
              ) : (
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Tasa por período % (opcional)</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.periodRate}
                  onChange={e => handleSimDataChange({ periodRate: e.target.value })}
                  placeholder="Auto desde tasa anual"
                />
                {summary && (
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    Interés {simData.frequency.toLowerCase()}: {formatCurrency(summary.periodInterest)} • Capital intacto: {formatCurrency(summary.financedAmount)}
                  </p>
                )}
              </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Tasa %</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.rate}
                  onChange={e => handleSimDataChange({ rate: e.target.value })}
                />
              </div>

              {/* MEJORA 2: Start date */}
              <div>
                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar size={14} /> Fecha Inicio
                  <span className="text-slate-400 font-normal text-xs">(retroactiva permitida)</span>
                </label>
                <input
                  type="date"
                  max={toDateInputValue(new Date())}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.startDate}
                  onChange={e => setSimData({ ...simData, startDate: e.target.value })}
                />
                {retrospectivePreview?.isRetrospective && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    Interés devengado hasta hoy: {formatCurrency(retrospectivePreview.pendingInterest)} ({retrospectivePreview.daysSinceStart} días)
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* MEJORA 4: Summary Cards */}
          {summary && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
              <h3 className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-3 uppercase tracking-wider">Resumen</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700 dark:text-blue-400">
                    {isOpenMode ? `Interés ${simData.frequency}` : simData.amortizationType === 'INTEREST_ONLY' ? `Cuota interés ${simData.frequency}` : `Cuota ${simData.frequency}`}:
                  </span>
                  <span className="font-bold text-lg text-blue-900 dark:text-blue-200">
                    {formatCurrency(isOpenMode || simData.amortizationType === 'INTEREST_ONLY' ? summary.periodInterest : summary.monthlyPayment)}
                  </span>
                </div>
                {summary.capitalUnchanged && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Capital (sin cambio):</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.financedAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Interés:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(summary.totalInterest)}</span>
                </div>
                {summary.closingCosts > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Gastos Cierre:</span>
                    <span className="font-semibold text-amber-600">{formatCurrency(summary.closingCosts)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Costo del Crédito:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(summary.costOfCredit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Tasa Efectiva:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{summary.effectiveRate}%</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                  <div className="flex justify-between">
                    <span className="font-bold text-blue-800 dark:text-blue-300">
                      {isOpenMode || simData.amortizationType === 'INTEREST_ONLY' ? 'TOTAL INTERÉS SIMULADO:' : 'TOTAL A PAGAR:'}
                    </span>
                    <span className="font-black text-xl text-blue-900 dark:text-blue-200">
                      {formatCurrency(isOpenMode || simData.amortizationType === 'INTEREST_ONLY' ? summary.totalInterest : summary.totalPayment)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Table and Chart Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* MEJORA 9: Amortization Chart */}
          {chartData.length > 0 && (
            <Card>
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">Distribución Capital vs Interés</h3>
              <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
                {chartData.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-[20px] flex-1">
                    <div className="w-full flex flex-col-reverse" style={{ height: '100px' }}>
                      <div
                        className="bg-emerald-500 rounded-t-sm"
                        style={{ height: `${(item.principal / maxChartValue) * 100}%` }}
                        title={`Capital: ${formatCurrency(item.principal)}`}
                      />
                      <div
                        className="bg-rose-500 rounded-t-sm"
                        style={{ height: `${(item.interest / maxChartValue) * 100}%` }}
                        title={`Interés: ${formatCurrency(item.interest)}`}
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1">{item.number}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                  <span className="text-slate-600 dark:text-slate-400">Capital</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-rose-500 rounded-sm" />
                  <span className="text-slate-600 dark:text-slate-400">Interés</span>
                </div>
              </div>
            </Card>
          )}

          {/* Amortization Table */}
          <Card className="overflow-hidden flex flex-col">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100">
              {isOpenMode ? 'Proyección de intereses (capital intacto)' : 'Tabla de Amortización'}
            </h3>
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Fecha</th>
                    <th className="p-2 text-right">Cuota</th>
                    <th className="p-2 text-right">Interés</th>
                    <th className="p-2 text-right">Capital</th>
                    <th className="p-2 text-right">{isOpenMode ? 'Acumulado' : 'Saldo'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {schedule.map(item => (
                    <tr key={item.number} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2 font-bold text-slate-500 dark:text-slate-400">{item.number}</td>
                      <td className="p-2 text-slate-800 dark:text-slate-200">{formatDate(item.date)}</td>
                      <td className="p-2 text-right font-bold text-slate-800 dark:text-slate-200">{formatCurrency(item.payment)}</td>
                      <td className="p-2 text-right text-rose-500 dark:text-rose-400">{formatCurrency(item.interest)}</td>
                      <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(item.principal)}</td>
                      <td className="p-2 text-right text-slate-500 dark:text-slate-400">
                        {formatCurrency(isOpenMode ? (item.cumulativeInterest ?? item.balance) : item.balance)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  {summary && (
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                      <td colSpan={2} className="p-2 text-slate-700 dark:text-slate-300">TOTALES</td>
                      <td className="p-2 text-right text-slate-800 dark:text-slate-200">{formatCurrency(summary.totalPayment)}</td>
                      <td className="p-2 text-right text-rose-600 dark:text-rose-400">{formatCurrency(summary.totalInterest)}</td>
                      <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.totalPrincipal)}</td>
                      <td className="p-2 text-right text-slate-500">-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CalculatorView;
