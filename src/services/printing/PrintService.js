import { PRINTER_DRIVERS, PRINTER_BRANDS, loadPrinterConfig, savePrinterConfig, getAvailableDrivers, isRawBTAvailable } from './config';
import { bluetoothManager } from './BluetoothManager';
import { printViaRawBT } from './drivers/RawBTDriver';
import { printViaBluetoothESCPOS } from './drivers/BluetoothESCPOSDriver';
import { printViaHTML, printHtmlContent } from './drivers/HTMLPrintDriver';
import { generateReceiptPDF } from './drivers/PDFDriver';
import { generateReceiptHTML } from './builders/ReceiptHTMLBuilder';

export async function printReceipt(receipt, companySettings = {}, driverOverride = null) {
  const config = loadPrinterConfig();
  const driver = driverOverride || config.driver;

  switch (driver) {
    case PRINTER_DRIVERS.RAWBT:
      return printViaRawBT(receipt, companySettings);

    case PRINTER_DRIVERS.BLUETOOTH_ESCPOS:
      if (!bluetoothManager.isConnected) {
        throw new Error('Impresora Bluetooth no conectada. Ve a Configuracion > Impresora para conectar.');
      }
      return printViaBluetoothESCPOS(receipt, companySettings);

    case PRINTER_DRIVERS.HTML_PRINT:
    default:
      return printViaHTML(receipt, companySettings);
  }
}

// Re-export everything for backward compatibility and convenience
export {
  // Config
  PRINTER_DRIVERS, loadPrinterConfig as getPrinterConfig, savePrinterConfig, getAvailableDrivers, isRawBTAvailable,
  // Bluetooth
  bluetoothManager,
  // Drivers
  printViaRawBT, printViaBluetoothESCPOS, printViaHTML, printHtmlContent,
  // PDF
  generateReceiptPDF,
  // Builders
  generateReceiptHTML,
};

// Legacy compat aliases
export { PRINTER_BRANDS };
export const scanBluetoothPrinter = () => bluetoothManager.scan();
export const connectBluetoothPrinter = (device) => bluetoothManager.connect(device);
export const disconnectBluetoothPrinter = () => bluetoothManager.disconnect();
export const getBluetoothConnectionStatus = () => bluetoothManager.getStatus();
export const isBluetoothSupported = () => bluetoothManager.isSupported;
export const generateThermalReceiptHTML = generateReceiptHTML;
export const printThermalReceipt = printViaHTML;
