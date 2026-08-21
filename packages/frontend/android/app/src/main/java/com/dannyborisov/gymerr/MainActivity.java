package com.dannyborisov.gymerr;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SoundPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
