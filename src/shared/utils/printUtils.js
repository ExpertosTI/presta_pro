/**
 * Print utility using a hidden iframe to avoid Cross-Origin-Opener-Policy issues
 * and prevent popup blockers.
 */
export const printHtmlContent = (title, contentHtml) => {
    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    // Safe content check
    const safeContent = (contentHtml || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    // Write content
    doc.open();
    doc.write(`
    <html>
      <head>
        <title>${title}</title>
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
        ${contentHtml.includes('<') ? contentHtml : `<h1>${title}</h1><pre>${contentHtml}</pre>`}
      </body>
    </html>
  `);
    doc.close();

    // Print after image loading (if any)
    iframe.contentWindow.addEventListener('load', () => {
        // Small delay to ensure rendering
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {
                console.error('Print failed', e);
                alert('No se pudo iniciar la impresión. Intente nuevamente.');
            } finally {
                // Remove iframe after user interacts with print dialog (or after delay)
                // Note: There is no standard event for "after print dialog closed".
                // We'll leave it or remove it after a long timeout. 
                // Removing immediately stops printing in some browsers (Firefox).
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 60000);
            }
        }, 500);
    });

    // Backup if load event doesn't fire (e.g. no external resources)
    if (iframe.contentWindow.document.readyState === 'complete') {
        iframe.contentWindow.dispatchEvent(new Event('load'));
    }
};
