import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../../shared/components/ui/Card';
import {
  Calculator, Download, Share2, Calendar, DollarSign,
  TrendingUp, Percent, Clock, Zap
} from 'lucide-react';
import { calculateSchedule } from '../../../shared/utils/amortization';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { printHtmlContent } from '../../../shared/utils/printUtils';

// WhatsApp icon
const WhatsAppIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// MEJORA 6: Product presets
const PRESETS = [
  { name: 'Corto Plazo', amount: 5000, rate: 15, term: 4, frequency: 'Semanal', icon: Zap },
  { name: 'Personal', amount: 20000, rate: 10, term: 12, frequency: 'Mensual', icon: DollarSign },
  { name: 'Largo Plazo', amount: 50000, rate: 8, term: 24, frequency: 'Mensual', icon: TrendingUp },
  { name: 'Micro Diario', amount: 3000, rate: 20, term: 30, frequency: 'Diario', icon: Clock }
];

export function CalculatorView() {
  const [simData, setSimData] = useState({
    amount: 10000,
    rate: 10,
    term: 12,
    frequency: 'Mensual',
    // MEJORA 2: Start date
    startDate: new Date().toISOString().split('T')[0],
    // MEJORA 1: Amortization type
    amortizationType: 'FLAT',
    // MEJORA 3: Closing costs
    closingCosts: 0
  });
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    if (simData.amount && simData.rate && simData.term) {
      // Include closing costs in the calculation
      const totalAmount = parseFloat(simData.amount) + parseFloat(simData.closingCosts || 0);
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
    }
  }, [simData]);

  // MEJORA 4: Summary calculations
  const summary = useMemo(() => {
    if (schedule.length === 0) return null;

    const totalInterest = schedule.reduce((a, b) => a + (b.interest || 0), 0);
    const totalPrincipal = schedule.reduce((a, b) => a + (b.principal || 0), 0);
    const totalPayment = schedule.reduce((a, b) => a + (b.payment || 0), 0);
    const baseAmount = parseFloat(simData.amount) || 0;
    const closingCosts = parseFloat(simData.closingCosts) || 0;
    const costOfCredit = totalInterest + closingCosts;
    const effectiveRate = baseAmount > 0 ? ((costOfCredit / baseAmount) * 100).toFixed(2) : 0;

    return {
      monthlyPayment: schedule[0]?.payment || 0,
      totalInterest,
      totalPrincipal,
      totalPayment,
      costOfCredit,
      effectiveRate,
      closingCosts,
      baseAmount
    };
  }, [schedule, simData.amount, simData.closingCosts]);

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
    setSimData({
      ...simData,
      amount: preset.amount,
      rate: preset.rate,
      term: preset.term,
      frequency: preset.frequency
    });
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
            <p style="margin:0;font-size:12px;color:#1e40af">Cuota ${simData.frequency}</p>
            <p style="margin:5px 0 0;font-size:20px;font-weight:bold;color:#1e40af">${formatCurrency(summary.monthlyPayment)}</p>
          </div>
          <div style="background:#fef3c7;padding:15px;border-radius:8px;border:1px solid #fcd34d">
            <p style="margin:0;font-size:12px;color:#92400e">Total a Pagar</p>
            <p style="margin:5px 0 0;font-size:20px;font-weight:bold;color:#92400e">${formatCurrency(summary.totalPayment)}</p>
          </div>
        </div>
        
        <p style="margin:10px 0;font-size:14px;color:#64748b">
          <strong>Tipo:</strong> ${simData.amortizationType === 'FLAT' ? 'Saldo Absoluto' : 'Saldo Insoluto'} | 
          <strong>Tasa:</strong> ${simData.rate}% | 
          <strong>Plazo:</strong> ${simData.term} cuotas ${simData.frequency.toLowerCase()}
        </p>
        
        <h2 style="color:#1e293b;margin-top:30px">Tabla de Amortización</h2>
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
📅 Plazo: ${simData.term} cuotas ${simData.frequency.toLowerCase()}
📈 Tasa: ${simData.rate}%
🏦 Tipo: ${simData.amortizationType === 'FLAT' ? 'Saldo Absoluto' : 'Saldo Insoluto'}

💵 *Cuota ${simData.frequency}:* ${formatCurrency(summary.monthlyPayment)}
💰 *Total a Pagar:* ${formatCurrency(summary.totalPayment)}
📉 *Costo del Crédito:* ${formatCurrency(summary.costOfCredit)}

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
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Monto a Prestar</label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.amount}
                  onChange={e => setSimData({ ...simData, amount: e.target.value })}
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
                  onChange={e => setSimData({ ...simData, closingCosts: e.target.value })}
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
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Tasa %</label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={simData.rate}
                    onChange={e => setSimData({ ...simData, rate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Plazo</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={simData.term}
                    onChange={e => setSimData({ ...simData, term: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Frecuencia</label>
                  <select
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={simData.frequency}
                    onChange={e => setSimData({ ...simData, frequency: e.target.value })}
                  >
                    <option>Diario</option>
                    <option>Semanal</option>
                    <option>Quincenal</option>
                    <option>Mensual</option>
                  </select>
                </div>
                {/* MEJORA 1: Amortization type */}
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                    value={simData.amortizationType}
                    onChange={e => setSimData({ ...simData, amortizationType: e.target.value })}
                  >
                    <option value="FLAT">Saldo Absoluto</option>
                    <option value="FRENCH">Saldo Insoluto</option>
                  </select>
                </div>
              </div>

              {/* MEJORA 2: Start date */}
              <div>
                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar size={14} /> Fecha Inicio
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={simData.startDate}
                  onChange={e => setSimData({ ...simData, startDate: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* MEJORA 4: Summary Cards */}
          {summary && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
              <h3 className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-3 uppercase tracking-wider">Resumen</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700 dark:text-blue-400">Cuota {simData.frequency}:</span>
                  <span className="font-bold text-lg text-blue-900 dark:text-blue-200">{formatCurrency(summary.monthlyPayment)}</span>
                </div>
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
                    <span className="font-bold text-blue-800 dark:text-blue-300">TOTAL A PAGAR:</span>
                    <span className="font-black text-xl text-blue-900 dark:text-blue-200">{formatCurrency(summary.totalPayment)}</span>
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
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100">Tabla de Amortización</h3>
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Fecha</th>
                    <th className="p-2 text-right">Cuota</th>
                    <th className="p-2 text-right">Interés</th>
                    <th className="p-2 text-right">Capital</th>
                    <th className="p-2 text-right">Saldo</th>
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
                      <td className="p-2 text-right text-slate-500 dark:text-slate-400">{formatCurrency(item.balance)}</td>
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
