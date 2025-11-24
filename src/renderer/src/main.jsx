import { useEffect, useState } from "react";
import { createRoot } from 'react-dom/client';

import AppMenuBar from '@components/Menubar';
import MainScreen from '@components/MainScreen';
import SetupScreen from '@components/SetupScreen';
import { Toaster } from "@components-ui/sonner";

import { SettingsProvider, useSettings } from "@renderer/context/SettingsContext";
import './styles/main.scss';
import "./styles/tailwind.css";

// TODO:
// Add CROP ALL screenshot functionality
// Add message on crop success/fail
// Make crop buttons inactive when cropping

// Add file copy to cropped images
// Add file upload functionality to cropped images
// Add link copy to cropped images
// Fix image icons being cropped on view
function App() {
    const [isMaximized, setIsMaximized] = useState(false);
    const { userSettings } = useSettings();

    useEffect(() => {
        if (window.api) {
            window.api.onWindowMaximize(() => setIsMaximized(true));
            window.api.onWindowRestore(() => setIsMaximized(false));
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
        <Toaster position="top-center" richColors />
    </>
);