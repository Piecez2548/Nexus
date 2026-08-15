package com.nexus.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.nexus.app.gallery.GalleryMediaPlugin;
import com.nexus.app.notifications.PaymentNotificationCapturePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GalleryMediaPlugin.class);
        registerPlugin(PaymentNotificationCapturePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
