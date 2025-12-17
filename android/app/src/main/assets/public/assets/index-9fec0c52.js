import{c as Ae,i as X,j as t,F as be,C as k,f as I,X as ge,_ as pe,b as Be}from"./index-d07a4565.js";import{r as o}from"./vendor-8a332d8f.js";import{C as Ye}from"./ConfirmDialog-28f4d78f.js";import{printHtmlContent as he}from"./printUtils-04a0a819.js";import{S as He}from"./search-001f2433.js";import{C as Ke}from"./credit-card-9381f742.js";import{E as fe}from"./eye-bb721541.js";import{D as Ne}from"./download-ccc94549.js";import{T as Qe}from"./trash-2-8bdf2c52.js";import"./alert-triangle-f3e24c64.js";const Xe=Ae("FolderOpen",[["path",{d:"m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2",key:"1nmvlm"}]]),Ee=Ae("PenTool",[["path",{d:"m12 19 7-7 3 3-7 7-3-3z",key:"rklqx2"}],["path",{d:"m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z",key:"1et58u"}],["path",{d:"m2 2 7.586 7.586",key:"etlp93"}],["circle",{cx:"11",cy:"11",r:"2",key:"xmgehs"}]]),We=async i=>await X.get(`/clients/${i}/documents`),Je=async(i,d)=>await X.post(`/clients/${i}/documents`,d),Ze=async i=>await X.delete(`/clients/documents/${i}`),w={getClientDocuments:We,addDocument:Je,deleteDocument:Ze},Q=[{value:"LEGAL",label:"Legal",color:"blue"},{value:"GARANTIA",label:"Garantía",color:"amber"},{value:"COBROS",label:"Cobros",color:"rose"},{value:"IDENTIFICACION",label:"Identificación",color:"violet"},{value:"OTRO",label:"Otro",color:"slate"}],M=[{value:"PENDING",label:"Pendiente",color:"amber"},{value:"SIGNED",label:"Firmado",color:"emerald"},{value:"DELIVERED",label:"Entregado",color:"blue"},{value:"ARCHIVED",label:"Archivado",color:"slate"}],K=[{value:"CONTRACT_SIMPLE",label:"Contrato Simple",category:"LEGAL"},{value:"PAGARE_SIMPLE",label:"Pagaré Simple",category:"LEGAL"},{value:"PAGARE_NOTARIAL",label:"Pagaré Notarial",category:"LEGAL"},{value:"CARTA_COBRO",label:"Carta de Cobro",category:"COBROS"},{value:"CARTA_RUTA",label:"Carta Ruta",category:"COBROS"},{value:"CARTA_SALDO",label:"Carta Saldo",category:"COBROS"},{value:"CERTIFICADO_VENTA",label:"Certificado Venta Condicional",category:"GARANTIA"},{value:"CONTRATO_INMUEBLE",label:"Contrato Venta Condicional Inmueble",category:"GARANTIA"},{value:"ENTREGA_VOLUNTARIA",label:"Entrega Voluntaria",category:"GARANTIA"},{value:"OTRO",label:"Otro / Personalizado",category:"OTRO"}],et=i=>{const d=Q.find(v=>v.value===i),u=(d==null?void 0:d.color)||"slate";return`bg-${u}-100 dark:bg-${u}-900/30 text-${u}-700 dark:text-${u}-300`},tt=i=>{const d=M.find(v=>v.value===i),u=(d==null?void 0:d.color)||"slate";return`bg-${u}-100 dark:bg-${u}-900/30 text-${u}-700 dark:text-${u}-300`},at=({clients:i,loans:d=[],companyName:u="RenKredit",selectedClientId:v,onSelectClient:W,showToast:n})=>{const $=Array.isArray(i)&&i.length>0,r=$?i.find(e=>e.id===v)||i[0]:null,[J,g]=o.useState([]),[ve,Z]=o.useState(!1),[ee,te]=o.useState(""),[p,Ce]=o.useState("CONTRACT_SIMPLE"),[N,E]=o.useState(""),[ae,_e]=o.useState(!1),[se,re]=o.useState(!1),[h,F]=o.useState(null),[C,le]=o.useState(""),[D,De]=o.useState(""),[j,je]=o.useState("ALL"),[ne,Re]=o.useState("PENDING"),[Oe,G]=o.useState(!1),[f,T]=o.useState(""),R=o.useRef(null),[ye,oe]=o.useState(!1),[O,U]=o.useState(null),de=o.useMemo(()=>r!=null&&r.id?d.filter(e=>e.clientId===r.id):[],[d,r]),S=o.useMemo(()=>C?d.find(e=>e.id===C):null,[d,C]);o.useEffect(()=>{r!=null&&r.id?ke(r.id):g([])},[r==null?void 0:r.id]);const V=o.useMemo(()=>{let e=[...J];if(D.trim()){const a=D.toLowerCase();e=e.filter(_=>(_.title||"").toLowerCase().includes(a)||(_.type||"").toLowerCase().includes(a))}return j!=="ALL"&&(e=e.filter(a=>a.category===j)),e},[J,D,j]),ke=async e=>{Z(!0);try{const a=await w.getClientDocuments(e);g(Array.isArray(a)?a:[])}catch(a){console.error("Error loading documents:",a),g([])}finally{Z(!1)}},Ie=async e=>{try{await w.deleteDocument(e),g(a=>a.filter(_=>_.id!==e)),n==null||n("Documento eliminado","success")}catch(a){console.error("Error deleting document:",a),n==null||n("Error al eliminar documento","error")}F(null)},$e=e=>{const a=e.target.value||null;W&&W(a),le("")},Te=async e=>{const a=e.target.files&&e.target.files[0];if(!(!a||!r)){re(!0);try{const{fileToBase64:_}=await pe(()=>import("./imageUtils-542d258e.js"),[],import.meta.url),s=await _(a),l=ee.trim()||a.name,c=await w.addDocument(r.id,{type:"UPLOAD",title:l,fileName:a.name,mimeType:a.type,dataUrl:s,category:"IDENTIFICACION",status:"PENDING"});g(L=>[c,...L]),te(""),n==null||n("Documento subido exitosamente","success")}catch(_){console.error("Error uploading client document",_),n==null||n("Error al subir documento","error")}finally{re(!1),e.target.value=""}}},z=(e,a,_)=>{var me,xe;const s=(a==null?void 0:a.name)||"__________________",l=(a==null?void 0:a.idNumber)||"__________________",c=(a==null?void 0:a.address)||"__________________",L=(a==null?void 0:a.phone)||"__________________",x=u||"RenKredit",m=new Date().toLocaleDateString("es-DO"),b=_?I(_.amount):"__________________",B=_?`${_.rate}%`:"____%",y=_?`${_.term} cuotas`:"____ cuotas",Y=(_==null?void 0:_.frequency)||"Mensual",H=_!=null&&_.startDate?Be(_.startDate):m,A=_&&((me=_.schedule)!=null&&me[0])?I(_.schedule[0].payment):"__________________",ue=(_==null?void 0:_.totalPaid)||0,qe=_?parseFloat(_.amount)*(1+parseFloat(_.rate)/100):0,P=I(qe-ue);switch(e){case"PAGARE_SIMPLE":return`PAGARÉ SIMPLE

Yo, ${s}, con cédula de identidad No. ${l}, domiciliado en ${c}, declaro que debo a ${x} la suma de ${b}, que me comprometo a pagar en ${y} con frecuencia ${Y}.

Cuota: ${A}
Tasa de interés: ${B}
Fecha inicio: ${H}

Lugar y fecha: ${m}

Firma del deudor: _________________________
Cédula: ${l}`;case"PAGARE_NOTARIAL":return`PAGARÉ NOTARIAL
(Artículo 1326 del Código Civil)

En la ciudad de _____________, a los ${m}

Por este PAGARÉ NOTARIAL, yo ${s}, mayor de edad, dominicano/a, con cédula de identidad y electoral No. ${l}, domiciliado/a en ${c}, teléfono ${L},

ME OBLIGO incondicionalmente a pagar a la orden de ${x} o a quien sus derechos represente, la suma de ${b} (______________________ PESOS DOMINICANOS), valor recibido a mi entera satisfacción.

FORMA DE PAGO: ${y} de ${A} cada una con frecuencia ${Y}, comenzando el día ${H}.

INTERÉS: Se cobrará interés del ${B} sobre el capital.

MORA: En caso de mora, el deudor pagará un interés adicional del ___% mensual sobre el saldo pendiente.

JURISDICCIÓN: Para todos los efectos legales, me someto a la jurisdicción de los tribunales de _______________.

EN FE DE LO CUAL, firmo el presente pagaré.

____________________________
${s}
Cédula: ${l}

TESTIGO 1: _____________________ Cédula: _______________
TESTIGO 2: _____________________ Cédula: _______________`;case"CARTA_COBRO":return`CARTA DE COBRO

${m}

Estimado(a) ${s},

Le recordamos que posee cuotas pendientes de pago con ${x}. 

Préstamo: ${b}
Saldo pendiente: ${P}

Favor pasar por la oficina o contactar a su cobrador para regularizar su situación.

Atentamente,
${x}
_______________________`;case"CARTA_RUTA":return`CARTA RUTA
${x}

Fecha: ${m}
Cobrador: ____________________

CLIENTE: ${s}
Dirección: ${c}
Teléfono: ${L}

PRÉSTAMO #: ${((xe=_==null?void 0:_.id)==null?void 0:xe.slice(0,8))||"________"}
Monto original: ${b}
Cuota: ${A}
Saldo actual: ${P}

OBSERVACIONES:
_____________________________________________
_____________________________________________

Firma cliente: _________________
Firma cobrador: _________________`;case"CARTA_SALDO":return`CARTA DE SALDO
${x}

Fecha: ${m}

CERTIFICACIÓN DE SALDO

Por medio de la presente certificamos que ${s}, identificado/a con cédula No. ${l}, mantiene el siguiente estado de cuenta:

Préstamo original: ${b}
Total pagado: ${I(ue)}
SALDO PENDIENTE: ${P}

Esta certificación se emite a solicitud del interesado para los fines que considere convenientes.

Atentamente,

_____________________________
${x}
Gerencia`;case"CERTIFICADO_VENTA":return`CERTIFICADO DE VENTA CONDICIONAL

En la ciudad de _____________, a los ${m}

Entre ${x}, representado por __________________, en adelante "EL VENDEDOR", y ${s}, con cédula No. ${l}, en adelante "EL COMPRADOR",

SE CERTIFICA:

Que EL COMPRADOR ha adquirido de EL VENDEDOR el siguiente bien:
Descripción: ___________________________________
Marca/Modelo: _________________________________
Serial/Chasis: _________________________________

Por un precio de ${b}, pagadero en ${y} de ${A}.

La propiedad del bien permanecerá bajo reserva de EL VENDEDOR hasta que EL COMPRADOR complete el pago total.

EL VENDEDOR: _____________________
EL COMPRADOR: _____________________

Testigos:
1. ___________________________
2. ___________________________`;case"CONTRATO_INMUEBLE":return`CONTRATO DE VENTA CONDICIONAL DE INMUEBLE

En la ciudad de _____________, a los ${m}

ENTRE:
${x}, representado por __________________,
Denominado en lo adelante "EL VENDEDOR"

Y:
${s}, cédula No. ${l}, domiciliado en ${c},
Denominado en lo adelante "EL COMPRADOR"

SE HA CONVENIDO Y PACTADO LO SIGUIENTE:

PRIMERO: EL VENDEDOR vende a EL COMPRADOR, quien acepta, el inmueble ubicado en:
_____________________________________________
Certificado de Título No.: ____________________

SEGUNDO: El precio convenido es de ${b}, pagadero en ${y} de ${A}.

TERCERO: La transferencia de la propiedad queda condicionada al pago total del precio.

CUARTO: EL COMPRADOR se obliga a mantener el inmueble en buen estado.

QUINTO: En caso de incumplimiento, EL VENDEDOR podrá declarar resuelto este contrato.

Firma EL VENDEDOR: _____________________
Firma EL COMPRADOR: _____________________
Fecha: ${m}`;case"ENTREGA_VOLUNTARIA":return`ACTA DE ENTREGA VOLUNTARIA

En la ciudad de _____________, a los ${m}

Yo, ${s}, con cédula No. ${l}, domiciliado en ${c},

Por medio de la presente hago constar que de manera VOLUNTARIA hago entrega a ${x} del siguiente bien que fue dado en garantía de mi préstamo:

Descripción: ___________________________________
Marca/Modelo: _________________________________
Serial/Chasis: _________________________________
Estado: _________________________________

Saldo pendiente al momento de entrega: ${P}

Declaro que esta entrega la realizo de forma libre y sin coacción alguna, como forma de pago parcial o total de mi obligación.

Firma del deudor: _____________________
Cédula: ${l}

Recibido por: _____________________
Fecha: ${m}`;case"OTRO":return"Escribe aquí el contenido del documento personalizado...";case"CONTRACT_SIMPLE":default:return`CONTRATO DE PRÉSTAMO

Entre ${x} (PRESTAMISTA) y ${s} (PRESTATARIO), cédula No. ${l}, domiciliado en ${c}, se acuerda:

PRIMERO: EL PRESTAMISTA entrega en préstamo al PRESTATARIO la suma de ${b}.

SEGUNDO: EL PRESTATARIO se compromete a pagar en ${y} de ${A} cada una, con frecuencia ${Y}.

TERCERO: La tasa de interés es de ${B}.

CUARTO: El primer pago se realizará el día ${H}.

QUINTO: En caso de mora, se aplicará un recargo de ___% sobre la cuota vencida.

Firma PRESTAMISTA: ______________________
Firma PRESTATARIO: ______________________
Fecha: ${m}`}},Se=e=>{const a=e.target.value;Ce(a),E(z(a,r,S))},Le=()=>{r&&E(z(p,r,S))},Pe=e=>{const a=e.target.value;le(a);const _=d.find(s=>s.id===a);_&&r&&E(z(p,r,_))},we=async()=>{if(!r||!N||!N.trim())return;const e=K.find(s=>s.value===p),a=(e==null?void 0:e.label)||"Documento",_=(e==null?void 0:e.category)||"OTRO";try{const s=await w.addDocument(r.id,{type:p,title:a,content:N,category:_,status:ne,loanId:C||null,signatureDataUrl:f||null});g(l=>[s,...l]),E(""),T(""),n==null||n("Documento guardado","success")}catch(s){console.error("Error saving template:",s),n==null||n("Error al guardar documento","error")}},Me=e=>{const a=(e==null?void 0:e.content)||"";a.trim()&&he(e.title||"Documento",a)},Fe=e=>{if(!e||!Array.isArray(d)||d.length===0)return null;const a=d.filter(_=>_.clientId===e);return a.length===0?null:a.slice().sort((_,s)=>{const l=new Date(_.createdAt||_.startDate||0).getTime();return new Date(s.createdAt||s.startDate||0).getTime()-l})[0]},Ge=async()=>{if(!r)return;const e={}.VITE_GEMINI_API_KEY;if(!e){alert("Falta configurar la API de IA (VITE_GEMINI_API_KEY) para generar documentos automáticamente.");return}_e(!0);try{const{generateClientDocument:a}=await pe(()=>import("./index-d07a4565.js").then(c=>c.v),["./index-d07a4565.js","./vendor-8a332d8f.js","./index-fabd045c.css"],import.meta.url),_=S||Fe(r.id),l=await a(p,r,_,u||"RenKredit",e);l&&typeof l=="string"&&E(l.trim())}catch(a){console.error("Error generating document with AI",a),alert("No se pudo generar el documento con IA. Revisa la configuración de la API.")}finally{_e(!1)}},ie=e=>{const a=R.current;if(!a)return;const _=a.getContext("2d"),s=a.getBoundingClientRect(),l=(e.touches?e.touches[0].clientX:e.clientX)-s.left,c=(e.touches?e.touches[0].clientY:e.clientY)-s.top;_.beginPath(),_.moveTo(l,c),oe(!0)},ce=e=>{if(!ye)return;const a=R.current;if(!a)return;const _=a.getContext("2d"),s=a.getBoundingClientRect(),l=(e.touches?e.touches[0].clientX:e.clientX)-s.left,c=(e.touches?e.touches[0].clientY:e.clientY)-s.top;_.lineWidth=2,_.lineCap="round",_.strokeStyle="#1e293b",_.lineTo(l,c),_.stroke()},q=()=>{oe(!1)},Ue=()=>{const e=R.current;if(!e)return;e.getContext("2d").clearRect(0,0,e.width,e.height),T("")},Ve=()=>{const e=R.current;if(!e)return;const a=e.toDataURL("image/png");T(a),G(!1)},ze=async(e,a)=>{try{g(_=>_.map(s=>s.id===e?{...s,status:a}:s)),n==null||n("Estado actualizado","success")}catch(_){console.error("Error updating status:",_)}};return t.jsxs("div",{className:"space-y-4 animate-fade-in",children:[t.jsxs("div",{className:"flex items-center justify-between flex-wrap gap-3",children:[t.jsxs("h2",{className:"text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2",children:[t.jsx(be,{className:"w-6 h-6 text-blue-600"}),"Documentos"]}),$&&t.jsx("select",{className:"p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm",value:(r==null?void 0:r.id)||"",onChange:$e,children:i.map(e=>t.jsx("option",{value:e.id,children:e.name},e.id))})]}),!$&&t.jsx(k,{children:t.jsx("p",{className:"text-sm text-slate-600 dark:text-slate-400",children:"No hay clientes registrados todavía. Crea al menos un cliente para poder asociar contratos, pagarés u otros documentos."})}),$&&r&&t.jsxs(t.Fragment,{children:[t.jsx(k,{children:t.jsxs("div",{className:"flex flex-wrap gap-3 items-center",children:[t.jsxs("div",{className:"flex-1 min-w-[180px] relative",children:[t.jsx(He,{size:16,className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"}),t.jsx("input",{type:"text",placeholder:"Buscar documento...",value:D,onChange:e=>De(e.target.value),className:"w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm"})]}),t.jsxs("select",{value:j,onChange:e=>je(e.target.value),className:"p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm",children:[t.jsx("option",{value:"ALL",children:"Todas categorías"}),Q.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))]})]})}),t.jsxs(k,{children:[t.jsxs("h3",{className:"text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2",children:[t.jsx(Xe,{size:18,className:"text-blue-600"}),"Generar Documento"]}),t.jsx("p",{className:"text-sm text-slate-700 dark:text-slate-300 font-semibold mb-1",children:r.name}),r.idNumber&&t.jsxs("p",{className:"text-xs text-slate-500 dark:text-slate-400",children:["Cédula: ",r.idNumber]}),de.length>0&&t.jsxs("div",{className:"mt-3",children:[t.jsxs("label",{className:"block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1",children:[t.jsx(Ke,{size:12})," Asociar a préstamo (opcional)"]}),t.jsxs("select",{value:C,onChange:Pe,className:"w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm",children:[t.jsx("option",{value:"",children:"Sin préstamo asociado"}),de.map(e=>t.jsxs("option",{value:e.id,children:[I(e.amount)," - ",e.term," cuotas (",e.status,")"]},e.id))]}),S&&t.jsx("p",{className:"text-xs text-emerald-600 dark:text-emerald-400 mt-1",children:"✓ Los datos del préstamo se usarán para auto-llenar el documento"})]}),t.jsxs("div",{className:"mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs",children:[t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1",children:"Tipo de documento"}),t.jsx("select",{className:"w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200",value:p,onChange:Se,children:K.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1",children:"Estado inicial"}),t.jsx("select",{className:"w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200",value:ne,onChange:e=>Re(e.target.value),children:M.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1",children:"Firma digital"}),t.jsxs("button",{onClick:()=>G(!0),className:`w-full p-2 border rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${f?"border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300":"border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50"}`,children:[t.jsx(Ee,{size:14}),f?"✓ Firmado":"Agregar firma"]})]})]}),t.jsxs("div",{className:"mt-3",children:[t.jsx("label",{className:"block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1",children:"Contenido"}),t.jsx("textarea",{rows:8,className:"w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-xs bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200",value:N,onChange:e=>E(e.target.value),placeholder:"Escribe o genera el contenido del documento..."})]}),f&&t.jsxs("div",{className:"mt-2 flex items-center gap-2",children:[t.jsx("span",{className:"text-xs text-slate-500",children:"Firma adjunta:"}),t.jsx("img",{src:f,alt:"Firma",className:"h-8 border rounded"}),t.jsx("button",{onClick:()=>T(""),className:"text-rose-500 text-xs",children:"Quitar"})]}),t.jsxs("div",{className:"flex flex-wrap gap-2 justify-end mt-3",children:[t.jsx("button",{type:"button",onClick:Le,className:"px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-600",children:"Usar plantilla"}),t.jsxs("button",{type:"button",onClick:()=>{var e;return U({content:N,title:(e=K.find(a=>a.value===p))==null?void 0:e.label})},disabled:!N.trim(),className:"px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-xs hover:bg-blue-200 disabled:opacity-50 flex items-center gap-1",children:[t.jsx(fe,{size:12})," Vista previa"]}),t.jsx("button",{type:"button",onClick:Ge,disabled:ae,className:"px-3 py-1.5 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white font-semibold text-xs disabled:opacity-60 hover:bg-indigo-500",children:ae?"Generando con IA...":"Generar con IA"}),t.jsx("button",{type:"button",onClick:we,className:"px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-semibold text-xs hover:bg-slate-800",children:"Guardar documento"})]})]}),t.jsxs(k,{children:[t.jsx("h3",{className:"font-bold text-sm text-slate-700 dark:text-slate-300 mb-2",children:"Subir archivo (cédula, comprobante, etc.)"}),t.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3 text-xs",children:[t.jsx("div",{className:"md:col-span-2",children:t.jsx("input",{type:"text",className:"w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200",value:ee,onChange:e=>te(e.target.value),placeholder:"Descripción del documento"})}),t.jsxs("div",{className:"relative",children:[t.jsxs("label",{className:"flex items-center gap-2 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",children:[t.jsx("span",{className:"bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded text-xs font-semibold",children:"Elegir archivo"}),t.jsx("input",{type:"file",accept:"image/*,application/pdf",onChange:Te,disabled:se,className:"hidden"})]}),se&&t.jsx("div",{className:"absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-lg",children:t.jsx("span",{className:"text-xs font-bold text-blue-600 animate-pulse",children:"Subiendo..."})})]})]})]}),t.jsxs(k,{children:[t.jsxs("h3",{className:"font-bold text-sm text-slate-700 dark:text-slate-300 mb-3",children:["Documentos guardados (",V.length,")"]}),ve?t.jsx("p",{className:"text-xs text-slate-400",children:"Cargando..."}):V.length===0?t.jsx("p",{className:"text-xs text-slate-500",children:D||j!=="ALL"?"No se encontraron documentos con los filtros aplicados.":"Aún no hay documentos guardados para este cliente."}):t.jsx("ul",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs",children:V.map(e=>{var a,_;return t.jsxs("li",{className:"flex flex-col bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",children:[t.jsx("div",{className:"w-full h-20 flex-shrink-0 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-600 mb-2",children:e.dataUrl&&(e.mimeType?e.mimeType.startsWith("image/"):e.dataUrl.startsWith("data:image"))?t.jsx("img",{src:e.dataUrl,alt:e.title||"Documento",className:"w-full h-full object-cover"}):t.jsx(be,{size:24,className:"text-slate-400"})}),t.jsxs("div",{className:"flex-1",children:[t.jsx("p",{className:"font-bold text-slate-800 dark:text-slate-200 text-xs truncate",title:e.title,children:e.title||e.type||"Documento"}),t.jsxs("div",{className:"flex flex-wrap gap-1 mt-1",children:[e.category&&t.jsx("span",{className:`text-[10px] px-1.5 py-0.5 rounded ${et(e.category)}`,children:((a=Q.find(s=>s.value===e.category))==null?void 0:a.label)||e.category}),e.status&&t.jsx("span",{className:`text-[10px] px-1.5 py-0.5 rounded ${tt(e.status)}`,children:((_=M.find(s=>s.value===e.status))==null?void 0:_.label)||e.status})]}),e.createdAt&&t.jsx("p",{className:"text-[10px] text-slate-500 dark:text-slate-400 mt-1",children:new Date(e.createdAt).toLocaleDateString("es-DO")})]}),t.jsxs("div",{className:"flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700",children:[t.jsxs("button",{type:"button",onClick:()=>{if(e.dataUrl){const s=document.createElement("a");s.href=e.dataUrl,s.download=`${(e.fileName||e.title||"documento").replace(/\s+/g,"_")}`,s.click()}else Me(e)},className:"text-blue-600 dark:text-blue-400 hover:text-blue-800 font-semibold flex items-center gap-1",children:[t.jsx(Ne,{size:12})," Descargar"]}),t.jsx("select",{value:e.status||"PENDING",onChange:s=>ze(e.id,s.target.value),className:"text-[10px] p-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900/50",children:M.map(s=>t.jsx("option",{value:s.value,children:s.label},s.value))}),t.jsx("button",{type:"button",onClick:()=>F(e),className:"ml-auto text-red-500 hover:text-red-700",title:"Eliminar",children:t.jsx(Qe,{size:14})})]})]},e.id)})})]})]}),Oe&&t.jsx("div",{className:"fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4",children:t.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fade-in",children:[t.jsxs("div",{className:"flex items-center justify-between mb-4",children:[t.jsxs("h3",{className:"text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2",children:[t.jsx(Ee,{size:20,className:"text-blue-600"}),"Firma Digital"]}),t.jsx("button",{onClick:()=>G(!1),className:"text-slate-400 hover:text-slate-600",children:t.jsx(ge,{size:20})})]}),t.jsx("p",{className:"text-xs text-slate-500 mb-3",children:"Dibuja tu firma con el mouse o dedo"}),t.jsx("canvas",{ref:R,width:350,height:150,className:"w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-white cursor-crosshair touch-none",onMouseDown:ie,onMouseMove:ce,onMouseUp:q,onMouseLeave:q,onTouchStart:ie,onTouchMove:ce,onTouchEnd:q}),t.jsxs("div",{className:"flex gap-2 mt-4",children:[t.jsx("button",{onClick:Ue,className:"flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm",children:"Limpiar"}),t.jsx("button",{onClick:Ve,className:"flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500",children:"Guardar Firma"})]})]})}),O&&t.jsx("div",{className:"fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4",children:t.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-fade-in",children:[t.jsxs("div",{className:"flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700",children:[t.jsxs("h3",{className:"text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2",children:[t.jsx(fe,{size:20,className:"text-blue-600"}),"Vista Previa: ",O.title]}),t.jsx("button",{onClick:()=>U(null),className:"text-slate-400 hover:text-slate-600",children:t.jsx(ge,{size:20})})]}),t.jsxs("div",{className:"p-6 overflow-y-auto max-h-[60vh] bg-white",children:[t.jsx("pre",{className:"whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed",children:O.content}),f&&t.jsxs("div",{className:"mt-4 pt-4 border-t",children:[t.jsx("p",{className:"text-xs text-slate-500 mb-2",children:"Firma:"}),t.jsx("img",{src:f,alt:"Firma",className:"h-16 border rounded"})]})]}),t.jsxs("div",{className:"p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end",children:[t.jsx("button",{onClick:()=>U(null),className:"px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm",children:"Cerrar"}),t.jsxs("button",{onClick:()=>{he(O.title,O.content)},className:"px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 flex items-center gap-2",children:[t.jsx(Ne,{size:14})," Imprimir PDF"]})]})]})}),t.jsx(Ye,{isOpen:!!h,onClose:()=>F(null),onConfirm:()=>Ie(h==null?void 0:h.id),title:"¿Eliminar documento?",message:`¿Estás seguro de que deseas eliminar "${(h==null?void 0:h.title)||"este documento"}"? Esta acción no se puede deshacer.`,confirmText:"Eliminar",cancelText:"Cancelar",variant:"danger"})]})},mt=at;export{mt as DocumentsView};
