import { generateReceiptHTML } from '../builders/ReceiptHTMLBuilder';

export function printViaRawBT(receipt, companySettings = {}) {
  return new Promise((resolve, reject) => {
    try {
      const html = generateReceiptHTML(receipt, companySettings);
      const base64 = btoa(unescape(encodeURIComponent(html)));
      const rawbtUrl = `rawbt:base64,${base64}`;

      const link = document.createElement('a');
      link.href = rawbtUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        resolve({ success: true, method: 'rawbt' });
      }, 500);
    } catch (error) {
      reject(new Error(`RawBT error: ${error.message}`));
    }
  });
}
