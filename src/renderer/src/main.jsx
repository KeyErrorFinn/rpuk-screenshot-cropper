/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { createRoot } from 'react-dom/client';

import AppMenuBar from '@components/Menubar';
import MainScreen from '@components/MainScreen';
import SetupScreen from '@components/SetupScreen';
import { Toaster } from "sonner";

import { SettingsProvider, useSettings } from "@renderer/context/SettingsContext";
import './styles/main.scss';
import "./styles/tailwind.css";

function App() {
    const [isMaximized, setIsMaximized] = useState(false);
    const { userSettings } = useSettings();

    useEffect(() => {
        if (window.api) {
            const stopMaximize = window.api.onWindowMaximize(() => setIsMaximized(true));
            const stopRestore = window.api.onWindowRestore(() => setIsMaximized(false));
            return () => { stopMaximize(); stopRestore(); };
        }
    }, []);

    return (
        <div className={`app h-full w-full overflow-hidden flex flex-col ${isMaximized ? "maximized" : ""}`}>
            {userSettings !== null && (userSettings ? <MainScreen /> : <SetupScreen />)}
        </div>
    );
}


createRoot(document.getElementById('root')).render(
    <>
        <AppMenuBar />
        <SettingsProvider>
            <App />
        </SettingsProvider>
        <Toaster position="top-center" offset={44} theme="dark" richColors closeButton />
    </>
);
