package com.nexus.app.settings;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * SEC-001 Permission Manager: the one generic capability missing before this
 * task -- Android provides no in-app way to re-request a runtime permission
 * once it has been permanently denied ("don't ask again"/blocked), only the
 * system's per-app Settings screen can. PaymentNotificationCapturePlugin.java
 * already has its own single-purpose openAccessSettings() for one specific
 * OS settings screen; this is the generic app-info Settings screen every
 * other permission (Gallery, Location, Local Notifications) recovers through.
 */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
