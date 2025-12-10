import React from 'react';
import Card from '../shared/components/ui/Card';

const roleLabel = (role) => role || 'Empleado';

export function HRView({ employees, onNewEmployee, onEditEmployee }) {
  const list = employees || [];

  const countByRole = (roleName) => list.filter(e => (e.role || '').toLowerCase() === roleName.toLowerCase()).length;

  const total = list.length;
  const cobradores = countByRole('Cobrador');
  const secretarias = countByRole('Secretaria');
  const supervisores = countByRole('Supervisor');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Recursos Humanos</h2>
        <button
          type="button"
          onClick={onNewEmployee}
          className="text-xs md:text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          Nuevo Empleado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-semibold text-slate-500 mb-1">Empleados Totales</p>
          <p className="text-2xl font-bold text-slate-800">{total}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 mb-1">Cobradores</p>
          <p className="text-2xl font-bold text-slate-800">{cobradores}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 mb-1">Secretarias</p>
          <p className="text-2xl font-bold text-slate-800">{secretarias}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-slate-500 mb-1">Supervisores</p>
          <p className="text-2xl font-bold text-slate-800">{supervisores}</p>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold mb-4">Listado de Empleados</h3>
        {total === 0 ? (
          <p className="text-slate-400 text-sm">No hay empleados registrados.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {list.map(emp => (
              <li key={emp.id} className="py-2 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-400 dark:text-slate-500">
                        {emp.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{emp.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{emp.phone || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {roleLabel(emp.role)}
                  </span>
                  {onEditEmployee && (
                    <button
                      onClick={() => onEditEmployee(emp)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default HRView;
