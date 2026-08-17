package com.nexus.app.gallery;

import android.Manifest;
import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Backs both the gallery-permission contract (GalleryPermissionsPlugin,
 * declared on the JS side since an earlier task) and the full-gallery
 * MediaStore enumeration the Slip Scanner's NativeMediaProvider needs
 * (count/page/readBytes) -- one native class, registered under the
 * already-established Capacitor plugin name "GalleryPermissions", so the
 * existing galleryPermissionService.ts starts working for real with zero JS
 * changes, and NativeMediaProvider.ts gets a second, differently-typed
 * registerPlugin() declaration against the same native name for the media
 * methods below.
 *
 * Pagination and the incremental "since" cursor are both keyed on
 * DATE_ADDED (always populated, monotonic with insertion into the gallery)
 * rather than DATE_TAKEN (frequently 0/null for screenshots and downloaded
 * images, and can be *older* than when a file actually entered this
 * device's gallery). "have I already scanned everything that was here as
 * of my last run" is a question about insertion time, not capture time, so
 * DATE_ADDED is the more correct axis for this scanner's actual use case,
 * not just the more robust one.
 */
@CapacitorPlugin(
    name = "GalleryPermissions",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_MEDIA_IMAGES }, alias = "images"),
        @Permission(strings = { Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED }, alias = "selectedImages"),
        @Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE }, alias = "legacyStorage"),
    }
)
public class GalleryMediaPlugin extends Plugin {

    private static final String ALIAS_IMAGES = "images";
    private static final String ALIAS_SELECTED_IMAGES = "selectedImages";
    private static final String ALIAS_LEGACY_STORAGE = "legacyStorage";

    private static final Uri IMAGES_URI = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
    private static final String[] PAGE_PROJECTION = {
        MediaStore.Images.Media._ID,
        MediaStore.Images.Media.DATE_ADDED,
        MediaStore.Images.Media.SIZE,
        MediaStore.Images.Media.DISPLAY_NAME,
    };
    private static final String[] COUNT_PROJECTION = { MediaStore.Images.Media._ID };
    private static final int DEFAULT_PAGE_LIMIT = 200;

