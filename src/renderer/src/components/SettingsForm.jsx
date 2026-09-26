/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSettings } from "@renderer/context/SettingsContext";
import { DEFAULT_CROP_INSETS } from "../../../shared/cropSettings.js";

const cropInsetSchema = z.object({ top: z.number().min(0), right: z.number().min(0), bottom: z.number().min(0), left: z.number().min(0), referenceWidth: z.number().positive().optional(), referenceHeight: z.number().positive().optional() });

const schema = z.object({
    screenshotFolderPath: z.string().min(1, "Select a screenshot folder"),
    destinationFolderPath: z.string().min(1, "Select a destination folder"),
    keepOriginalImage: z.boolean(),
    gyazoAccessToken: z.string().optional(),
    cropInsets: cropInsetSchema,
    cropPresets: z.record(z.string(), cropInsetSchema).optional(),
});

const SettingsForm = ({ formID, onValidationChange = null, compactFolderControls = false, onOpenCropArea = null, ...props }) => {
    const { userSettings, setUserSettings } = useSettings();
    const [folderHealth, setFolderHealth] = useState(null);
    const form = useForm({
        resolver: zodResolver(schema),
        mode: "onChange",
        defaultValues: userSettings ? { ...userSettings, cropInsets: userSettings.cropInsets || DEFAULT_CROP_INSETS, cropPresets: userSettings.cropPresets || {} } : {
            screenshotFolderPath: "",
            destinationFolderPath: "",
            keepOriginalImage: true,
            gyazoAccessToken: "",
            cropInsets: DEFAULT_CROP_INSETS,
            cropPresets: {},
        },
    });

    async function selectFolder(fieldName) {
        const folder = await window.api?.selectFolder();
        if (folder) form.setValue(fieldName, folder, { shouldDirty: true, shouldValidate: true });
    }

    useEffect(() => {
        onValidationChange?.(form.formState.isValid);
    }, [form.formState.isValid, onValidationChange]);

    useEffect(() => {
        if (userSettings) form.reset({ ...userSettings, cropInsets: userSettings.cropInsets || DEFAULT_CROP_INSETS, cropPresets: userSettings.cropPresets || {} });
    }, [form, userSettings]);
    useEffect(() => {
        if (!compactFolderControls) return;
        window.api.getFolderHealth().then(async health => {
            setFolderHealth(health);
            if (health.recovered && Object.keys(health.recovered).length) {
                setUserSettings(await window.api.getSettings());
                toast.success("Moved screenshot folder was found and reconnected");
            }
        }).catch(() => {});
    }, [compactFolderControls, setUserSettings, userSettings]);

    async function onSubmit(values) {
        try {
            await window.api.setSettings(values);
            setUserSettings(values);
            toast.success("Settings saved");
        } catch (error) { toast.error(error.message || "Could not save settings"); }
    }

    const inputClass = `${compactFolderControls ? "h-6 px-1.5 text-[9px]" : "px-2.5 py-1.5 text-[11px]"} min-w-0 flex-1 rounded-md border border-white/10 bg-[#101114] text-white outline-none placeholder:text-white/30 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/15`;
    const buttonClass = `${compactFolderControls ? "h-6 px-1.5 text-[9px]" : "px-2.5 py-1.5 text-[11px]"} rounded-md border border-white/10 bg-[#202227] font-semibold text-white transition hover:bg-[#292c32]`;
    const keepOriginal = form.watch("keepOriginalImage");

    return <div {...props}>
        <form id={formID} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="mb-1.5 block text-[11px] font-medium text-white/80">Screenshots folder</label>
                <div className="flex gap-2">
                    <input className={inputClass} style={compactFolderControls ? { fontSize: "9px" } : undefined} placeholder="Choose folder…" readOnly {...form.register("screenshotFolderPath")} />
                    <button className={buttonClass} type="button" onClick={() => selectFolder("screenshotFolderPath")}>Browse</button>
                </div>
                {form.formState.errors.screenshotFolderPath && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.screenshotFolderPath.message}</p>}
                {compactFolderControls && folderHealth?.source?.status !== "available" && <p className="mt-1 text-[9px] text-amber-300">Source: {folderHealth?.source?.status || "checking"}</p>}
            </div>
            <div>
                <label className="mb-1.5 block text-[11px] font-medium text-white/80">Cropped images folder</label>
                <div className="flex gap-2">
                    <input className={inputClass} style={compactFolderControls ? { fontSize: "9px" } : undefined} placeholder="Choose folder…" readOnly {...form.register("destinationFolderPath")} />
                    <button className={buttonClass} type="button" onClick={() => selectFolder("destinationFolderPath")}>Browse</button>
                </div>
                {form.formState.errors.destinationFolderPath && <p className="mt-1.5 text-xs text-red-400">{form.formState.errors.destinationFolderPath.message}</p>}
                {compactFolderControls && folderHealth?.destination?.status !== "available" && <p className="mt-1 text-[9px] text-amber-300">Destination: {folderHealth?.destination?.status || "checking"}</p>}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <div><p className="text-[11px] font-medium text-white/80">Keep original images</p><p className="mt-0.5 text-[10px] text-white/40">Save a copy before cropping.</p></div>
                <button type="button" role="switch" aria-checked={keepOriginal} onClick={() => form.setValue("keepOriginalImage", !keepOriginal, { shouldDirty: true })} className={`relative h-5 w-9 rounded-full transition ${keepOriginal ? "bg-emerald-600" : "bg-white/15"}`}>
                    <span className={`absolute top-1 size-3 rounded-full bg-white transition-all ${keepOriginal ? "left-5" : "left-1"}`} />
                </button>
            </div>
            {compactFolderControls && <div className="border-t border-white/10 pt-4">
                <label className="mb-1.5 block text-[11px] font-medium text-white/80">Gyazo access token</label>
                <input type="password" autoComplete="off" className="h-7 w-full rounded-md border border-white/10 bg-[#101114] px-2 text-[9px] text-white outline-none placeholder:text-white/30 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/15" placeholder="Paste access token" {...form.register("gyazoAccessToken")} />
                <p className="mt-1.5 text-[10px] leading-4 text-white/35">Create a token from your Gyazo developer page.</p>
            </div>}
            {compactFolderControls && <div className="border-t border-white/10 pt-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-medium text-white/80">Crop area</p><p className="mt-0.5 text-[10px] text-white/35">Choose precisely what gets removed.</p></div><button type="button" onClick={onOpenCropArea} className="h-7 shrink-0 rounded-md border border-white/10 bg-[#202227] px-2 text-[9px] font-semibold text-white hover:bg-[#292c32]">Edit crop area</button></div></div>}
        </form>
        {compactFolderControls && <button type="button" onClick={async () => { if (await window.api.exportDiagnostics()) toast.success("Diagnostic report exported"); }} className="mt-4 h-7 w-full rounded-md border border-white/10 bg-[#202227] text-[9px] font-semibold text-white/55 hover:bg-[#292c32] hover:text-white">Export diagnostic report</button>}
    </div>;
};

export default SettingsForm;
