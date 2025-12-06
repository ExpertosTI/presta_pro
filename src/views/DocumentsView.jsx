import React, { useState } from 'react';
import Card from '../components/Card.jsx';

const DocumentsView = ({ clients, loans = [], companyName = 'Presta Pro', selectedClientId, onSelectClient, clientDocuments, addClientDocument }) => {
  const hasClients = Array.isArray(clients) && clients.length > 0;
  const currentClient = hasClients
    ? clients.find((c) => c.id === selectedClientId) || clients[0]
    : null;

  const documentsForClient = currentClient && clientDocuments
    ? clientDocuments[currentClient.id] || []
    : [];

  const [uploadTitle, setUploadTitle] = useState('');
  const [templateType, setTemplateType] = useState('CONTRACT_SIMPLE');
  const [templateContent, setTemplateContent] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleChangeClient = (e) => {
    const id = e.target.value || null;
    onSelectClient && onSelectClient(id);
  };

  const handleUploadDocument = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !currentClient || !addClientDocument) {
      return;
    }
    try {
      const { fileToBase64 } = await import('../utils/imageUtils.js');
      const base64 = await fileToBase64(file);
      const title = uploadTitle.trim() || file.name;
      addClientDocument(currentClient.id, {
        type: 'UPLOAD',
        title,
        fileName: file.name,
        mimeType: file.type,
        dataUrl: base64,
      });
      setUploadTitle('');
    } catch (error) {
      console.error('Error uploading client document', error);
    } finally {
      e.target.value = '';
    }
  };

  const buildTemplateForType = (type, client) => {
    const name = client?.name || '__________________';
    switch (type) {
      case 'PAGARE_SIMPLE':
        return (
`PAGARÉ SIMPLE

Yo, ${name}, declaro que debo a __________________ la suma de ___________, que me comprometo a pagar en ___ cuotas.

Lugar y fecha: ____________________________

Firma de deudor: _________________________`
        );
      case 'CARTA_COBRO':
        return (
`CARTA DE COBRO

Estimado(a) ${name},

Le recordamos que posee cuotas pendientes de pago con nuestra financiera. Favor pasar por la oficina o contactar a su cobrador para regularizar.

Atentamente,
__________________`
        );
      case 'OTRO':
        return 'Escribe aquí el contenido del documento personalizado...';
      case 'CONTRACT_SIMPLE':
      default:
        return (
`CONTRATO DE PRÉSTAMO (SIMPLE)

Entre __________________ (PRESTAMISTA) y ${name} (PRESTATARIO) se acuerda el siguiente préstamo:
- Monto: ___________
- Plazo: ___________
- Tasa de interés: ___________

Ambas partes se obligan a cumplir las condiciones aquí descritas.

Firma PRESTAMISTA: ______________________
Firma PRESTATARIO: ______________________`
        );
    }
  };

  const handleChangeTemplateType = (e) => {
    const nextType = e.target.value;
    setTemplateType(nextType);
    setTemplateContent(buildTemplateForType(nextType, currentClient));
  };

  const handleGenerateTemplate = () => {
    if (!currentClient) return;
    setTemplateContent(buildTemplateForType(templateType, currentClient));
  };

  const handleSaveTemplateAsDocument = () => {
    if (!currentClient || !addClientDocument) return;
    if (!templateContent || !templateContent.trim()) return;
    const titleByType = {
      CONTRACT_SIMPLE: 'Contrato simple',
      PAGARE_SIMPLE: 'Pagaré simple',
      CARTA_COBRO: 'Carta de cobro',
      OTRO: 'Documento personalizado',
    };
    const title = titleByType[templateType] || 'Documento';
    addClientDocument(currentClient.id, {
      type: 'TEMPLATE',
      title,
      content: templateContent,
    });
  };

  const getLastLoanForClient = (clientId) => {
    if (!clientId || !Array.isArray(loans) || loans.length === 0) return null;
    const clientLoans = loans.filter((l) => l.clientId === clientId);
    if (clientLoans.length === 0) return null;
    return clientLoans
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || a.startDate || 0).getTime();
        const bDate = new Date(b.createdAt || b.startDate || 0).getTime();
        return bDate - aDate;
      })[0];
  };

  const handleGenerateTemplateWithAI = async () => {
    if (!currentClient) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert('Falta configurar la API de IA (VITE_GEMINI_API_KEY) para generar documentos automáticamente.');
      return;
    }

    setAiGenerating(true);
    try {
      const { generateClientDocument } = await import('../services/aiService');
      const lastLoan = getLastLoanForClient(currentClient.id);
      const effectiveCompanyName = companyName || 'Presta Pro';
      const generated = await generateClientDocument(templateType, currentClient, lastLoan, effectiveCompanyName, apiKey);
      if (generated && typeof generated === 'string') {
        setTemplateContent(generated.trim());
      }
    } catch (error) {
      console.error('Error generating document with AI', error);
      alert('No se pudo generar el documento con IA. Revisa la configuración de la API.');
    } finally {
      setAiGenerating(false);
    }
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
            {currentClient.idNumber && (
              <p className="text-xs text-slate-500">Cédula / ID: {currentClient.idNumber}</p>
            )}
            {currentClient.address && (
              <p className="text-xs text-slate-500">Dirección: {currentClient.address}</p>
            )}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Descripción del documento</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ej: Cédula frente, Cédula reverso, Pagaré firmado"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Archivo</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="w-full text-[11px]"
                  onChange={handleUploadDocument}
                />
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 text-xs">
              <p className="font-semibold text-slate-700">Generar documento de texto rápido</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de documento</label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={templateType}
                    onChange={handleChangeTemplateType}
                  >
                    <option value="CONTRACT_SIMPLE">Contrato simple</option>
                    <option value="PAGARE_SIMPLE">Pagaré simple</option>
                    <option value="CARTA_COBRO">Carta de cobro</option>
                    <option value="OTRO">Otro / personalizado</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Contenido</label>
                  <textarea
                    rows={4}
                    className="w-full p-2 border rounded-lg font-mono text-[11px]"
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    placeholder="Escribe o genera el contenido del documento..."
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleGenerateTemplate}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 font-semibold"
                >
                  Usar plantilla
                </button>
                <button
                  type="button"
                  onClick={handleGenerateTemplateWithAI}
                  disabled={aiGenerating}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold disabled:opacity-60"
                >
                  {aiGenerating ? 'Generando con IA...' : 'Generar con IA'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplateAsDocument}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold"
                >
                  Guardar como documento
                </button>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-600 space-y-2">
              {documentsForClient.length === 0 ? (
                <>
                  <p className="font-semibold">Aún no hay documentos guardados para este cliente.</p>
                  <p className="text-xs text-slate-500">
                    Cuando generes un contrato desde la pantalla de Préstamos podrás guardarlo aquí.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Documentos guardados:</p>
                  <ul className="space-y-1 text-xs">
                    {documentsForClient.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2"
                      >
                        <div>
                          <p className="font-semibold text-slate-700 text-xs">
                            {doc.title || doc.type || 'Documento'}
                          </p>
                          {doc.createdAt && (
                            <p className="text-[11px] text-slate-500">
                              {new Date(doc.createdAt).toLocaleString('es-DO')}
                            </p>
                          )}
                          {doc.dataUrl && (doc.mimeType ? doc.mimeType.startsWith('image/') : doc.dataUrl.startsWith('data:image')) && (
                            <img
                              src={doc.dataUrl}
                              alt={doc.title || 'Documento'}
                              className="mt-1 w-16 h-16 object-cover rounded border border-slate-200"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (doc.dataUrl) {
                              const a = document.createElement('a');
                              a.href = doc.dataUrl;
                              a.download = `${(doc.fileName || doc.title || 'documento').replace(/\s+/g, '_')}`;
                              a.click();
                            } else {
                              const blob = new Blob([doc.content || ''], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${(doc.title || 'documento').replace(/\s+/g, '_')}.txt`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }
                          }}
                          className="text-xs bg-slate-900 text-white px-2 py-1 rounded-md font-semibold"
                        >
                          Descargar
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default DocumentsView;
