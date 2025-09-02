import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/main.scss'
import "./styles/tailwind.css";
import App from './App'
import { Toaster } from "@compui/sonner"
import AppMenuBar from '@comp/Menubar'
import { SettingsProvider } from "./context/SettingsContext";

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AppMenuBar />
        <SettingsProvider>
            <App />
        </SettingsProvider>
        <Toaster position="top-center" richColors />
    </StrictMode>
)
