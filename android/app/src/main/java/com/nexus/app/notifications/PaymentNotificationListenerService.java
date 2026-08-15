package com.nexus.app.notifications;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.nexus.app.MainActivity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

/**
 * Payment Notification Capture (Phase 1): watches a small, hardcoded
 * allowlist of Thai banking apps for payment-confirmation notifications, and
 * -- only for those -- stashes a small pending-candidate record plus fires
 * our own "tap to confirm" notification. Runs even when the WebView/JS layer
 * isn't alive (a bound system service, not a Capacitor plugin call), but
 * never writes to Dexie itself: it can only alert and stash. The actual
 * transaction is created later, in JS, only after an explicit user tap (see
 * PaymentNotificationCapturePlugin.java and usePendingNotificationCandidates.ts)
 * -- this is what keeps the feature "one tap to confirm", never silent.
 *
 * Security boundary: a notification from any package NOT in ALLOWED_PACKAGES
 * is discarded here, before its title/text/bigText is ever read into a
 * variable. This class must never process, store, or log content from any
 * other app on the device -- see docs/SECURITY.md's "Payment Notification
 * Capture" section for the full policy this enforces.
 */
public class PaymentNotificationListenerService extends NotificationListenerService {

    public static final String PREFS_NAME = "nexus_notification_capture";
    public static final String KEY_CAPTURE_ENABLED = "captureEnabled";
    public static final String KEY_PENDING = "pendingCandidates";
    private static final int MAX_PENDING = 10;
    private static final String CHANNEL_ID = "nexus-payment-capture";

    // Thai banking app package names this service watches for. Best-effort
    // and NOT yet verified against real installs -- confirm/correct each via
    // `adb shell dumpsys notification --noredact` against the real app
    // before trusting a bank's entry here (see the task-registry note on
    // this feature for the full discovery procedure).
    private static final String[] ALLOWED_PACKAGES = {
        "com.scb.phone", // SCB Easy
        "com.kasikorn.retail.mbanking.wap", // K PLUS
        "com.ktb.next", // Krungthai NEXT
    };

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_CAPTURE_ENABLED, false)) return;

        String packageName = sbn.getPackageName();
        if (!isAllowedPackage(packageName)) return;

        // Only past both gates above does any notification content get read.
        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) return;
        CharSequence title = notification.extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = notification.extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigText = notification.extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (title == null && text == null && bigText == null) return;

        String id = UUID.randomUUID().toString();
        try {
            storePendingCandidate(prefs, id, packageName, title, text, bigText, sbn.getPostTime());
        } catch (JSONException e) {
            return; // best-effort -- never crash the listener over a storage hiccup
        }

        postConfirmNotification(id);
    }

    private boolean isAllowedPackage(String packageName) {
        if (packageName == null) return false;
        for (String allowed : ALLOWED_PACKAGES) {
            if (allowed.equals(packageName)) return true;
        }
        return false;
    }

    private void storePendingCandidate(
        SharedPreferences prefs,
        String id,
        String packageName,
        CharSequence title,
        CharSequence text,
        CharSequence bigText,
        long postedAtMs
    ) throws JSONException {
        JSONArray pending = new JSONArray(prefs.getString(KEY_PENDING, "[]"));

        JSONObject entry = new JSONObject();
        entry.put("id", id);
        entry.put("packageName", packageName);
        entry.put("title", title != null ? title.toString() : "");
        entry.put("text", text != null ? text.toString() : "");
        entry.put("bigText", bigText != null ? bigText.toString() : "");
        entry.put("postedAtMs", postedAtMs);
        pending.put(entry);

        // Drop-oldest ring buffer, bounded at MAX_PENDING (mirrors the same
        // bounded-history shape scanAuditLog.ts uses on the JS side).
        while (pending.length() > MAX_PENDING) {
            JSONArray trimmed = new JSONArray();
            for (int i = 1; i < pending.length(); i++) trimmed.put(pending.optJSONObject(i));
            pending = trimmed;
        }

        prefs.edit().putString(KEY_PENDING, pending.toString()).apply();
    }

    private void postConfirmNotification(String pendingId) {
        Context context = getApplicationContext();
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Payment capture", NotificationManager.IMPORTANCE_HIGH);
            manager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pendingIntent = PendingIntent.getActivity(context, pendingId.hashCode(), intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle("Payment detected")
            .setContentText("Tap to confirm and add it to Nexus")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        try {
            manager.notify(pendingId.hashCode(), builder.build());
        } catch (SecurityException e) {
            // POST_NOTIFICATIONS not granted -- fail silently; the pending
            // candidate is still stashed and will surface next time the app
            // is opened normally (PendingPaymentSheet checks on every resume).
        }
    }
}
