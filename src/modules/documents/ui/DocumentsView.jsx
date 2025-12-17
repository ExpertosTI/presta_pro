import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../../shared/components/ui/Card';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { printHtmlContent } from '../../../shared/utils/printUtils';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  FileText, Trash2, Search, Filter, PenTool, Eye,
  Download, FileCheck, FolderOpen, Calendar, CreditCard, X
} from 'lucide-react';
import documentService from '../services/documentService';

// MEJORA 10: Document Categories
const CATEGORIES = [
  { value: 'LEGAL', label: 'Legal', color: 'blue' },
  { value: 'GARANTIA', label: 'Garantía', color: 'amber' },
  { value: 'COBROS', label: 'Cobros', color: 'rose' },
  { value: 'IDENTIFICACION', label: 'Identificación', color: 'violet' },
  { value: 'OTRO', label: 'Otro', color: 'slate' }
];

// MEJORA 12: Document Status
const STATUSES = [
  { value: 'PENDING', label: 'Pendiente', color: 'amber' },
  { value: 'SIGNED', label: 'Firmado', color: 'emerald' },
  { value: 'DELIVERED', label: 'Entregado', color: 'blue' },
  { value: 'ARCHIVED', label: 'Archivado', color: 'slate' }
];

// MEJORA 1-6: Document Types (Legacy + New)
const DOCUMENT_TYPES = [
  { value: 'CONTRACT_SIMPLE', label: 'Contrato Simple', category: 'LEGAL' },
  { value: 'PAGARE_SIMPLE', label: 'Pagaré Simple', category: 'LEGAL' },
  { value: 'PAGARE_NOTARIAL', label: 'Pagaré Notarial', category: 'LEGAL' },
  { value: 'CARTA_COBRO', label: 'Carta de Cobro', category: 'COBROS' },
  { value: 'CARTA_RUTA', label: 'Carta Ruta', category: 'COBROS' },
  { value: 'CARTA_SALDO', label: 'Carta Saldo', category: 'COBROS' },
  { value: 'CERTIFICADO_VENTA', label: 'Certificado Venta Condicional', category: 'GARANTIA' },
  { value: 'CONTRATO_INMUEBLE', label: 'Contrato Venta Condicional Inmueble', category: 'GARANTIA' },
  { value: 'ENTREGA_VOLUNTARIA', label: 'Entrega Voluntaria', category: 'GARANTIA' },
  { value: 'OTRO', label: 'Otro / Personalizado', category: 'OTRO' }
];

const getCategoryStyle = (cat) => {
  const found = CATEGORIES.find(c => c.value === cat);
  const color = found?.color || 'slate';
  return `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`;
};

const getStatusStyle = (status) => {
  const found = STATUSES.find(s => s.value === status);
  const color = found?.color || 'slate';
  return `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`;
};

