import { formatCurrency, formatReceiptDate } from '../../../shared/utils/formatters';

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

export const ESCPOS = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [ESC, 0x21, 0x20],
  DOUBLE_ON: [ESC, 0x21, 0x30],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  CUT_PAPER: [GS, 0x56, 0x00],
  CUT_PARTIAL: [GS, 0x56, 0x01],
  FEED_LINES: (n) => [ESC, 0x64, n],
  LINE: [LF],
};

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

export function buildESCPOSReceipt(receipt, companySettings = {}) {
  const { companyName = 'Presta Pro' } = companySettings;
  const commands = [];
  const push = (...bytes) => commands.push(...bytes.flat());
  const text = (str) => push(...textToBytes(str));
  const line = () => push(...ESCPOS.LINE);
  const dashes = () => { text('--------------------------------'); line(); };

  const baseAmount = parseFloat(receipt.amount || 0);
  const penaltyAmount = parseFloat(receipt.penaltyAmount || 0);
  const totalAmount = baseAmount + penaltyAmount;

  // Initialize
  push(...ESCPOS.INIT);

  // Header
  push(...ESCPOS.ALIGN_CENTER);
  push(...ESCPOS.BOLD_ON);
  push(...ESCPOS.DOUBLE_ON);
  text(companyName); line();
  push(...ESCPOS.NORMAL_SIZE);
  push(...ESCPOS.BOLD_OFF);
  line();
  push(...ESCPOS.BOLD_ON);
  text('COMPROBANTE DE PAGO'); line();
  push(...ESCPOS.BOLD_OFF);
  text(`Ref: TPPR3N4${(receipt.id || '').slice(-6).toUpperCase().padStart(6, '0')}`); line();
  text(formatReceiptDate(receipt.date || new Date())); line();

  dashes();

  // Client
  push(...ESCPOS.ALIGN_LEFT);
  push(...ESCPOS.BOLD_ON);
  text('CLIENTE'); line();
  push(...ESCPOS.BOLD_OFF);
  text(receipt.clientName || 'Cliente'); line();
  if (receipt.clientPhone) { text(receipt.clientPhone); line(); }

  dashes();

  // Loan info
  if (receipt.loanAmount) {
    push(...ESCPOS.BOLD_ON);
    text('PRESTAMO'); line();
    push(...ESCPOS.BOLD_OFF);
    text(`Capital:${formatCurrency(receipt.loanAmount).padStart(20)}`); line();
    if (receipt.installmentNumber) {
      text(`Cuota(s):          #${receipt.installmentNumber}`); line();
    }
    if (receipt.remainingBalance !== undefined) {
      push(...ESCPOS.BOLD_ON);
      text(`Saldo:${formatCurrency(receipt.remainingBalance).padStart(22)}`); line();
      push(...ESCPOS.BOLD_OFF);
    }
    dashes();
  }

  // Detail
  push(...ESCPOS.BOLD_ON);
  text('DETALLE'); line();
  push(...ESCPOS.BOLD_OFF);

  if (receipt.paymentBreakdown?.length > 0) {
    receipt.paymentBreakdown.forEach(item => {
      const label = `Cuota #${item.number}`;
      text(`${label}${formatCurrency(item.amount).padStart(32 - label.length)}`); line();
    });
  } else {
    const cuotaNum = receipt.installmentNumber || '1';
    const label = `Cuota #${cuotaNum}`;
    text(`${label}${formatCurrency(baseAmount).padStart(32 - label.length)}`); line();
  }

  if (penaltyAmount > 0) {
    text(`Mora${formatCurrency(penaltyAmount).padStart(28)}`); line();
  }

  // Total
  dashes();
  push(...ESCPOS.ALIGN_CENTER);
  push(...ESCPOS.BOLD_ON);
  text('TOTAL PAGADO'); line();
  push(...ESCPOS.DOUBLE_ON);
  text(formatCurrency(totalAmount)); line();
  push(...ESCPOS.NORMAL_SIZE);
  push(...ESCPOS.BOLD_OFF);
  text('PAGO DE PRESTAMO'); line();
  dashes();

  // Footer
  push(...ESCPOS.ALIGN_CENTER);
  push(...ESCPOS.BOLD_ON);
  text('Gracias por su pago!'); line();
  push(...ESCPOS.BOLD_OFF);
  text('Conserve este comprobante'); line();
  line();
  line();

  // Feed and cut
  push(...ESCPOS.FEED_LINES(4));
  push(...ESCPOS.CUT_PARTIAL);

  return new Uint8Array(commands);
}
