import { useEffect, useState } from "react";
import { Minus, Maximize, Minimize, X, Camera } from "lucide-react";

import {
    Menubar,
} from "@components-ui/menubar";

import './menubar.scss';

const AppMenuBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (window.api) {
            window.api.onWindowMaximize(() => setIsMaximized(true));
            window.api.onWindowRestore(() => setIsMaximized(false));
        }
    }, []);

    const handleMinimize = () => window.api?.minimize();
    const handleMaximize = () => {window.api?.maximize();};
    const handleClose = () => window.api?.close();

    return (
        <Menubar className="app-menu-bar rounded-none bg-secondary h-8 drag flex justify-center w-full select-none border-none z-40">
            <div className="text-sm flex items-center gap-1" onDoubleClick={() => console.log("g")}>
                <Camera size={16} fill="#0909b" />
                <div>RPUK Screenshot Cropper</div>
            </div>
            <div className="absolute right-0 flex gap-2 pr-2">
                <button onClick={handleMinimize} className="p-1 hover:bg-input rounded">
                    <Minus size={14} />
                </button>
                <button onClick={handleMaximize} className="p-1 hover:bg-input rounded">
                    {!isMaximized ? <Maximize size={12} /> : <Minimize size={12} />}
                </button>
                <button onClick={handleClose}
                    className="p-1 hover:bg-red-500 hover:text-white rounded"
                >
                    <X size={14} />
                </button>
            </div>
        </Menubar>
    );
};

export default AppMenuBar;