package com.nexus.app.notifications;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * JS-facing companion to PaymentNotificationListenerService.java -- the
 * listener can only alert and stash (see its own header comment); this
 * plugin is how the JS layer checks/opens the special "Notification access"
 * grant, flips the in-app capture toggle the listener checks first, and
 * reads/clears whatever the listener has stashed. Never touches Dexie --
 * that only happens after usePendingNotificationCandidates.ts hands a parsed
 * candidate to the existing Smart Import pipeline via an explicit user tap.
 *
 * No @Permission/@PermissionCallback here (unlike GalleryMediaPlugin): unlike
 * a normal runtime permission, Android has no in-app request dialog for
 * Notification Access at all -- checkAccess is a pure query, and
 * openAccessSettings can only hand off to the system Settings screen.
 */
@CapacitorPlugin(name = "PaymentNotificationCapture")
public class PaymentNotificationCapturePlugin extends Plugin {

    @PluginMethod
    public void checkAccess(PluginCall call) {
        execute(() -> {
            Context context = getContext();
            boolean granted = NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.getPackageName());
            JSObject result = new JSObject();
            result.put("granted", granted);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void openAccessSettings(PluginCall call) {
        execute(() -> {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        });
    }

    @PluginMethod
    public void setCaptureEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        execute(() -> {
            prefs().edit().putBoolean(PaymentNotificationListenerService.KEY_CAPTURE_ENABLED, enabled).apply();
            call.resolve();
        });
    }

    @PluginMethod
    public void isCaptureEnabled(PluginCall call) {
        execute(() -> {
            boolean enabled = prefs().getBoolean(PaymentNotificationListenerService.KEY_CAPTURE_ENABLED, false);
            JSObject result = new JSObject();
            result.put("enabled", enabled);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getPendingCandidates(PluginCall call) {
        execute(() -> {
            try {
                JSArray candidates = new JSArray(prefs().getString(PaymentNotificationListenerService.KEY_PENDING, "[]"));
                JSObject result = new JSObject();
                result.put("candidates", candidates);
                call.resolve(result);
            } catch (JSONException e) {
                call.reject("Failed to read pending candidates", e);
            }
        });
    }

    @PluginMethod
    public void acknowledgeCandidate(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("id is required");
            return;
        }
        execute(() -> {
            try {
                JSONArray pending = new JSONArray(prefs().getString(PaymentNotificationListenerService.KEY_PENDING, "[]"));
                JSONArray kept = new JSONArray();
                for (int i = 0; i < pending.length(); i++) {
                    JSONObject entry = pending.optJSONObject(i);
                    if (entry != null && !id.equals(entry.optString("id"))) kept.put(entry);
                }
                prefs().edit().putString(PaymentNotificationListenerService.KEY_PENDING, kept.toString()).apply();
                call.resolve();
            } catch (JSONException e) {
                call.reject("Failed to acknowledge candidate", e);
            }
        });
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PaymentNotificationListenerService.PREFS_NAME, Context.MODE_PRIVATE);
    }
}
