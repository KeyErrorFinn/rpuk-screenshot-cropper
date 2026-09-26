import { _electron as electron, expect, test } from "@playwright/test";
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";

const packagedExecutables = { win32: join(process.cwd(), "dist", "win-unpacked", "rpuk-screenshot-cropper.exe"), linux: join(process.cwd(), "dist", "linux-unpacked", "rpuk-screenshot-cropper"), darwin: join(process.cwd(), "dist", "mac", "RPUK Screenshot Cropper.app", "Contents", "MacOS", "RPUK Screenshot Cropper") };
const launchPackagedApp = userData => {
    const args = [`--user-data-dir=${userData}`];
    if (process.platform === "linux") args.push("--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage");
    return electron.launch({ executablePath: packagedExecutables[process.platform], args, env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "ELECTRON_RUN_AS_NODE")) });
};

test("main and preload expose the application shell", async () => {
    const userData = await mkdtemp(join(tmpdir(), "rpuk-e2e-"));
    const source = join(userData, "source"); const destination = join(userData, "destination");
    await mkdir(source); await mkdir(destination);
    const application = await launchPackagedApp(userData);
    try {
        const page = await application.firstWindow();
        await expect(page).toHaveTitle(/RPUK Screenshot Cropper/i);
        const bridge = await page.evaluate(async () => {
            try { return { hasApi: Boolean(window.api), hasNode: Boolean(window.process), settings: await window.api?.getSettings(), error: null }; }
            catch (error) { return { hasApi: Boolean(window.api), hasNode: Boolean(window.process), settings: null, error: error.message }; }
        });
        expect(bridge).toEqual({ hasApi: true, hasNode: false, settings: undefined, error: null });
        await page.evaluate(({ source, destination }) => window.api.setSettings({ screenshotFolderPath: source, destinationFolderPath: destination, keepOriginalImage: false, gyazoAccessToken: "", cropInsets: { top: 36, right: 0, bottom: 53, left: 0, referenceWidth: 1920, referenceHeight: 1080 }, cropPresets: {} }), { source, destination });
        await page.evaluate(() => window.api.setPreference("walkthroughComplete", true));
        await sharp({ create: { width: 1920, height: 1080, channels: 3, background: "#336699" } }).png().toFile(join(source, "smoke.png"));
        await page.reload();
        await expect(page.getByText("Incoming screenshots")).toBeVisible();
        await expect(page.getByRole("checkbox").first()).toBeVisible();
        await page.getByRole("checkbox").first().click();
        await page.getByRole("button", { name: "Crop selected" }).click();
        await expect.poll(async () => access(join(source, "smoke.png")).then(() => false).catch(() => true)).toBe(true);
    } finally { await application.close(); await rm(userData, { recursive: true, force: true }); }
});

test("filesystem watcher adds a new screenshot without reloading the renderer", async () => {
    const userData = await mkdtemp(join(tmpdir(), "rpuk-watch-e2e-"));
    const source = join(userData, "source"); const destination = join(userData, "destination");
    await mkdir(source); await mkdir(destination);
    const application = await launchPackagedApp(userData);
    try {
        const page = await application.firstWindow();
        await page.evaluate(({ source, destination }) => window.api.setSettings({ screenshotFolderPath: source, destinationFolderPath: destination, keepOriginalImage: false, gyazoAccessToken: "", cropInsets: { top: 36, right: 0, bottom: 53, left: 0, referenceWidth: 1920, referenceHeight: 1080 }, cropPresets: {} }), { source, destination });
        await page.evaluate(() => window.api.setPreference("walkthroughComplete", true));
        await page.reload();
        await expect(page.getByText("No screenshots found")).toBeVisible();
        await sharp({ create: { width: 1280, height: 720, channels: 3, background: "#224466" } }).png().toFile(join(source, "watched.png"));
        await expect(page.getByRole("checkbox")).toBeVisible();
    } finally { await application.close(); await rm(userData, { recursive: true, force: true }); }
});

test("packaged crop uses collision-safe output and can restore the batch", async () => {
    const userData = await mkdtemp(join(tmpdir(), "rpuk-undo-e2e-"));
    const source = join(userData, "source"); const destination = join(userData, "destination");
    await mkdir(source); await mkdir(destination);
    const application = await launchPackagedApp(userData);
    try {
        const page = await application.firstWindow();
        const settings = { screenshotFolderPath: source, destinationFolderPath: destination, keepOriginalImage: false, gyazoAccessToken: "", cropInsets: { top: 36, right: 0, bottom: 53, left: 0, referenceWidth: 1920, referenceHeight: 1080 }, cropPresets: {} };
        await page.evaluate(settings => window.api.setSettings(settings), settings);
        const sourceFile = join(source, "collision.png");
        await sharp({ create: { width: 1920, height: 1080, channels: 3, background: "#557799" } }).png().toFile(sourceFile);
        const modified = (await stat(sourceFile)).mtime;
        const folder = `${String(modified.getDate()).padStart(2, "0")}-${String(modified.getMonth() + 1).padStart(2, "0")}-${String(modified.getFullYear()).slice(2)}`;
        const outputFolder = join(destination, "cropped", folder); await mkdir(outputFolder, { recursive: true });
        await writeFile(join(outputFolder, "cropped_collision.png"), "existing-output");
        const result = await page.evaluate(({ source, destination }) => window.api.cropScreenshots(source, destination, false, ["collision.png"], { cropInsets: { top: 36, right: 0, bottom: 53, left: 0, referenceWidth: 1920, referenceHeight: 1080 }, cropPresets: {} }), { source, destination });
        expect(result.success).toBe(true);
        expect(result.croppedImages[0].name).toBe("cropped_collision (2).png");
        expect(await readFile(join(outputFolder, "cropped_collision.png"), "utf8")).toBe("existing-output");
        expect((await page.evaluate(() => window.api.undoLastCrop())).success).toBe(true);
        await expect.poll(async () => access(sourceFile).then(() => true).catch(() => false)).toBe(true);
    } finally { await application.close(); await rm(userData, { recursive: true, force: true }); }
});
