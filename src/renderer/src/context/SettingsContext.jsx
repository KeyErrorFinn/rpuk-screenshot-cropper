/* eslint-disable react/prop-types, react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
    const [userSettings, setUserSettings] = useState(null);

    useEffect(() => {
        async function loadSettings() {
            if (window.api) {
                const settings = await window.api.getSettings();
                setUserSettings(settings);
            }
        }
        loadSettings();
        return window.api?.onSettingsChanged?.(setUserSettings);
    }, []);

    return (
        <SettingsContext.Provider value={{ userSettings, setUserSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}
