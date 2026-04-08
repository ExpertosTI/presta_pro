import { buildESCPOSReceipt } from '../builders/ESCPOSBuilder';
import { bluetoothManager } from '../BluetoothManager';

export async function printViaBluetoothESCPOS(receipt, companySettings = {}) {
  const data = buildESCPOSReceipt(receipt, companySettings);
  await bluetoothManager.sendData(data);
  return { success: true, method: 'bluetooth_escpos', bytes: data.length };
}
