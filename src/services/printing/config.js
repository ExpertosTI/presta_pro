export const PRINTER_DRIVERS = {
  RAWBT: 'rawbt',
  BLUETOOTH_ESCPOS: 'bluetooth_escpos',
  HTML_PRINT: 'html_print',
};

export const PRINTER_BRANDS = {
  RAWBT: { id: 'rawbt', name: 'RawBT', driver: PRINTER_DRIVERS.RAWBT, platforms: ['android'] },
  CONECT_2: { id: '2conect', name: '2Conect', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
  XPRINTER: { id: 'xprinter', name: 'Xprinter', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
  EPSON: { id: 'epson', name: 'Epson TM', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
  STAR: { id: 'star', name: 'Star', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
  MUNBYN: { id: 'munbyn', name: 'Munbyn', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
  GOOJPRT: { id: 'goojprt', name: 'Goojprt', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
  GENERIC: { id: 'generic', name: 'Generica ESC/POS', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios', 'windows'] },
  BROWSER: { id: 'browser', name: 'Navegador (PDF)', driver: PRINTER_DRIVERS.HTML_PRINT, platforms: ['android', 'ios', 'windows', 'web'] },
};

const STORAGE_KEY = 'presta_pro_printer';
const DEFAULT_CONFIG = { driver: PRINTER_DRIVERS.HTML_PRINT, brand: 'browser', paperWidth: 80 };

let _config = null;

export function loadPrinterConfig() {
  if (_config) return { ..._config };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    _config = saved ? JSON.parse(saved) : { ...DEFAULT_CONFIG };
  } catch {
    _config = { ...DEFAULT_CONFIG };
  }
  return { ..._config };
}

export function savePrinterConfig(config) {
  _config = { ...(loadPrinterConfig()), ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_config));
}

export function isRawBTAvailable() {
  return /android/i.test(navigator.userAgent || '');
}

export function getAvailableDrivers() {
  const drivers = [PRINTER_BRANDS.BROWSER];
  if (isRawBTAvailable()) drivers.unshift(PRINTER_BRANDS.RAWBT);
  if (typeof navigator !== 'undefined' && navigator.bluetooth) {
    drivers.push(
      PRINTER_BRANDS.CONECT_2, PRINTER_BRANDS.XPRINTER, PRINTER_BRANDS.EPSON,
      PRINTER_BRANDS.STAR, PRINTER_BRANDS.MUNBYN, PRINTER_BRANDS.GOOJPRT, PRINTER_BRANDS.GENERIC
    );
  }
  return drivers;
}
