/* eslint-disable react/prop-types */
import { AlertCircle, Images, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function BatchHistory({ open, onClose, onRestored }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [undoing, setUndoing] = useState(null);
    const load = async () => {
        setLoading(true);
        try {
            const history = await window.api.getCropBatches();
            setBatches(history.filter(batch => batch.status !== "undone"));
        } finally { setLoading(false); }
    };
    useEffect(() => { if (open) load(); }, [open]);
    if (!open) return null;

    const undo = async id => {
        setUndoing(id);
        try {
            const result = await window.api.undoCropBatch(id);
            if (!result.success) {
                toast.error(result.conflicts?.[0]?.error || result.errors?.[0]?.error || result.reason || "Could not undo batch");
                return;
            }
            setBatches(previous => previous.filter(batch => batch.id !== id));
            toast.success("Crop batch restored");
            await onRestored?.(result);
        } catch (error) {
            toast.error(`Could not restore crop batch: ${error.message}`);
        } finally { setUndoing(null); }
    };

    return <div className="fixed inset-x-0 bottom-0 top-8 z-50 flex justify-end bg-black/65" onClick={undoing ? undefined : onClose}>
        <aside role="dialog" aria-modal="true" aria-labelledby="history-title" aria-busy={Boolean(undoing)} className="flex h-full w-[360px] flex-col border-l border-white/10 bg-[#141518] shadow-2xl" onClick={event => event.stopPropagation()}>
            <header className="flex h-16 items-center border-b border-white/10 px-4">
                <div><h2 id="history-title" className="text-sm font-semibold">Crop history</h2><p className="mt-0.5 text-[11px] text-white/45">Undo a completed crop batch</p></div>
                <button disabled={Boolean(undoing)} className="ml-auto grid size-8 place-items-center rounded-md text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-40" onClick={onClose} aria-label="Close crop history"><X size={15} /></button>
            </header>
            {undoing && <div role="status" className="flex items-center gap-2 border-b border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-200"><LoaderCircle className="animate-spin" size={15} />Restoring files and removing cropped copies…</div>}
            <div className="min-h-0 flex-1 overflow-auto p-3">
                {loading ? <div className="grid h-24 place-items-center"><LoaderCircle className="animate-spin text-white/45" size={18} /></div> : batches.length === 0 ? <div className="grid h-40 place-items-center text-center"><div><Images className="mx-auto text-white/20" size={22} /><p className="mt-3 text-xs font-medium text-white/60">No batches available to undo</p><p className="mt-1 text-[11px] text-white/35">Completed crops will appear here.</p></div></div> : batches.map(batch => {
                    const busy = undoing === batch.id;
                    const canUndo = batch.status === "complete" || batch.status === "undo-failed";
                    return <article key={batch.id} className={`mb-2 rounded-lg border p-3 transition ${busy ? "border-emerald-400/30 bg-emerald-500/[0.06]" : "border-white/10 bg-[#1b1d21]"}`}>
                        <div className="flex items-start gap-3">
                            <div className="grid size-8 shrink-0 place-items-center rounded-md bg-white/[0.06] text-white/55"><Images size={14} /></div>
                            <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-white/90">{batch.itemCount} image{batch.itemCount === 1 ? "" : "s"}</p><p className="mt-0.5 text-[11px] text-white/40">{new Date(batch.createdAt).toLocaleString("en-GB")}</p></div>
                            {batch.status !== "complete" && <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300"><AlertCircle size={11} />Needs attention</span>}
                        </div>
                        <p className="mt-3 truncate text-[11px] leading-4 text-white/50" title={batch.files.join(", ")}>{batch.files.slice(0, 2).join(", ")}{batch.files.length > 2 ? ` +${batch.files.length - 2} more` : ""}</p>
                        {batch.errors?.[0] && <p className="mt-2 rounded bg-red-500/10 px-2 py-1.5 text-[11px] leading-4 text-red-300">{batch.errors[0].error}</p>}
                        <button disabled={!canUndo || Boolean(undoing)} onClick={() => undo(batch.id)} className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-[#24262b] px-3 text-[11px] font-semibold text-white/75 hover:bg-[#2c2f35] hover:text-white disabled:opacity-40">{busy ? <LoaderCircle className="animate-spin" size={13} /> : <RotateCcw size={13} />}{busy ? "Restoring batch…" : "Undo batch"}</button>
                    </article>;
                })}
            </div>
        </aside>
    </div>;
}
