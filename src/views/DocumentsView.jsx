import React from 'react';
import Card from '../components/Card.jsx';

const DocumentsView = ({ clients, selectedClientId, onSelectClient }) => {
  const hasClients = Array.isArray(clients) && clients.length > 0;
  const currentClient = hasClients
    ? clients.find((c) => c.id === selectedClientId) || clients[0]
    : null;

  const handleChangeClient = (e) => {
    const id = e.target.value || null;
    onSelectClient && onSelectClient(id);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Documentos</h2>
        {hasClients && (
          <select
            className="p-2 border rounded-lg bg-white text-sm"
            value={currentClient?.id || ''}
            onChange={handleChangeClient}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!hasClients && (
        <Card>
          <p className="text-sm text-slate-600">
            No hay clientes registrados todavía. Crea al menos un cliente para poder
            asociar contratos, pagarés u otros documentos.
          </p>
        </Card>
      )}

      {hasClients && currentClient && (
        <>
          <Card>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Documentos del cliente
            </h3>
            <p className="text-sm text-slate-700 font-semibold mb-1">{currentClient.name}</p>
            {currentClient.cedula && (
              <p className="text-xs text-slate-500">Cédula: {currentClient.cedula}</p>
            )}
            {currentClient.address && (
              <p className="text-xs text-slate-500">Dirección: {currentClient.address}</p>
            )}
            <div className="mt-4 text-sm text-slate-600 space-y-1">
              <p className="font-semibold">Carpeta de documentos (placeholder):</p>
              <ul className="list-disc list-inside text-xs text-slate-500">
                <li>Contrato de préstamo (PDF)</li>
                <li>Copias de cédula / ID</li>
                <li>Pagarés firmados</li>
              </ul>
              <p className="text-xs text-slate-400 mt-2">
                Esta sección es visual. En una siguiente etapa podemos conectar con
                almacenamiento real (servidor de archivos, S3, etc.) y subir/descargar
                documentos por cliente.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default DocumentsView;
