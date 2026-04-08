// Re-export everything from new printing module for backward compatibility
export {
  printReceipt,
  PRINTER_DRIVERS,
  PRINTER_BRANDS,
  getPrinterConfig,
  savePrinterConfig,
  getAvailableDrivers,
  isRawBTAvailable,
  isBluetoothSupported,
  bluetoothManager,
  scanBluetoothPrinter,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getBluetoothConnectionStatus,
  printViaRawBT,
  printViaBluetoothESCPOS,
  printViaHTML,
  generateThermalReceiptHTML,
  printThermalReceipt,
  generateReceiptHTML,
  printHtmlContent,
} from './printing/PrintService';

// Default export for dynamic imports
export { printReceipt as default } from './printing/PrintService';
