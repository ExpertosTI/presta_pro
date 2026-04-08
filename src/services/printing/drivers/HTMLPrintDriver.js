import { generateReceiptHTML } from '../builders/ReceiptHTMLBuilder';

export function printViaHTML(receipt, companySettings = {}) {
  return new Promise((resolve, reject) => {
    try {
      const html = generateReceiptHTML(receipt, companySettings);
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;visibility:hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.print();
              resolve({ success: true, method: 'html_print' });
            } catch (e) {
              const w = window.open('', '_blank', 'width=320,height=600');
              if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
              resolve({ success: true, method: 'html_print_fallback' });
            }
            setTimeout(() => document.body.removeChild(iframe), 1000);
          }, 100);
        };
      } else {
        reject(new Error('No se pudo crear iframe de impresion'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

export function printHtmlContent(title, contentHtml) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #000; }
          pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 13px; }
          h1 { text-align: center; margin-bottom: 24px; font-size: 20px; text-transform: uppercase; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${contentHtml.includes('<') ? contentHtml : `<h1>${title}</h1><pre>${contentHtml}</pre>`}
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.addEventListener('load', () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print failed', e);
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 60000);
      }
    }, 500);
  });

  if (iframe.contentWindow.document.readyState === 'complete') {
    iframe.contentWindow.dispatchEvent(new Event('load'));
  }
}
