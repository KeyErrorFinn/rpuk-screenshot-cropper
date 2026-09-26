import { useEffect, useState } from "react";
import { Minus, Maximize, Minimize, X, Camera } from "lucide-react";
import { useAppVersion } from "@renderer/hooks/useAppVersion";

const AppMenuBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const appVersion = useAppVersion();

    useEffect(() => {
        if (window.api) {
            const stopMaximize = window.api.onWindowMaximize(() => setIsMaximized(true));
            const stopRestore = window.api.onWindowRestore(() => setIsMaximized(false));
            return () => { stopMaximize(); stopRestore(); };
        }
    }, []);

    const handleMinimize = () => window.api?.minimize();
    const handleMaximize = () => {window.api?.maximize();};
    const handleClose = () => window.api?.close();

    return (
        <header className="app-menu-bar relative z-40 flex h-8 w-full shrink-0 select-none items-center justify-center border-b border-white/10 bg-[#24262a] text-white">
            <div className="flex items-center gap-1.5 text-xs font-medium">
                <Camera size={14} />
                <span>RPUK Screenshot Cropper</span>
                {appVersion && <span className="text-[9px] font-normal text-white/35">v{appVersion}</span>}
            </div>
            <div className="window-controls absolute inset-y-0 right-0 flex">
                <button aria-label="Minimize" title="Minimize to tray" onClick={handleMinimize} className="grid w-10 place-items-center text-white/70 hover:bg-white/10 hover:text-white">
                    <Minus size={14} />
                </button>
                <button aria-label={isMaximized ? "Restore" : "Maximize"} title={isMaximized ? "Restore window" : "Maximize window"} onClick={handleMaximize} className="grid w-10 place-items-center text-white/70 hover:bg-white/10 hover:text-white">
                    {!isMaximized ? <Maximize size={12} /> : <Minimize size={12} />}
                </button>
                <button aria-label="Close" title="Close application" onClick={handleClose} className="grid w-10 place-items-center text-white/70 hover:bg-red-600 hover:text-white">
                    <X size={14} />
                </button>
            </div>
        </header>
    );
};

export default AppMenuBar;
