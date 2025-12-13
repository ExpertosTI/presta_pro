import React, { useState, useEffect } from 'react';
import Card from '../../../shared/components/ui/Card';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { printHtmlContent } from '../../../shared/utils/printUtils';
import { FileText, Trash2 } from 'lucide-react';
import documentService from '../services/documentService';

const DocumentsView = ({ clients, loans = [], companyName = 'Presta Pro', selectedClientId, onSelectClient, showToast }) => {
  const hasClients = Array.isArray(clients) && clients.length > 0;
  const currentClient = hasClients
    ? clients.find((c) => c.id === selectedClientId) || clients[0]
    : null;

  // State for documents loaded from API
  const [documentsForClient, setDocumentsForClient] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [uploadTitle, setUploadTitle] = useState('');
  const [templateType, setTemplateType] = useState('CONTRACT_SIMPLE');
  const [templateContent, setTemplateContent] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);

  // Load documents when client changes
  useEffect(() => {
    if (currentClient?.id) {
      loadDocuments(currentClient.id);
    } else {
      setDocumentsForClient([]);
    }
  }, [currentClient?.id]);

  const loadDocuments = async (clientId) => {
    setLoadingDocs(true);
    try {
      const docs = await documentService.getClientDocuments(clientId);
      setDocumentsForClient(Array.isArray(docs) ? docs : []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocumentsForClient([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await documentService.deleteDocument(docId);
      setDocumentsForClient(prev => prev.filter(d => d.id !== docId));
      showToast?.('Documento eliminado', 'success');
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast?.('Error al eliminar documento', 'error');
    }
    setDocToDelete(null);
  };

  const handleChangeClient = (e) => {
    const id = e.target.value || null;
    onSelectClient && onSelectClient(id);
  };

  const handleUploadDocument = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !currentClient) {
      return;
    }
    setIsUploading(true);
    try {
      const { fileToBase64 } = await import('../../../shared/utils/imageUtils.js');
      const base64 = await fileToBase64(file);
      const title = uploadTitle.trim() || file.name;

      const newDoc = await documentService.addDocument(currentClient.id, {
        type: 'UPLOAD',
        title,
        fileName: file.name,
        mimeType: file.type,
        dataUrl: base64,
      });

      setDocumentsForClient(prev => [newDoc, ...prev]);
      setUploadTitle('');
      showToast?.('Documento subido exitosamente', 'success');
    } catch (error) {
      console.error('Error uploading client document', error);
      showToast?.('Error al subir documento', 'error');
    } finally {
      setIsUploading(false);
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

  const handleSaveTemplateAsDocument = async () => {
    if (!currentClient) return;
    if (!templateContent || !templateContent.trim()) return;
    const titleByType = {
      CONTRACT_SIMPLE: 'Contrato simple',
      PAGARE_SIMPLE: 'Pagaré simple',
      CARTA_COBRO: 'Carta de cobro',
      OTRO: 'Documento personalizado',
    };
    const title = titleByType[templateType] || 'Documento';
    try {
      const newDoc = await documentService.addDocument(currentClient.id, {
        type: 'TEMPLATE',
        title,
        content: templateContent,
      });
      setDocumentsForClient(prev => [newDoc, ...prev]);
      setTemplateContent('');
      showToast?.('Documento guardado', 'success');
    } catch (error) {
      console.error('Error saving template:', error);
      showToast?.('Error al guardar documento', 'error');
    }
  };

  const openTextDocumentAsPrint = (doc) => {
    const rawContent = doc?.content || '';
    if (!rawContent.trim()) return;
    printHtmlContent(doc.title || 'Documento', rawContent);
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
      const { generateClientDocument } = await import('../../../services/aiService');
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
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Documentos</h2>
        {hasClients && (
          <select
            className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No hay clientes registrados todavía. Crea al menos un cliente para poder
            asociar contratos, pagarés u otros documentos.
          </p>
        </Card>
      )}

      {hasClients && currentClient && (
        <>
          <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              Documentos del cliente
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold mb-1">{currentClient.name}</p>
            {currentClient.idNumber && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Cédula / ID: {currentClient.idNumber}</p>
            )}
            {currentClient.address && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Dirección: {currentClient.address}</p>
            )}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Descripción del documento</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ej: Cédula frente, Cédula reverso, Pagaré firmado"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Archivo</label>
                <div className="relative">
                  <label className="flex items-center gap-2 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded text-xs font-semibold">
                      Elegir archivo
                    </span>
                    <span className="text-xs truncate">
                      No se ha seleccionado
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleUploadDocument}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-lg">
                      <span className="text-xs font-bold text-blue-600 animate-pulse">Subiendo...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Generar documento de texto rápido</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo de documento</label>
                  <select
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
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
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Contenido</label>
                  <textarea
                    rows={4}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-[11px] bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
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
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Usar plantilla
                </button>
                <button
                  type="button"
                  onClick={handleGenerateTemplateWithAI}
                  disabled={aiGenerating}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white font-semibold disabled:opacity-60 hover:bg-indigo-500"
                >
                  {aiGenerating ? 'Generando con IA...' : 'Generar con IA'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplateAsDocument}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-semibold hover:bg-slate-800"
                >
                  Guardar como documento
                </button>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 space-y-2">
              {documentsForClient.length === 0 ? (
                <>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Aún no hay documentos guardados para este cliente.</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cuando generes un contrato desde la pantalla de Préstamos podrás guardarlo aquí.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Documentos guardados:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {documentsForClient.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {/* Thumbnail Logic */}
                        <div className="w-16 h-16 flex-shrink-0 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-600">
                          {doc.dataUrl && (doc.mimeType ? doc.mimeType.startsWith('image/') : doc.dataUrl.startsWith('data:image')) ? (
                            <img
                              src={doc.dataUrl}
                              alt={doc.title || 'Documento'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-slate-400 flex flex-col items-center">
                              <span className="text-[10px] font-bold uppercase">{doc.type === 'TEMPLATE' || !doc.mimeType ? 'DOC' : 'FILE'}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate" title={doc.title}>
                            {doc.title || doc.type || 'Documento'}
                          </p>
                          {doc.createdAt && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {new Date(doc.createdAt).toLocaleDateString('es-DO')}
                            </p>
                          )}
                          <div className="mt-2 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                if (doc.dataUrl) {
                                  const a = document.createElement('a');
                                  a.href = doc.dataUrl;
                                  a.download = `${(doc.fileName || doc.title || 'documento').replace(/\s+/g, '_')}`;
                                  a.click();
                                } else {
                                  openTextDocumentAsPrint(doc);
                                }
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold"
                            >
                              Ver / Imprimir (PDF)
                            </button>
                            <button
                              type="button"
                              onClick={() => setDocToDelete(doc)}
                              className="ml-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              title="Eliminar documento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={() => handleDeleteDocument(docToDelete?.id)}
        title="¿Eliminar documento?"
        message={`¿Estás seguro de que deseas eliminar "${docToDelete?.title || 'este documento'}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default DocumentsView;