const DocumentsView = ({ clients, loans = [], companyName = 'RenKredit', selectedClientId, onSelectClient, showToast }) => {
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

  // MEJORA 7: Selected loan for document
  const [selectedLoanId, setSelectedLoanId] = useState('');

  // MEJORA 9: Search
  const [searchQuery, setSearchQuery] = useState('');

  // MEJORA 10: Category filter
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // MEJORA 12: Document status for new doc
  const [docStatus, setDocStatus] = useState('PENDING');

  // MEJORA 14: Signature Canvas
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // MEJORA 15: Preview Modal
  const [previewModal, setPreviewModal] = useState(null);

  // Get loans for current client
  const clientLoans = useMemo(() => {
    if (!currentClient?.id) return [];
    return loans.filter(l => l.clientId === currentClient.id);
  }, [loans, currentClient]);

  // MEJORA 8: Selected loan data for auto-fill
  const selectedLoan = useMemo(() => {
    if (!selectedLoanId) return null;
    return loans.find(l => l.id === selectedLoanId);
  }, [loans, selectedLoanId]);

  // Load documents when client changes
  useEffect(() => {
    if (currentClient?.id) {
      loadDocuments(currentClient.id);
    } else {
      setDocumentsForClient([]);
    }
  }, [currentClient?.id]);

  // MEJORA 9: Filtered documents
  const filteredDocuments = useMemo(() => {
    let result = [...documentsForClient];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.type || '').toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(d => d.category === categoryFilter);
    }

    return result;
  }, [documentsForClient, searchQuery, categoryFilter]);

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
    setSelectedLoanId('');
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
        category: 'IDENTIFICACION',
        status: 'PENDING'
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

  // MEJORA 1-6, 8: Build templates with loan data
  const buildTemplateForType = (type, client, loan) => {
    const name = client?.name || '__________________';
    const idNumber = client?.idNumber || '__________________';
    const address = client?.address || '__________________';
    const phone = client?.phone || '__________________';
    const company = companyName || 'RenKredit';
    const today = new Date().toLocaleDateString('es-DO');

    // MEJORA 8: Auto-fill from loan
    const loanAmount = loan ? formatCurrency(loan.amount) : '__________________';
    const loanRate = loan ? `${loan.rate}%` : '____%';
    const loanTerm = loan ? `${loan.term} cuotas` : '____ cuotas';
    const loanFrequency = loan?.frequency || 'Mensual';
    const loanStartDate = loan?.startDate ? formatDate(loan.startDate) : today;
    const installmentAmount = loan && loan.schedule?.[0] ? formatCurrency(loan.schedule[0].payment) : '__________________';

    // Calculate balance
    const totalPaid = loan?.totalPaid || 0;
    const totalDue = loan ? (parseFloat(loan.amount) * (1 + parseFloat(loan.rate) / 100)) : 0;
    const balance = formatCurrency(totalDue - totalPaid);

    switch (type) {
      case 'PAGARE_SIMPLE':
        return `PAGARÉ SIMPLE

Yo, ${name}, con cédula de identidad No. ${idNumber}, domiciliado en ${address}, declaro que debo a ${company} la suma de ${loanAmount}, que me comprometo a pagar en ${loanTerm} con frecuencia ${loanFrequency}.

Cuota: ${installmentAmount}
Tasa de interés: ${loanRate}
Fecha inicio: ${loanStartDate}

Lugar y fecha: ${today}

Firma del deudor: _________________________
Cédula: ${idNumber}`;

      case 'PAGARE_NOTARIAL':
        return `PAGARÉ NOTARIAL
(Artículo 1326 del Código Civil)

En la ciudad de _____________, a los ${today}

Por este PAGARÉ NOTARIAL, yo ${name}, mayor de edad, dominicano/a, con cédula de identidad y electoral No. ${idNumber}, domiciliado/a en ${address}, teléfono ${phone},

ME OBLIGO incondicionalmente a pagar a la orden de ${company} o a quien sus derechos represente, la suma de ${loanAmount} (______________________ PESOS DOMINICANOS), valor recibido a mi entera satisfacción.

FORMA DE PAGO: ${loanTerm} de ${installmentAmount} cada una con frecuencia ${loanFrequency}, comenzando el día ${loanStartDate}.

INTERÉS: Se cobrará interés del ${loanRate} sobre el capital.

MORA: En caso de mora, el deudor pagará un interés adicional del ___% mensual sobre el saldo pendiente.

JURISDICCIÓN: Para todos los efectos legales, me someto a la jurisdicción de los tribunales de _______________.

EN FE DE LO CUAL, firmo el presente pagaré.

____________________________
${name}
Cédula: ${idNumber}

TESTIGO 1: _____________________ Cédula: _______________
TESTIGO 2: _____________________ Cédula: _______________`;

      case 'CARTA_COBRO':
        return `CARTA DE COBRO

${today}

Estimado(a) ${name},

Le recordamos que posee cuotas pendientes de pago con ${company}. 

Préstamo: ${loanAmount}
Saldo pendiente: ${balance}

Favor pasar por la oficina o contactar a su cobrador para regularizar su situación.

Atentamente,
${company}
_______________________`;

      case 'CARTA_RUTA':
        return `CARTA RUTA
${company}

Fecha: ${today}
Cobrador: ____________________

CLIENTE: ${name}
Dirección: ${address}
Teléfono: ${phone}

PRÉSTAMO #: ${loan?.id?.slice(0, 8) || '________'}
Monto original: ${loanAmount}
Cuota: ${installmentAmount}
Saldo actual: ${balance}

OBSERVACIONES:
_____________________________________________
_____________________________________________

Firma cliente: _________________
Firma cobrador: _________________`;

      case 'CARTA_SALDO':
        return `CARTA DE SALDO
${company}

Fecha: ${today}

CERTIFICACIÓN DE SALDO

Por medio de la presente certificamos que ${name}, identificado/a con cédula No. ${idNumber}, mantiene el siguiente estado de cuenta:

Préstamo original: ${loanAmount}
Total pagado: ${formatCurrency(totalPaid)}
SALDO PENDIENTE: ${balance}

Esta certificación se emite a solicitud del interesado para los fines que considere convenientes.

Atentamente,

_____________________________
${company}
Gerencia`;

      case 'CERTIFICADO_VENTA':
        return `CERTIFICADO DE VENTA CONDICIONAL

En la ciudad de _____________, a los ${today}

Entre ${company}, representado por __________________, en adelante "EL VENDEDOR", y ${name}, con cédula No. ${idNumber}, en adelante "EL COMPRADOR",

SE CERTIFICA:

Que EL COMPRADOR ha adquirido de EL VENDEDOR el siguiente bien:
Descripción: ___________________________________
Marca/Modelo: _________________________________
Serial/Chasis: _________________________________

Por un precio de ${loanAmount}, pagadero en ${loanTerm} de ${installmentAmount}.

La propiedad del bien permanecerá bajo reserva de EL VENDEDOR hasta que EL COMPRADOR complete el pago total.

EL VENDEDOR: _____________________
EL COMPRADOR: _____________________

Testigos:
1. ___________________________
2. ___________________________`;

      case 'CONTRATO_INMUEBLE':
        return `CONTRATO DE VENTA CONDICIONAL DE INMUEBLE

En la ciudad de _____________, a los ${today}

ENTRE:
${company}, representado por __________________,
Denominado en lo adelante "EL VENDEDOR"

Y:
${name}, cédula No. ${idNumber}, domiciliado en ${address},
Denominado en lo adelante "EL COMPRADOR"

SE HA CONVENIDO Y PACTADO LO SIGUIENTE:

PRIMERO: EL VENDEDOR vende a EL COMPRADOR, quien acepta, el inmueble ubicado en:
_____________________________________________
Certificado de Título No.: ____________________

SEGUNDO: El precio convenido es de ${loanAmount}, pagadero en ${loanTerm} de ${installmentAmount}.

TERCERO: La transferencia de la propiedad queda condicionada al pago total del precio.

CUARTO: EL COMPRADOR se obliga a mantener el inmueble en buen estado.

QUINTO: En caso de incumplimiento, EL VENDEDOR podrá declarar resuelto este contrato.

Firma EL VENDEDOR: _____________________
Firma EL COMPRADOR: _____________________
Fecha: ${today}`;

      case 'ENTREGA_VOLUNTARIA':
        return `ACTA DE ENTREGA VOLUNTARIA

En la ciudad de _____________, a los ${today}

Yo, ${name}, con cédula No. ${idNumber}, domiciliado en ${address},

Por medio de la presente hago constar que de manera VOLUNTARIA hago entrega a ${company} del siguiente bien que fue dado en garantía de mi préstamo:

Descripción: ___________________________________
Marca/Modelo: _________________________________
Serial/Chasis: _________________________________
Estado: _________________________________

Saldo pendiente al momento de entrega: ${balance}

Declaro que esta entrega la realizo de forma libre y sin coacción alguna, como forma de pago parcial o total de mi obligación.

Firma del deudor: _____________________
Cédula: ${idNumber}

Recibido por: _____________________
Fecha: ${today}`;

      case 'OTRO':
        return 'Escribe aquí el contenido del documento personalizado...';
      case 'CONTRACT_SIMPLE':
      default:
        return `CONTRATO DE PRÉSTAMO

Entre ${company} (PRESTAMISTA) y ${name} (PRESTATARIO), cédula No. ${idNumber}, domiciliado en ${address}, se acuerda:

PRIMERO: EL PRESTAMISTA entrega en préstamo al PRESTATARIO la suma de ${loanAmount}.

SEGUNDO: EL PRESTATARIO se compromete a pagar en ${loanTerm} de ${installmentAmount} cada una, con frecuencia ${loanFrequency}.

TERCERO: La tasa de interés es de ${loanRate}.

CUARTO: El primer pago se realizará el día ${loanStartDate}.

QUINTO: En caso de mora, se aplicará un recargo de ___% sobre la cuota vencida.

Firma PRESTAMISTA: ______________________
Firma PRESTATARIO: ______________________
Fecha: ${today}`;
    }
  };

  const handleChangeTemplateType = (e) => {
    const nextType = e.target.value;
    setTemplateType(nextType);
    setTemplateContent(buildTemplateForType(nextType, currentClient, selectedLoan));
  };

  const handleGenerateTemplate = () => {
    if (!currentClient) return;
    setTemplateContent(buildTemplateForType(templateType, currentClient, selectedLoan));
  };

  // MEJORA 7: When loan changes, regenerate template
  const handleLoanChange = (e) => {
    const loanId = e.target.value;
    setSelectedLoanId(loanId);
    const loan = loans.find(l => l.id === loanId);
    if (loan && currentClient) {
      setTemplateContent(buildTemplateForType(templateType, currentClient, loan));
    }
  };

  const handleSaveTemplateAsDocument = async () => {
    if (!currentClient) return;
    if (!templateContent || !templateContent.trim()) return;

    const docType = DOCUMENT_TYPES.find(t => t.value === templateType);
    const title = docType?.label || 'Documento';
    const category = docType?.category || 'OTRO';

    try {
      const newDoc = await documentService.addDocument(currentClient.id, {
        type: templateType,
        title,
        content: templateContent,
        category,
        status: docStatus,
        loanId: selectedLoanId || null,
        signatureDataUrl: signatureDataUrl || null
      });
      setDocumentsForClient(prev => [newDoc, ...prev]);
      setTemplateContent('');
      setSignatureDataUrl('');
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
      const lastLoan = selectedLoan || getLastLoanForClient(currentClient.id);
      const effectiveCompanyName = companyName || 'RenKredit';
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

  // MEJORA 14: Signature Canvas Functions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl('');
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setShowSignatureModal(false);
  };

  // Update document status
  const updateDocStatus = async (docId, newStatus) => {
    try {
      setDocumentsForClient(prev => prev.map(d =>
        d.id === docId ? { ...d, status: newStatus } : d
      ));
      showToast?.('Estado actualizado', 'success');
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Documentos
        </h2>
        {hasClients && (
          <select
            className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm"
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
          {/* MEJORA 9 & 10: Search and Filter Bar */}
          <Card>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[180px] relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
              >
                <option value="ALL">Todas categorías</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* Document Generator */}
          <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
              <FolderOpen size={18} className="text-blue-600" />
              Generar Documento
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold mb-1">{currentClient.name}</p>
            {currentClient.idNumber && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Cédula: {currentClient.idNumber}</p>
            )}

            {/* MEJORA 7: Loan Selector */}
            {clientLoans.length > 0 && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <CreditCard size={12} /> Asociar a préstamo (opcional)
                </label>
                <select
                  value={selectedLoanId}
                  onChange={handleLoanChange}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"
                >
                  <option value="">Sin préstamo asociado</option>
                  {clientLoans.map(l => (
                    <option key={l.id} value={l.id}>
                      {formatCurrency(l.amount)} - {l.term} cuotas ({l.status})
                    </option>
                  ))}
                </select>
                {selectedLoan && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ Los datos del préstamo se usarán para auto-llenar el documento
                  </p>
                )}
              </div>
            )}

            {/* Template Type and Content */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo de documento</label>
                <select
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={templateType}
                  onChange={handleChangeTemplateType}
                >
                  {DOCUMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Estado inicial</label>
                <select
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={docStatus}
                  onChange={(e) => setDocStatus(e.target.value)}
                >
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Firma digital</label>
                <button
                  onClick={() => setShowSignatureModal(true)}
                  className={`w-full p-2 border rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${signatureDataUrl
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                >
                  <PenTool size={14} />
                  {signatureDataUrl ? '✓ Firmado' : 'Agregar firma'}
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Contenido</label>
              <textarea
                rows={8}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-xs bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Escribe o genera el contenido del documento..."
              />
            </div>

            {/* Signature Preview */}
            {signatureDataUrl && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Firma adjunta:</span>
                <img src={signatureDataUrl} alt="Firma" className="h-8 border rounded" />
                <button onClick={() => setSignatureDataUrl('')} className="text-rose-500 text-xs">Quitar</button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-end mt-3">
              <button
                type="button"
                onClick={handleGenerateTemplate}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Usar plantilla
              </button>
              {/* MEJORA 15: Preview button */}
              <button
                type="button"
                onClick={() => setPreviewModal({ content: templateContent, title: DOCUMENT_TYPES.find(t => t.value === templateType)?.label })}
                disabled={!templateContent.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-xs hover:bg-blue-200 disabled:opacity-50 flex items-center gap-1"
              >
                <Eye size={12} /> Vista previa
              </button>
              <button
                type="button"
                onClick={handleGenerateTemplateWithAI}
                disabled={aiGenerating}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white font-semibold text-xs disabled:opacity-60 hover:bg-indigo-500"
              >
                {aiGenerating ? 'Generando con IA...' : 'Generar con IA'}
              </button>
              <button
                type="button"
                onClick={handleSaveTemplateAsDocument}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-semibold text-xs hover:bg-slate-800"
              >
                Guardar documento
              </button>
            </div>
          </Card>

          {/* Upload Section */}
          <Card>
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">Subir archivo (cédula, comprobante, etc.)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-2">
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Descripción del documento"
                />
              </div>
              <div className="relative">
                <label className="flex items-center gap-2 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded text-xs font-semibold">
                    Elegir archivo
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
          </Card>

          {/* Documents List */}
          <Card>
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">
              Documentos guardados ({filteredDocuments.length})
            </h3>
            {loadingDocs ? (
              <p className="text-xs text-slate-400">Cargando...</p>
            ) : filteredDocuments.length === 0 ? (
              <p className="text-xs text-slate-500">
                {searchQuery || categoryFilter !== 'ALL'
                  ? 'No se encontraron documentos con los filtros aplicados.'
                  : 'Aún no hay documentos guardados para este cliente.'}
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {filteredDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-col bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-full h-20 flex-shrink-0 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-600 mb-2">
                      {doc.dataUrl && (doc.mimeType ? doc.mimeType.startsWith('image/') : doc.dataUrl.startsWith('data:image')) ? (
                        <img
                          src={doc.dataUrl}
                          alt={doc.title || 'Documento'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText size={24} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate" title={doc.title}>
                        {doc.title || doc.type || 'Documento'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {doc.category && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getCategoryStyle(doc.category)}`}>
                            {CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                          </span>
                        )}
                        {doc.status && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusStyle(doc.status)}`}>
                            {STATUSES.find(s => s.value === doc.status)?.label || doc.status}
                          </span>
                        )}
                      </div>
                      {doc.createdAt && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          {new Date(doc.createdAt).toLocaleDateString('es-DO')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
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
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-semibold flex items-center gap-1"
                      >
                        <Download size={12} /> Descargar
                      </button>
                      {/* MEJORA 12: Status change */}
                      <select
                        value={doc.status || 'PENDING'}
                        onChange={(e) => updateDocStatus(doc.id, e.target.value)}
                        className="text-[10px] p-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900/50"
                      >
                        {STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        className="ml-auto text-red-500 hover:text-red-700"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* MEJORA 14: Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <PenTool size={20} className="text-blue-600" />
                Firma Digital
              </h3>
              <button onClick={() => setShowSignatureModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">Dibuja tu firma con el mouse o dedo</p>
            <canvas
              ref={canvasRef}
              width={350}
              height={150}
              className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-white cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={clearSignature}
                className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm"
              >
                Limpiar
              </button>
              <button
                onClick={saveSignature}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500"
              >
                Guardar Firma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEJORA 15: Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Eye size={20} className="text-blue-600" />
                Vista Previa: {previewModal.title}
              </h3>
              <button onClick={() => setPreviewModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] bg-white">
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed">
                {previewModal.content}
              </pre>
              {signatureDataUrl && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-slate-500 mb-2">Firma:</p>
                  <img src={signatureDataUrl} alt="Firma" className="h-16 border rounded" />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end">
              <button
                onClick={() => setPreviewModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm"
              >
                Cerrar
              </button>
              <button
                onClick={() => { printHtmlContent(previewModal.title, previewModal.content); }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 flex items-center gap-2"
              >
                <Download size={14} /> Imprimir PDF
              </button>
            </div>
          </div>
        </div>
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
