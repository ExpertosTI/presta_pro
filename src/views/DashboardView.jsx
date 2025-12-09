import React from 'react';
import Card from '../components/Card';
import { formatCurrency } from '../utils/formatters';

export default function DashboardView({ loans, clients, activeTab }) {
    // Recalcular stats
    const totalLent = loans.reduce((acc, l) => acc + parseFloat(l.amount), 0);
    const totalCollected = loans.reduce((acc, l) => acc + l.totalPaid, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-600">
                    <p className="text-xs font-bold text-slate-400 uppercase">Cartera Total</p>
                    <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalLent)}</h3>
                </Card>
                <Card className="border-l-4 border-l-green-600">
                    <p className="text-xs font-bold text-slate-400 uppercase">Recaudado</p>
                    <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalCollected)}</h3>
                </Card>
                <Card className="border-l-4 border-l-orange-600">
                    <p className="text-xs font-bold text-slate-400 uppercase">Por Cobrar</p>
                    <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(totalLent * 1.2 - totalCollected)}</h3>
                </Card>
                <Card className="border-l-4 border-l-purple-600">
                    <p className="text-xs font-bold text-slate-400 uppercase">Clientes Activos</p>
                    <h3 className="text-2xl font-bold text-slate-800">{clients.length}</h3>
                </Card>
            </div>
            {/* Gráfico Simple Placeholder */}
            <Card className="h-64 flex items-center justify-center bg-slate-50 border-dashed">
                <p className="text-slate-400 font-medium">Gráfico de Rendimiento Financiero (Visual)</p>
            </Card>
        </div>
    );
}
