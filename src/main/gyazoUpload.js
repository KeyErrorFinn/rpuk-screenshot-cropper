import { basename, extname, join } from "node:path";
import { mapWithConcurrency } from "./imagePipeline.js";

const mimeTypes = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function uploadImageToGyazo(filePath, accessToken, { fileSystem, fetchFunction, signal }) {
    const filename = basename(filePath);
    const image = await fileSystem.readFile(filePath);
    const form = new FormData();
    form.append("imagedata", new Blob([image], { type: mimeTypes[extname(filename).toLowerCase()] || "application/octet-stream" }), filename);
    form.append("app", "RPUK Screenshot Cropper");
    const timeoutSignal = AbortSignal.timeout(30_000);
    const response = await fetchFunction("https://upload.gyazo.com/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
        signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
    if (!response.ok) {
        const details = await response.text();
        let message = details;
        try { message = JSON.parse(details)?.message || details; } catch { /* Gyazo can also return plain text. */ }
        if (response.status === 401 || response.status === 403) message = "Gyazo rejected the access token. Create a new token and save it in Settings.";
        const error = new Error(message || `Gyazo returned HTTP ${response.status}`);
        error.status = response.status;
        error.code = response.status === 401 || response.status === 403 ? "GYAZO_AUTH_FAILED" : "GYAZO_UPLOAD_FAILED";
        throw error;
    }
    return response.json();
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function uploadImageWithRetry(filePath, accessToken, dependencies) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try { return await uploadImageToGyazo(filePath, accessToken, dependencies); }
        catch (error) {
            lastError = error;
            if (dependencies.signal?.aborted || error.name === "AbortError") throw error;
            const retryable = !error.status || error.status === 408 || error.status === 429 || error.status >= 500;
            if (!retryable || attempt === 2) throw error;
            await (dependencies.delayFunction || delay)(500 * 2 ** attempt);
        }
    }
    throw lastError;
}

export async function uploadSelectedToGyazo(outputPath, accessToken, selectedImages, dependencies) {
    if (!outputPath || !accessToken || !Array.isArray(selectedImages) || selectedImages.length === 0) return { uploaded: [], failed: [] };
    let completed = 0;
    let authenticationError = null;
    const results = await mapWithConcurrency(selectedImages, 2, async image => {
        const folder = basename(image.folder || "");
        const filename = basename(image.name || "");
        if (!folder || !filename) return { ok: false, folder, filename, error: "Invalid image path" };
        if (authenticationError) {
            const result = { ok: false, folder, filename, error: authenticationError.message, code: authenticationError.code, notAttempted: true };
            await dependencies.onItemComplete?.(result);
            completed += 1;
            dependencies.onProgress?.(completed / selectedImages.length);
            return result;
        }
        try {
            const uploaded = await uploadImageWithRetry(join(outputPath, "cropped", folder, filename), accessToken, dependencies);
            const result = { ok: true, folder, filename, ...uploaded };
            await dependencies.onItemComplete?.(result);
            return result;
        } catch (error) {
            if (error.code === "GYAZO_AUTH_FAILED") authenticationError = error;
            const result = { ok: false, folder, filename, error: error.message, code: error.code };
            await dependencies.onItemComplete?.(result);
            return result;
        } finally {
            completed += 1;
            dependencies.onProgress?.(completed / selectedImages.length);
        }
    });
    return {
        uploaded: results.filter(result => result.ok),
        failed: results.filter(result => !result.ok),
        authError: authenticationError?.message || null,
        notAttempted: results.filter(result => result.notAttempted).length,
    };
}
