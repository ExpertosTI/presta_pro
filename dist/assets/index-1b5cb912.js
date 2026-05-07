import{y as Ce,z as J,u as t,F as be,C as k,v as $,T as Qe,X as ge,r as he,$ as fe,x as Xe}from"./index-22f148fe.js";import{r as n}from"./vendor-8a332d8f.js";import{C as We}from"./ConfirmDialog-c906424d.js";import{S as Je}from"./search-7e3d3d2a.js";import{C as Ke}from"./credit-card-9ac1e29d.js";import{E as Ne}from"./eye-1023e5f3.js";import{D as Ee}from"./download-2f879eef.js";import"./triangle-alert-315b537b.js";/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ze=[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]],Ae=Ce("folder-open",Ze);/**
 * @license lucide-react v1.8.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const et=[["path",{d:"M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z",key:"nt11vn"}],["path",{d:"m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18",key:"15qc1e"}],["path",{d:"m2.3 2.3 7.286 7.286",key:"1wuzzi"}],["circle",{cx:"11",cy:"11",r:"2",key:"xmgehs"}]],ve=Ce("pen-tool",et),tt=async d=>await J.get(`/clients/${d}/documents`),at=async(d,i)=>await J.post(`/clients/${d}/documents`,i),_t=async d=>await J.delete(`/clients/documents/${d}`),w={getClientDocuments:tt,addDocument:at,deleteDocument:_t},W=[{value:"LEGAL",label:"Legal",color:"blue"},{value:"GARANTIA",label:"Garantía",color:"amber"},{value:"COBROS",label:"Cobros",color:"rose"},{value:"IDENTIFICACION",label:"Identificación",color:"violet"},{value:"OTRO",label:"Otro",color:"slate"}],M=[{value:"PENDING",label:"Pendiente",color:"amber"},{value:"SIGNED",label:"Firmado",color:"emerald"},{value:"DELIVERED",label:"Entregado",color:"blue"},{value:"ARCHIVED",label:"Archivado",color:"slate"}],X=[{value:"CONTRACT_SIMPLE",label:"Contrato Simple",category:"LEGAL"},{value:"PAGARE_SIMPLE",label:"Pagaré Simple",category:"LEGAL"},{value:"PAGARE_NOTARIAL",label:"Pagaré Notarial",category:"LEGAL"},{value:"CARTA_COBRO",label:"Carta de Cobro",category:"COBROS"},{value:"CARTA_RUTA",label:"Carta Ruta",category:"COBROS"},{value:"CARTA_SALDO",label:"Carta Saldo",category:"COBROS"},{value:"CERTIFICADO_VENTA",label:"Certificado Venta Condicional",category:"GARANTIA"},{value:"CONTRATO_INMUEBLE",label:"Contrato Venta Condicional Inmueble",category:"GARANTIA"},{value:"ENTREGA_VOLUNTARIA",label:"Entrega Voluntaria",category:"GARANTIA"},{value:"OTRO",label:"Otro / Personalizado",category:"OTRO"}],st=d=>{const i=W.find(v=>v.value===d),c=(i==null?void 0:i.color)||"slate";return`bg-${c}-100 dark:bg-${c}-900/30 text-${c}-700 dark:text-${c}-300`},rt=d=>{const i=M.find(v=>v.value===d),c=(i==null?void 0:i.color)||"slate";return`bg-${c}-100 dark:bg-${c}-900/30 text-${c}-700 dark:text-${c}-300`},lt=({clients:d,loans:i=[],companyName:c="ReBless",selectedClientId:v,onSelectClient:K,showToast:o})=>{const S=Array.isArray(d)&&d.length>0,r=S?d.find(e=>e.id===v)||d[0]:null,[Z,b]=n.useState([]),[De,ee]=n.useState(!1),[te,ae]=n.useState(""),[g,je]=n.useState("CONTRACT_SIMPLE"),[N,E]=n.useState(""),[_e,se]=n.useState(!1),[re,le]=n.useState(!1),[h,F]=n.useState(null),[C,ne]=n.useState(""),[D,Re]=n.useState(""),[j,ye]=n.useState("ALL"),[oe,Oe]=n.useState("PENDING"),[ke,G]=n.useState(!1),[f,T]=n.useState(""),R=n.useRef(null),[$e,ie]=n.useState(!1),[y,U]=n.useState(null),de=n.useMemo(()=>r!=null&&r.id?i.filter(e=>e.clientId===r.id):[],[i,r]),L=n.useMemo(()=>C?i.find(e=>e.id===C):null,[i,C]);n.useEffect(()=>{r!=null&&r.id?Se(r.id):b([])},[r==null?void 0:r.id]);const V=n.useMemo(()=>{let e=[...Z];if(D.trim()){const a=D.toLowerCase();e=e.filter(_=>(_.title||"").toLowerCase().includes(a)||(_.type||"").toLowerCase().includes(a))}return j!=="ALL"&&(e=e.filter(a=>a.category===j)),e},[Z,D,j]),Se=async e=>{ee(!0);try{const a=await w.getClientDocuments(e);b(Array.isArray(a)?a:[])}catch(a){console.error("Error loading documents:",a),b([])}finally{ee(!1)}},Te=async e=>{try{await w.deleteDocument(e),b(a=>a.filter(_=>_.id!==e)),o==null||o("Documento eliminado","success")}catch(a){console.error("Error deleting document:",a),o==null||o("Error al eliminar documento","error")}F(null)},Le=e=>{const a=e.target.value||null;K&&K(a),ne("")},Ie=async e=>{const a=e.target.files&&e.target.files[0];if(!(!a||!r)){le(!0);try{const{fileToBase64:_}=await fe(()=>import("./imageUtils-542d258e.js"),[],import.meta.url),s=await _(a),l=te.trim()||a.name,u=await w.addDocument(r.id,{type:"UPLOAD",title:l,fileName:a.name,mimeType:a.type,dataUrl:s,category:"IDENTIFICACION",status:"PENDING"});b(I=>[u,...I]),ae(""),o==null||o("Documento subido exitosamente","success")}catch(_){console.error("Error uploading client document",_),o==null||o("Error al subir documento","error")}finally{le(!1),e.target.value=""}}},z=(e,a,_)=>{var xe,pe;const s=(a==null?void 0:a.name)||"__________________",l=(a==null?void 0:a.idNumber)||"__________________",u=(a==null?void 0:a.address)||"__________________",I=(a==null?void 0:a.phone)||"__________________",x=c||"ReBless",m=new Date().toLocaleDateString("es-DO"),p=_?$(_.amount):"__________________",Y=_?`${_.rate}%`:"____%",O=_?`${_.term} cuotas`:"____ cuotas",H=(_==null?void 0:_.frequency)||"Mensual",Q=_!=null&&_.startDate?Xe(_.startDate):m,A=_&&((xe=_.schedule)!=null&&xe[0])?$(_.schedule[0].payment):"__________________",me=(_==null?void 0:_.totalPaid)||0,He=_?parseFloat(_.amount)*(1+parseFloat(_.rate)/100):0,P=$(He-me);switch(e){case"PAGARE_SIMPLE":return`PAGARÉ SIMPLE

Yo, ${s}, con cédula de identidad No. ${l}, domiciliado en ${u}, declaro que debo a ${x} la suma de ${p}, que me comprometo a pagar en ${O} con frecuencia ${H}.

Cuota: ${A}
Tasa de interés: ${Y}
Fecha inicio: ${Q}

Lugar y fecha: ${m}

Firma del deudor: _________________________
Cédula: ${l}`;case"PAGARE_NOTARIAL":return`PAGARÉ NOTARIAL
(Artículo 1326 del Código Civil)

En la ciudad de _____________, a los ${m}

Por este PAGARÉ NOTARIAL, yo ${s}, mayor de edad, dominicano/a, con cédula de identidad y electoral No. ${l}, domiciliado/a en ${u}, teléfono ${I},

ME OBLIGO incondicionalmente a pagar a la orden de ${x} o a quien sus derechos represente, la suma de ${p} (______________________ PESOS DOMINICANOS), valor recibido a mi entera satisfacción.

FORMA DE PAGO: ${O} de ${A} cada una con frecuencia ${H}, comenzando el día ${Q}.

INTERÉS: Se cobrará interés del ${Y} sobre el capital.

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

Préstamo: ${p}
Saldo pendiente: ${P}

Favor pasar por la oficina o contactar a su cobrador para regularizar su situación.

Atentamente,
${x}
_______________________`;case"CARTA_RUTA":return`CARTA RUTA
${x}

Fecha: ${m}
Cobrador: ____________________

CLIENTE: ${s}
Dirección: ${u}
Teléfono: ${I}

PRÉSTAMO #: ${((pe=_==null?void 0:_.id)==null?void 0:pe.slice(0,8))||"________"}
Monto original: ${p}
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

Préstamo original: ${p}
Total pagado: ${$(me)}
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

Por un precio de ${p}, pagadero en ${O} de ${A}.

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
${s}, cédula No. ${l}, domiciliado en ${u},
Denominado en lo adelante "EL COMPRADOR"

SE HA CONVENIDO Y PACTADO LO SIGUIENTE:

PRIMERO: EL VENDEDOR vende a EL COMPRADOR, quien acepta, el inmueble ubicado en:
_____________________________________________
Certificado de Título No.: ____________________

SEGUNDO: El precio convenido es de ${p}, pagadero en ${O} de ${A}.

TERCERO: La transferencia de la propiedad queda condicionada al pago total del precio.

CUARTO: EL COMPRADOR se obliga a mantener el inmueble en buen estado.

QUINTO: En caso de incumplimiento, EL VENDEDOR podrá declarar resuelto este contrato.

Firma EL VENDEDOR: _____________________
Firma EL COMPRADOR: _____________________
Fecha: ${m}`;case"ENTREGA_VOLUNTARIA":return`ACTA DE ENTREGA VOLUNTARIA

En la ciudad de _____________, a los ${m}

Yo, ${s}, con cédula No. ${l}, domiciliado en ${u},

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

Entre ${x} (PRESTAMISTA) y ${s} (PRESTATARIO), cédula No. ${l}, domiciliado en ${u}, se acuerda:

PRIMERO: EL PRESTAMISTA entrega en préstamo al PRESTATARIO la suma de ${p}.

SEGUNDO: EL PRESTATARIO se compromete a pagar en ${O} de ${A} cada una, con frecuencia ${H}.

TERCERO: La tasa de interés es de ${Y}.

CUARTO: El primer pago se realizará el día ${Q}.

QUINTO: En caso de mora, se aplicará un recargo de ___% sobre la cuota vencida.

Firma PRESTAMISTA: ______________________
Firma PRESTATARIO: ______________________
Fecha: ${m}`}},Pe=e=>{const a=e.target.value;je(a),E(z(a,r,L))},we=()=>{r&&E(z(g,r,L))},Me=e=>{const a=e.target.value;ne(a);const _=i.find(s=>s.id===a);_&&r&&E(z(g,r,_))},Fe=async()=>{if(!r||!N||!N.trim())return;const e=X.find(s=>s.value===g),a=(e==null?void 0:e.label)||"Documento",_=(e==null?void 0:e.category)||"OTRO";try{const s=await w.addDocument(r.id,{type:g,title:a,content:N,category:_,status:oe,loanId:C||null,signatureDataUrl:f||null});b(l=>[s,...l]),E(""),T(""),o==null||o("Documento guardado","success")}catch(s){console.error("Error saving template:",s),o==null||o("Error al guardar documento","error")}},Ge=e=>{const a=(e==null?void 0:e.content)||"";a.trim()&&he(e.title||"Documento",a)},Ue=e=>{if(!e||!Array.isArray(i)||i.length===0)return null;const a=i.filter(_=>_.clientId===e);return a.length===0?null:a.slice().sort((_,s)=>{const l=new Date(_.createdAt||_.startDate||0).getTime();return new Date(s.createdAt||s.startDate||0).getTime()-l})[0]},Ve=async()=>{if(r){se(!0);try{const{generateClientDocument:e}=await fe(()=>import("./index-22f148fe.js").then(l=>l.ad),["./index-22f148fe.js","./vendor-8a332d8f.js","./index-294c84dc.css"],import.meta.url),a=L||Ue(r.id),s=await e(g,r,a,c||"ReBless");s&&typeof s=="string"&&E(s.trim())}catch(e){console.error("Error generating document with AI",e),alert("No se pudo generar el documento con IA. Revisa la configuración de la API.")}finally{se(!1)}}},ce=e=>{const a=R.current;if(!a)return;const _=a.getContext("2d"),s=a.getBoundingClientRect(),l=(e.touches?e.touches[0].clientX:e.clientX)-s.left,u=(e.touches?e.touches[0].clientY:e.clientY)-s.top;_.beginPath(),_.moveTo(l,u),ie(!0)},ue=e=>{if(!$e)return;const a=R.current;if(!a)return;const _=a.getContext("2d"),s=a.getBoundingClientRect(),l=(e.touches?e.touches[0].clientX:e.clientX)-s.left,u=(e.touches?e.touches[0].clientY:e.clientY)-s.top;_.lineWidth=2,_.lineCap="round",_.strokeStyle="#1e293b",_.lineTo(l,u),_.stroke()},q=()=>{ie(!1)},ze=()=>{const e=R.current;if(!e)return;e.getContext("2d").clearRect(0,0,e.width,e.height),T("")},qe=()=>{const e=R.current;if(!e)return;const a=e.toDataURL("image/png");T(a),G(!1)},Be=async(e,a)=>{try{b(_=>_.map(s=>s.id===e?{...s,status:a}:s)),o==null||o("Estado actualizado","success")}catch(_){console.error("Error updating status:",_)}},[B,Ye]=n.useState(!1);return t.jsxs("div",{className:"space-y-3 sm:space-y-4 animate-fade-in",children:[t.jsxs("div",{className:"flex items-center justify-between flex-wrap gap-3",children:[t.jsxs("h2",{className:"text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2",children:[t.jsx(be,{className:"w-5 h-5 sm:w-6 sm:h-6 text-blue-600"}),"Documentos"]}),S&&t.jsx("select",{className:"p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm min-h-[44px] touch-manipulation",value:(r==null?void 0:r.id)||"",onChange:Le,children:d.map(e=>t.jsx("option",{value:e.id,children:e.name},e.id))})]}),!S&&t.jsx(k,{children:t.jsx("p",{className:"text-sm text-slate-600 dark:text-slate-400",children:"No hay clientes registrados todavía. Crea al menos un cliente para poder asociar contratos, pagarés u otros documentos."})}),S&&r&&t.jsxs(t.Fragment,{children:[t.jsx(k,{children:t.jsxs("div",{className:"flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center",children:[t.jsxs("div",{className:"flex-1 relative",children:[t.jsx(Je,{size:16,className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"}),t.jsx("input",{type:"text",placeholder:"Buscar documento...",value:D,onChange:e=>Re(e.target.value),className:"w-full pl-9 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm min-h-[44px]"})]}),t.jsxs("div",{className:"flex gap-2",children:[t.jsxs("select",{value:j,onChange:e=>ye(e.target.value),className:"flex-1 sm:flex-none p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm min-h-[44px] touch-manipulation",children:[t.jsx("option",{value:"ALL",children:"Todas"}),W.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))]}),t.jsxs("button",{onClick:()=>Ye(!B),className:`px-3 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] touch-manipulation transition-colors flex items-center gap-1.5 ${B?"bg-blue-600 text-white":"bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"}`,children:[t.jsx(Ae,{size:16}),t.jsx("span",{className:"hidden sm:inline",children:"Generar"})]})]})]})}),B&&t.jsxs(k,{children:[t.jsxs("h3",{className:"text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2",children:[t.jsx(Ae,{size:18,className:"text-blue-600"}),"Generar Documento"]}),t.jsx("p",{className:"text-sm text-slate-700 dark:text-slate-300 font-semibold mb-1",children:r.name}),r.idNumber&&t.jsxs("p",{className:"text-xs text-slate-500 dark:text-slate-400",children:["Cédula: ",r.idNumber]}),de.length>0&&t.jsxs("div",{className:"mt-3",children:[t.jsxs("label",{className:"text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1",children:[t.jsx(Ke,{size:12})," Asociar a préstamo (opcional)"]}),t.jsxs("select",{value:C,onChange:Me,className:"w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-sm",children:[t.jsx("option",{value:"",children:"Sin préstamo asociado"}),de.map(e=>t.jsxs("option",{value:e.id,children:[$(e.amount)," - ",e.term," cuotas (",e.status,")"]},e.id))]}),L&&t.jsx("p",{className:"text-xs text-emerald-600 dark:text-emerald-400 mt-1",children:"✓ Los datos del préstamo se usarán para auto-llenar el documento"})]}),t.jsxs("div",{className:"mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs",children:[t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1",children:"Tipo de documento"}),t.jsx("select",{className:"w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200",value:g,onChange:Pe,children:X.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1",children:"Estado inicial"}),t.jsx("select",{className:"w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200",value:oe,onChange:e=>Oe(e.target.value),children:M.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))})]}),t.jsxs("div",{children:[t.jsx("label",{className:"block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1",children:"Firma digital"}),t.jsxs("button",{onClick:()=>G(!0),className:`w-full p-2 border rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${f?"border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300":"border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-50"}`,children:[t.jsx(ve,{size:14}),f?"✓ Firmado":"Agregar firma"]})]})]}),t.jsxs("div",{className:"mt-3",children:[t.jsx("label",{className:"block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1",children:"Contenido"}),t.jsx("textarea",{rows:8,className:"w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-xs bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200",value:N,onChange:e=>E(e.target.value),placeholder:"Escribe o genera el contenido del documento..."})]}),f&&t.jsxs("div",{className:"mt-2 flex items-center gap-2",children:[t.jsx("span",{className:"text-xs text-slate-500",children:"Firma adjunta:"}),t.jsx("img",{src:f,alt:"Firma",className:"h-8 border rounded"}),t.jsx("button",{onClick:()=>T(""),className:"text-rose-500 text-xs",children:"Quitar"})]}),t.jsxs("div",{className:"grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:justify-end mt-3",children:[t.jsx("button",{type:"button",onClick:we,className:"px-3 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-600 min-h-[44px] touch-manipulation",children:"Usar plantilla"}),t.jsxs("button",{type:"button",onClick:()=>{var e;return U({content:N,title:(e=X.find(a=>a.value===g))==null?void 0:e.label})},disabled:!N.trim(),className:"px-3 py-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-xs hover:bg-blue-200 disabled:opacity-50 flex items-center justify-center gap-1 min-h-[44px] touch-manipulation",children:[t.jsx(Ne,{size:12})," Vista previa"]}),t.jsx("button",{type:"button",onClick:Ve,disabled:_e,className:"px-3 py-2.5 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white font-semibold text-xs disabled:opacity-60 hover:bg-indigo-500 min-h-[44px] touch-manipulation",children:_e?"Generando...":"Generar con IA"}),t.jsx("button",{type:"button",onClick:Fe,className:"px-3 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-semibold text-xs hover:bg-slate-800 min-h-[44px] touch-manipulation",children:"Guardar"})]})]}),t.jsxs(k,{children:[t.jsx("h3",{className:"font-bold text-sm text-slate-700 dark:text-slate-300 mb-2",children:"Subir archivo"}),t.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs",children:[t.jsx("div",{className:"sm:col-span-2",children:t.jsx("input",{type:"text",className:"w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200",value:te,onChange:e=>ae(e.target.value),placeholder:"Descripción del documento"})}),t.jsxs("div",{className:"relative",children:[t.jsxs("label",{className:"flex items-center gap-2 w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",children:[t.jsx("span",{className:"bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded text-xs font-semibold",children:"Elegir archivo"}),t.jsx("input",{type:"file",accept:"image/*,application/pdf",onChange:Ie,disabled:re,className:"hidden"})]}),re&&t.jsx("div",{className:"absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-lg",children:t.jsx("span",{className:"text-xs font-bold text-blue-600 animate-pulse",children:"Subiendo..."})})]})]})]}),t.jsxs(k,{children:[t.jsxs("h3",{className:"font-bold text-sm text-slate-700 dark:text-slate-300 mb-3",children:["Documentos guardados (",V.length,")"]}),De?t.jsx("p",{className:"text-xs text-slate-400",children:"Cargando..."}):V.length===0?t.jsx("p",{className:"text-xs text-slate-500",children:D||j!=="ALL"?"No se encontraron documentos con los filtros aplicados.":"Aún no hay documentos guardados para este cliente."}):t.jsx("ul",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-xs",children:V.map(e=>{var a,_;return t.jsxs("li",{className:"flex flex-col bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",children:[t.jsx("div",{className:"w-full h-20 flex-shrink-0 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-600 mb-2",children:e.dataUrl&&(e.mimeType?e.mimeType.startsWith("image/"):e.dataUrl.startsWith("data:image"))?t.jsx("img",{src:e.dataUrl,alt:e.title||"Documento",className:"w-full h-full object-cover"}):t.jsx(be,{size:24,className:"text-slate-400"})}),t.jsxs("div",{className:"flex-1",children:[t.jsx("p",{className:"font-bold text-slate-800 dark:text-slate-200 text-xs truncate",title:e.title,children:e.title||e.type||"Documento"}),t.jsxs("div",{className:"flex flex-wrap gap-1 mt-1",children:[e.category&&t.jsx("span",{className:`text-[10px] px-1.5 py-0.5 rounded ${st(e.category)}`,children:((a=W.find(s=>s.value===e.category))==null?void 0:a.label)||e.category}),e.status&&t.jsx("span",{className:`text-[10px] px-1.5 py-0.5 rounded ${rt(e.status)}`,children:((_=M.find(s=>s.value===e.status))==null?void 0:_.label)||e.status})]}),e.createdAt&&t.jsx("p",{className:"text-[10px] text-slate-500 dark:text-slate-400 mt-1",children:new Date(e.createdAt).toLocaleDateString("es-DO")})]}),t.jsxs("div",{className:"flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700",children:[t.jsxs("button",{type:"button",onClick:()=>{if(e.dataUrl){const s=document.createElement("a");s.href=e.dataUrl,s.download=`${(e.fileName||e.title||"documento").replace(/\s+/g,"_")}`,s.click()}else Ge(e)},className:"text-blue-600 dark:text-blue-400 active:text-blue-800 font-semibold flex items-center gap-1 p-1.5 rounded-lg touch-manipulation min-h-[36px]",children:[t.jsx(Ee,{size:14})," Descargar"]}),t.jsx("select",{value:e.status||"PENDING",onChange:s=>Be(e.id,s.target.value),className:"text-[10px] p-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900/50 min-h-[36px] touch-manipulation",children:M.map(s=>t.jsx("option",{value:s.value,children:s.label},s.value))}),t.jsx("button",{type:"button",onClick:()=>F(e),className:"ml-auto text-red-500 active:text-red-700 p-1.5 rounded-lg touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center",title:"Eliminar",children:t.jsx(Qe,{size:16})})]})]},e.id)})})]})]}),ke&&t.jsx("div",{className:"fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4",children:t.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fade-in",children:[t.jsxs("div",{className:"flex items-center justify-between mb-4",children:[t.jsxs("h3",{className:"text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2",children:[t.jsx(ve,{size:20,className:"text-blue-600"}),"Firma Digital"]}),t.jsx("button",{onClick:()=>G(!1),className:"text-slate-400 hover:text-slate-600",children:t.jsx(ge,{size:20})})]}),t.jsx("p",{className:"text-xs text-slate-500 mb-3",children:"Dibuja tu firma con el mouse o dedo"}),t.jsx("canvas",{ref:R,width:350,height:150,className:"w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-white cursor-crosshair touch-none",onMouseDown:ce,onMouseMove:ue,onMouseUp:q,onMouseLeave:q,onTouchStart:ce,onTouchMove:ue,onTouchEnd:q}),t.jsxs("div",{className:"flex gap-2 mt-4",children:[t.jsx("button",{onClick:ze,className:"flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm",children:"Limpiar"}),t.jsx("button",{onClick:qe,className:"flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500",children:"Guardar Firma"})]})]})}),y&&t.jsx("div",{className:"fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4",children:t.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-fade-in",children:[t.jsxs("div",{className:"flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700",children:[t.jsxs("h3",{className:"text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2",children:[t.jsx(Ne,{size:20,className:"text-blue-600"}),"Vista Previa: ",y.title]}),t.jsx("button",{onClick:()=>U(null),className:"text-slate-400 hover:text-slate-600",children:t.jsx(ge,{size:20})})]}),t.jsxs("div",{className:"p-6 overflow-y-auto max-h-[60vh] bg-white",children:[t.jsx("pre",{className:"whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed",children:y.content}),f&&t.jsxs("div",{className:"mt-4 pt-4 border-t",children:[t.jsx("p",{className:"text-xs text-slate-500 mb-2",children:"Firma:"}),t.jsx("img",{src:f,alt:"Firma",className:"h-16 border rounded"})]})]}),t.jsxs("div",{className:"p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end",children:[t.jsx("button",{onClick:()=>U(null),className:"px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm",children:"Cerrar"}),t.jsxs("button",{onClick:()=>{he(y.title,y.content)},className:"px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 flex items-center gap-2",children:[t.jsx(Ee,{size:14})," Imprimir PDF"]})]})]})}),t.jsx(We,{isOpen:!!h,onClose:()=>F(null),onConfirm:()=>Te(h==null?void 0:h.id),title:"¿Eliminar documento?",message:`¿Estás seguro de que deseas eliminar "${(h==null?void 0:h.title)||"este documento"}"? Esta acción no se puede deshacer.`,confirmText:"Eliminar",cancelText:"Cancelar",variant:"danger"})]})},pt=lt;export{pt as DocumentsView};
