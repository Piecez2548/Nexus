package com.nexus.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.nexus.app.gallery.GalleryMediaPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GalleryMediaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