    // ---- Permissions (GalleryPermissionsPlugin contract) ----

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        call.resolve(currentPhotosPermissionState());
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) {
            // Android 14+: request both the full and the partial-access
            // permission together -- the OS picker itself decides which one
            // (if either) the user actually grants.
            requestPermissionForAliases(new String[] { ALIAS_IMAGES, ALIAS_SELECTED_IMAGES }, call, "permissionsRequested");
        } else if (Build.VERSION.SDK_INT >= 33) {
            requestPermissionForAlias(ALIAS_IMAGES, call, "permissionsRequested");
        } else {
            requestPermissionForAlias(ALIAS_LEGACY_STORAGE, call, "permissionsRequested");
        }
    }

    @PermissionCallback
    private void permissionsRequested(PluginCall call) {
        call.resolve(currentPhotosPermissionState());
    }

    private JSObject currentPhotosPermissionState() {
        JSObject result = new JSObject();
        result.put("photos", computePhotosState());
        return result;
    }

    // Reuses Capacitor's own getPermissionState(alias) (backed by
    // ActivityCompat.checkSelfPermission + shouldShowRequestPermissionRationale)
    // for the granted/denied/prompt/prompt-with-rationale distinction --
    // only the "full vs partial vs neither" combining logic below is ours.
    private String computePhotosState() {
        if (Build.VERSION.SDK_INT >= 34) {
            PermissionState images = getPermissionState(ALIAS_IMAGES);
            if (images == PermissionState.GRANTED) return "granted";
            PermissionState selected = getPermissionState(ALIAS_SELECTED_IMAGES);
            if (selected == PermissionState.GRANTED) return "limited";
            return images != null ? images.toString() : "prompt";
        } else if (Build.VERSION.SDK_INT >= 33) {
            PermissionState images = getPermissionState(ALIAS_IMAGES);
            return images != null ? images.toString() : "prompt";
        } else {
            PermissionState legacy = getPermissionState(ALIAS_LEGACY_STORAGE);
            return legacy != null ? legacy.toString() : "prompt";
        }
    }

    // ---- Gallery media enumeration (NativeMediaProvider) ----

    // A small holder since Java has no built-in tuple return -- shared by
    // count() and page() so the DATE_ADDED range clause stays in sync
    // between them.
    private static final class DateRangeSelection {
        final String selection;
        final String[] selectionArgs;

        DateRangeSelection(String selection, String[] selectionArgs) {
            this.selection = selection;
            this.selectionArgs = selectionArgs;
        }
    }

    private static DateRangeSelection buildDateRangeSelection(Long sinceCursorMs, Long untilCursorMs) {
        List<String> clauses = new ArrayList<>();
        List<String> args = new ArrayList<>();
        if (sinceCursorMs != null) {
            clauses.add(MediaStore.Images.Media.DATE_ADDED + " > ?");
            args.add(String.valueOf(sinceCursorMs / 1000L));
        }
        if (untilCursorMs != null) {
            clauses.add(MediaStore.Images.Media.DATE_ADDED + " < ?");
            args.add(String.valueOf(untilCursorMs / 1000L));
        }
        if (clauses.isEmpty()) return new DateRangeSelection(null, null);
        return new DateRangeSelection(String.join(" AND ", clauses), args.toArray(new String[0]));
    }

    @PluginMethod
    public void count(PluginCall call) {
        Long sinceCursorMs = call.getLong("sinceCursorMs");
        Long untilCursorMs = call.getLong("untilCursorMs");
        execute(() -> {
            try {
                DateRangeSelection range = buildDateRangeSelection(sinceCursorMs, untilCursorMs);
                String selection = range.selection;
                String[] selectionArgs = range.selectionArgs;
                int total = 0;
                try (
                    Cursor cursor = getContext()
                        .getContentResolver()
                        .query(IMAGES_URI, COUNT_PROJECTION, selection, selectionArgs, null)
                ) {
                    if (cursor != null) total = cursor.getCount();
                }
                JSObject result = new JSObject();
                result.put("total", total);
                call.resolve(result);
            } catch (SecurityException e) {
                call.reject("Gallery permission not granted", "PERMISSION_DENIED", e);
            } catch (Exception e) {
                call.reject("Failed to count gallery images", e);
            }
        });
    }

    @PluginMethod
    public void page(PluginCall call) {
        Long sinceCursorMs = call.getLong("sinceCursorMs");
        Long untilCursorMs = call.getLong("untilCursorMs");
        int offset = call.getInt("offset", 0);
        int limit = call.getInt("limit", DEFAULT_PAGE_LIMIT);

        execute(() -> {
            try {
                DateRangeSelection range = buildDateRangeSelection(sinceCursorMs, untilCursorMs);
                String selection = range.selection;
                String[] selectionArgs = range.selectionArgs;
                String sortOrder = MediaStore.Images.Media.DATE_ADDED + " ASC, " + MediaStore.Images.Media._ID + " ASC";

                // A trailing "LIMIT x OFFSET y" appended to the sort-order string is a
                // widely-cited trick for paginating MediaStore, but it is NOT portable:
                // on-device testing (Android 16 / API 36) threw
                // "IllegalArgumentException: Invalid token LIMIT" from the underlying
                // query validation. cursor.moveToPosition(offset) achieves the same
                // pagination without relying on any non-standard SQL the provider has to
                // accept, and works uniformly from this app's minSdk (24) up.
                JSArray assets = new JSArray();
                try (
                    Cursor cursor = getContext()
                        .getContentResolver()
                        .query(IMAGES_URI, PAGE_PROJECTION, selection, selectionArgs, sortOrder)
                ) {
                    if (cursor != null && cursor.moveToPosition(offset)) {
                        int idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID);
                        int dateCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED);
                        int sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE);
                        int nameCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME);

                        int collected = 0;
                        do {
                            JSObject asset = new JSObject();
                            asset.put("assetId", String.valueOf(cursor.getLong(idCol)));
                            asset.put("capturedAt", isoFromEpochSeconds(cursor.getLong(dateCol)));
                            asset.put("bytes", cursor.getLong(sizeCol));
                            String name = cursor.getString(nameCol);
                            asset.put("filename", name != null ? name : "");
                            assets.put(asset);
                            collected++;
                        } while (collected < limit && cursor.moveToNext());
                    }
                }

                JSObject result = new JSObject();
                result.put("assets", assets);
                call.resolve(result);
            } catch (SecurityException e) {
                call.reject("Gallery permission not granted", "PERMISSION_DENIED", e);
            } catch (Exception e) {
                call.reject("Failed to enumerate gallery", e);
            }
        });
    }

    @PluginMethod
    public void readBytes(PluginCall call) {
        String assetId = call.getString("assetId");
        if (assetId == null || assetId.isEmpty()) {
            call.reject("assetId is required");
            return;
        }

        execute(() -> {
            try {
                long id = Long.parseLong(assetId);
                Uri uri = ContentUris.withAppendedId(IMAGES_URI, id);
                byte[] bytes = readAllBytes(uri);

                JSObject result = new JSObject();
                result.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
                call.resolve(result);
            } catch (NumberFormatException e) {
                call.reject("Invalid assetId: " + assetId, e);
            } catch (SecurityException e) {
                call.reject("Gallery permission not granted", "PERMISSION_DENIED", e);
            } catch (IOException e) {
                call.reject("Failed to read image " + assetId, e);
            }
        });
    }

    private byte[] readAllBytes(Uri uri) throws IOException {
        try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
            if (input == null) throw new IOException("Unable to open input stream for " + uri);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }

    // A fresh SimpleDateFormat per call -- the class is not thread-safe, and
    // count()/page()/readBytes() may each run on the bridge's background
    // task handler at different times.
    private static String isoFromEpochSeconds(long epochSec) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date(epochSec * 1000L));
    }
}
