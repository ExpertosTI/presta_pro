const T=async(o,i,p,c)=>{var t,s,h,w;if(!c)throw new Error("API Key missing");const d=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${c}`,m={contents:[...o.map(e=>({role:e.role==="user"?"user":"model",parts:[{text:e.text}]})),{role:"user",parts:[{text:i}]}],systemInstruction:{parts:[{text:p}]},tools:[{google_search:{}}]};let r=null,n=0;const l=3;for(;n<l;)try{const e=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(m)});if(!e.ok){if(e.status===429){const y=Math.pow(2,n)*1e3;console.warn(`Rate limit hit. Retrying in ${y/1e3}s...`),await new Promise(f=>setTimeout(f,y)),n++;continue}throw new Error(`HTTP error! status: ${e.status}`)}r=await e.json();break}catch(e){throw console.error("Error fetching AI response:",e),e}const a=(t=r==null?void 0:r.candidates)==null?void 0:t[0];return((w=(h=(s=a==null?void 0:a.content)==null?void 0:s.parts)==null?void 0:h[0])==null?void 0:w.text)||"Lo siento, no pude obtener una respuesta del modelo."},A=async(o,i,p,c)=>{var r,n,l,a,g;if(!c)throw new Error("API Key missing");const d=`
      Genera un contrato de préstamo legal y formal en formato texto plano (sin markdown, sin negritas) para la siguiente transacción:
      
      PRESTAMISTA: ${p}
      PRESTATARIO: ${i.name} (Cédula/ID: ${i.cedula||"N/A"}, Dirección: ${i.address||"N/A"})
      
      DETALLES DEL PRÉSTAMO:
      - Monto Principal: ${o.amount}
      - Tasa de Interés: ${o.rate}%
      - Plazo: ${o.term} ${o.frequency}
      - Fecha de Inicio: ${o.startDate}
      
      El contrato debe incluir cláusulas estándar de:
      1. Reconocimiento de deuda.
      2. Compromiso de pago.
      3. Intereses y mora (si aplica).
      4. Garantías (si aplica, mencionar pagaré notarial).
      5. Jurisdicción legal.
      
      Redacta el contrato de manera profesional, listo para imprimir y firmar.
    `,u=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${c}`,m={contents:[{role:"user",parts:[{text:d}]}]};try{const t=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(m)});if(!t.ok)throw new Error("Error generating contract");const s=await t.json();return((g=(a=(l=(n=(r=s==null?void 0:s.candidates)==null?void 0:r[0])==null?void 0:n.content)==null?void 0:l.parts)==null?void 0:a[0])==null?void 0:g.text)||"Error generando contrato."}catch(t){throw console.error(t),t}};export{A as generateLoanContract,T as sendMessageToAI};
