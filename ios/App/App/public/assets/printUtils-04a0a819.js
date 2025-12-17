const A=(t,c)=>{const i=document.createElement("iframe");i.style.position="fixed",i.style.right="0",i.style.bottom="0",i.style.width="0",i.style.height="0",i.style.border="0",document.body.appendChild(i);const a=i.contentWindow.document;(c||"").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/&lt;/g,"<").replace(/&gt;/g,">"),a.open(),a.write(`
    <html>
      <head>
        <title>${t}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #000; }
          pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 13px; }
          h1 { text-align: center; margin-bottom: 24px; font-size: 20px; text-transform: uppercase; }
          
          @media print {
             body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${c.includes("<")?c:`<h1>${t}</h1><pre>${c}</pre>`}
      </body>
    </html>
  `),a.close(),i.contentWindow.addEventListener("load",()=>{setTimeout(()=>{try{i.contentWindow.focus(),i.contentWindow.print()}catch(m){console.error("Print failed",m),alert("No se pudo iniciar la impresión. Intente nuevamente.")}finally{setTimeout(()=>{document.body.removeChild(i)},6e4)}},500)}),i.contentWindow.document.readyState==="complete"&&i.contentWindow.dispatchEvent(new Event("load"))},E=(t,c={})=>{if(!t)return;const{companyName:i="Presta Pro",isCopy:a=!1}=c,m=p=>new Intl.NumberFormat("es-DO",{style:"currency",currency:"DOP"}).format(p||0),f=p=>new Date(p).toLocaleDateString("es-DO",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}),u=parseFloat(t.amount||0),s=parseFloat(t.penaltyAmount||t.penalty||0),n=u+s,g=`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ticket${a?" (COPIA)":""}</title>
    <style>
        @page { size: 58mm auto; margin: 1mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            font-size: 9px;
            line-height: 1.2;
            width: 54mm;
            max-width: 54mm;
            color: #000;
            background: #fff;
            padding: 2mm;
        }
        .copy-banner {
            text-align: center;
            font-weight: bold;
            border: 2px solid #000;
            padding: 3px;
            margin-bottom: 4px;
            font-size: 11px;
        }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
        .company-name { font-size: 12px; font-weight: bold; }
        .receipt-title { font-size: 9px; font-weight: bold; margin: 2px 0; }
        .receipt-ref, .receipt-date { font-size: 7px; color: #333; }
        .divider { border-top: 1px dashed #000; margin: 3px 0; }
        .section { margin: 3px 0; }
        .section-title { font-weight: bold; font-size: 8px; margin-bottom: 1px; }
        .line { display: flex; justify-content: space-between; padding: 1px 0; font-size: 8px; }
        .line-amount { font-weight: bold; }
        .penalty { color: #c00; }
        .total-section {
            text-align: center;
            padding: 4px 0;
            margin: 4px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
        }
        .total-label { font-size: 8px; }
        .total-amount { font-size: 14px; font-weight: bold; margin: 2px 0; }
        .payment-type { font-size: 8px; font-weight: bold; }
        .footer { text-align: center; margin-top: 4px; padding-top: 3px; border-top: 1px dashed #000; font-size: 7px; }
        .footer-thanks { font-weight: bold; }
        @media print {
            body { width: 54mm !important; max-width: 54mm !important; }
        }
    </style>
</head>
<body>
    ${a?'<div class="copy-banner">*** COPIA ***</div>':""}
    
    <div class="header">
        <div class="company-name">${i}</div>
        <div class="receipt-title">COMPROBANTE DE PAGO${a?" (REIMPRESO)":""}</div>
        <div class="receipt-ref">Ref: ${(t.id||"").slice(-8).toUpperCase()}</div>
        <div class="receipt-date">${f(t.date||new Date)}</div>
    </div>
    
    <div class="section">
        <div class="section-title">CLIENTE</div>
        <div>${t.clientName||"Cliente"}</div>
        ${t.clientPhone?`<div style="font-size:7px;">${t.clientPhone}</div>`:""}
    </div>

    <div class="divider"></div>
    
    <div class="section">
        <div class="section-title">DETALLE</div>
        <div class="line">
            <span>Cuota #${t.installmentNumber||t.number||1}</span>
            <span class="line-amount">${m(u)}</span>
        </div>
        ${s>0?`
        <div class="line penalty">
            <span>Mora</span>
            <span class="line-amount">${m(s)}</span>
        </div>
        `:""}
        ${t.remainingBalance!==void 0?`
        <div class="line">
            <span>Saldo Pendiente</span>
            <span class="line-amount">${m(t.remainingBalance)}</span>
        </div>
        `:""}
    </div>
    
    <div class="total-section">
        <div class="total-label">TOTAL PAGADO</div>
        <div class="total-amount">${m(n)}</div>
        <div class="payment-type">PAGO DE PRÉSTAMO</div>
    </div>
    
    <div class="footer">
        <div class="footer-thanks">¡Gracias por su pago!</div>
        <div>Conserve este comprobante</div>
    </div>
</body>
</html>
    `.trim(),o=document.createElement("iframe");o.style.position="fixed",o.style.right="0",o.style.bottom="0",o.style.width="0",o.style.height="0",o.style.border="0",document.body.appendChild(o);const r=o.contentWindow.document;r.open(),r.write(g),r.close(),o.contentWindow.addEventListener("load",()=>{setTimeout(()=>{try{o.contentWindow.focus(),o.contentWindow.print()}catch(p){console.error("Print ticket failed",p)}finally{setTimeout(()=>{document.body.removeChild(o)},6e4)}},500)}),o.contentWindow.document.readyState==="complete"&&o.contentWindow.dispatchEvent(new Event("load"))},D=(t,c={})=>{if(!t)return;const{companyName:i="Presta Pro",companyAddress:a="",companyPhone:m="",companyWhatsApp:f="",isCopy:u=!1}=c,s=32,n=l=>{const b=Math.max(0,Math.floor((s-l.length)/2));return" ".repeat(b)+l},g=(l,b)=>{const C=Math.max(1,s-l.length-b.length);return l+" ".repeat(C)+b},o=(l="-")=>l.repeat(s),r=l=>"RD$"+parseFloat(l||0).toFixed(2),p=l=>new Date(l).toLocaleDateString("es-DO",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}),v=parseFloat(t.amount||0),d=parseFloat(t.penaltyAmount||t.penalty||0),y=v+d,e=[];u&&(e.push(n("*** COPIA ***")),e.push("")),e.push(n("****************************")),e.push(n(i.toUpperCase())),e.push(n("****************************")),a&&e.push(n(a.substring(0,s))),m&&e.push(n("Tel: "+m)),f&&e.push(n("WhatsApp: "+f)),e.push(""),e.push(n("COMPROBANTE DE PAGO")),u&&e.push(n("(REIMPRESO)")),e.push(o("=")),e.push("Ref: "+(t.id||"").slice(-8).toUpperCase()),e.push("Fecha: "+p(t.date||new Date)),e.push(o("-")),e.push(""),e.push(n("** CLIENTE **"));const w=(t.clientName||"Cliente").toUpperCase();e.push(n(w.substring(0,s))),t.clientPhone&&e.push(n("Tel: "+t.clientPhone)),e.push(""),e.push(o("-")),e.push("DETALLE:");const $=t.isPartialPayment?`Abono Cuota #${t.installmentNumber||t.number||1}`:`Cuota #${t.installmentNumber||t.number||1}`;e.push(g($,r(v))),d>0&&e.push(g("Mora",r(d))),t.remainingBalance!==void 0&&e.push(g("Saldo Pend.",r(t.remainingBalance))),e.push(o("=")),e.push(""),e.push(n("**********************")),e.push(n("TOTAL PAGADO")),e.push(n(">>> "+r(y)+" <<<")),e.push(n("**********************")),e.push(""),e.push(n("Gracias por su pago!")),e.push(n("Conserve este comprobante")),e.push("");const P=`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Ticket</title>
<style>
@page { size: 58mm auto; margin: 0; }
@media print { body { width: 58mm; } }
body {
  font-family: 'Courier New', 'Lucida Console', monospace;
  font-size: 10px;
  line-height: 1.1;
  margin: 0;
  padding: 2mm;
  white-space: pre;
  background: white;
  color: black;
}
</style>
</head>
<body>${e.join(`
`)}</body>
</html>`,h=document.createElement("iframe");h.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;",document.body.appendChild(h);const x=h.contentWindow.document;x.open(),x.write(P),x.close(),h.contentWindow.addEventListener("load",()=>{setTimeout(()=>{try{h.contentWindow.focus(),h.contentWindow.print()}catch(l){console.error("Print text receipt failed",l)}finally{setTimeout(()=>document.body.removeChild(h),6e4)}},500)}),h.contentWindow.document.readyState==="complete"&&h.contentWindow.dispatchEvent(new Event("load"))},O=(t,c={})=>{if(!t)return;const{companyName:i="Presta Pro",companyLogo:a="",companyAddress:m="",companyPhone:f="",companyWhatsApp:u="",isCopy:s=!1}=c,n=e=>new Intl.NumberFormat("es-DO",{style:"currency",currency:"DOP",minimumFractionDigits:2}).format(e||0),g=e=>new Date(e).toLocaleDateString("es-DO",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}),o=parseFloat(t.amount||0),r=parseFloat(t.penaltyAmount||t.penalty||0),p=o+r,v=`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Ticket ${s?"(COPIA)":""}</title>
<style>
@page { 
  size: 58mm auto; 
  margin: 0; 
}
* { 
  margin: 0; 
  padding: 0; 
  box-sizing: border-box; 
}
body {
  font-family: Arial, sans-serif;
  font-size: 11px;
  line-height: 1.3;
  width: 58mm;
  max-width: 58mm;
  padding: 2mm;
  background: white;
  color: black;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.copy-banner {
  background: #000;
  color: #fff;
  text-align: center;
  font-weight: bold;
  padding: 3px;
  margin-bottom: 3mm;
  font-size: 12px;
}
.header {
  text-align: center;
  border-bottom: 2px solid #000;
  padding-bottom: 2mm;
  margin-bottom: 2mm;
}
.logo {
  max-width: 35mm;
  max-height: 15mm;
  margin: 0 auto 2mm;
  display: block;
}
.company-name {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 1mm;
}
.company-info {
  font-size: 9px;
  color: #333;
}
.title {
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  margin: 2mm 0;
  padding: 1mm 0;
  background: #f0f0f0;
}
.ref-date {
  font-size: 9px;
  margin-bottom: 2mm;
}
.divider {
  border-top: 1px dashed #000;
  margin: 2mm 0;
}
.section-title {
  font-weight: bold;
  font-size: 10px;
  background: #eee;
  padding: 1mm 2mm;
  margin-bottom: 1mm;
}
.client-box {
  background: #f8f8f8;
  padding: 2mm;
  border: 1px solid #ddd;
  margin-bottom: 2mm;
}
.client-name {
  font-size: 12px;
  font-weight: bold;
}
.client-phone {
  font-size: 9px;
  color: #666;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 1mm 0;
  font-size: 10px;
}
.detail-row.penalty {
  color: #c00;
}
.total-box {
  background: #000;
  color: #fff;
  text-align: center;
  padding: 3mm 2mm;
  margin: 2mm 0;
}
.total-label {
  font-size: 10px;
  margin-bottom: 1mm;
}
.total-amount {
  font-size: 18px;
  font-weight: bold;
}
.footer {
  text-align: center;
  font-size: 9px;
  margin-top: 2mm;
  padding-top: 2mm;
  border-top: 1px dashed #000;
}
.footer-thanks {
  font-weight: bold;
  margin-bottom: 1mm;
}
@media print {
  body { 
    width: 58mm !important; 
    max-width: 58mm !important;
  }
}
</style>
</head>
<body>
${s?'<div class="copy-banner">*** COPIA ***</div>':""}

<div class="header">
  ${a?`<img src="${a}" class="logo" alt="${i}">`:""}
  <div class="company-name">${i}</div>
  ${m?`<div class="company-info">${m}</div>`:""}
  ${f?`<div class="company-info">Tel: ${f}</div>`:""}
  ${u?`<div class="company-info">WhatsApp: ${u}</div>`:""}
</div>

<div class="title">COMPROBANTE DE PAGO${s?" (REIMPRESO)":""}</div>

<div class="ref-date">
  <div><strong>Ref:</strong> ${(t.id||"").slice(-8).toUpperCase()}</div>
  <div><strong>Fecha:</strong> ${g(t.date||new Date)}</div>
</div>

<div class="divider"></div>

<div class="section-title">CLIENTE</div>
<div class="client-box">
  <div class="client-name">${t.clientName||"Cliente"}</div>
  ${t.clientPhone?`<div class="client-phone">Tel: ${t.clientPhone}</div>`:""}
</div>

<div class="section-title">DETALLE</div>
<div class="detail-row">
  <span>${t.isPartialPayment?"Abono":"Cuota"} #${t.installmentNumber||t.number||1}</span>
  <span><strong>${n(o)}</strong></span>
</div>
${r>0?`
<div class="detail-row penalty">
  <span>Mora</span>
  <span><strong>${n(r)}</strong></span>
</div>
`:""}
${t.remainingBalance!==void 0?`
<div class="detail-row">
  <span>Saldo Pendiente</span>
  <span>${n(t.remainingBalance)}</span>
</div>
`:""}

<div class="total-box">
  <div class="total-label">TOTAL PAGADO</div>
  <div class="total-amount">${n(p)}</div>
</div>

<div class="footer">
  <div class="footer-thanks">¡Gracias por su pago!</div>
  <div>Conserve este comprobante</div>
</div>
</body>
</html>`,d=document.createElement("iframe");d.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;",document.body.appendChild(d);const y=d.contentWindow.document;y.open(),y.write(v),y.close(),d.contentWindow.addEventListener("load",()=>{setTimeout(()=>{try{d.contentWindow.focus(),d.contentWindow.print()}catch(e){console.error("Print modern ticket failed",e)}finally{setTimeout(()=>document.body.removeChild(d),6e4)}},500)}),d.contentWindow.document.readyState==="complete"&&d.contentWindow.dispatchEvent(new Event("load"))};export{A as printHtmlContent,O as printModernTicket,D as printTextReceipt,E as printThermalTicket};
