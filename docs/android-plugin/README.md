# Integración Plugin Bluetooth Printer

## Instalación Manual

### 1. Copiar el Plugin Java

Copiar `BluetoothPrinterPlugin.java` a:
```
android/app/src/main/java/tech/renace/renkredit/BluetoothPrinterPlugin.java
```

### 2. Registrar en MainActivity

Editar `android/app/src/main/java/tech/renace/renkredit/MainActivity.java`:

```java
package tech.renace.renkredit;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### 3. Agregar Permisos

Editar `android/app/src/main/AndroidManifest.xml` (dentro de `<manifest>`):

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
```

### 4. Sincronizar Capacitor

```bash
npx cap sync android
```

### 5. Rebuild APK

```bash
cd android
./gradlew assembleDebug
```

---

## API del Plugin

### Verificar Disponibilidad
```javascript
const { available, enabled } = await BluetoothPrinter.isAvailable();
```

### Obtener Dispositivos Emparejados
```javascript
const { devices } = await BluetoothPrinter.getPairedDevices();
// devices: [{ name: "Printer", address: "00:11:22:33:44:55" }]
```

### Conectar
```javascript
await BluetoothPrinter.connect({ address: "00:11:22:33:44:55" });
```

### Imprimir Texto
```javascript
await BluetoothPrinter.printText({
    text: "Hola Mundo",
    bold: true,
    center: true,
    cut: true
});
```

### Imprimir Recibo
```javascript
await BluetoothPrinter.printReceipt({
    title: "RenKredit",
    subtitle: "Recibo de Pago",
    content: "Cliente: Juan\nMonto: $1,500.00\n",
    footer: "¡Gracias!"
});
```

### Imprimir Raw (Base64)
```javascript
await BluetoothPrinter.printRaw({ data: "base64EncodedEscPosCommands" });
```

### Desconectar
```javascript
await BluetoothPrinter.disconnect();
```

---

## Impresoras Compatibles

- Xprinter XP-58/80
- Goojprt PT-210/PT-120
- POS-5890K
- Cualquier impresora ESC/POS con Bluetooth SPP
