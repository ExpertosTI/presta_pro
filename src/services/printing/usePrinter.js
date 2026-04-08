import { useState, useCallback } from 'react';
import { printReceipt } from './PrintService';
import { bluetoothManager } from './BluetoothManager';
import { savePrinterConfig, PRINTER_DRIVERS } from './config';

export function usePrinter() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(bluetoothManager.isConnected);
  const [deviceName, setDeviceName] = useState(bluetoothManager.deviceName);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const device = await bluetoothManager.scan();
      await bluetoothManager.connect(device);
      setIsConnected(true);
      setDeviceName(device.name);
      savePrinterConfig({
        lastDeviceName: device.name,
        driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS,
      });
      return { device: device.name };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    bluetoothManager.disconnect();
    setIsConnected(false);
    setDeviceName(null);
  }, []);

  const print = useCallback(async (receipt, companySettings = {}, driverOverride = null) => {
    setIsLoading(true);
    try {
      return await printReceipt(receipt, companySettings, driverOverride);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { print, connect, disconnect, isConnected, deviceName, isLoading };
}
