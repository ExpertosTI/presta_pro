package tech.renace.prestapro;

import com.getcapacitor.BridgeActivity;

import tech.renace.renkredit.BluetoothPrinterPlugin;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
