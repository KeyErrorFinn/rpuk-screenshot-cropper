import { useState } from "react";
import SettingsForm from "@components/SettingsForm";

const SetupScreen = () => {
    const [isValid, setIsValid] = useState(false);

    return <main className="flex h-full items-center justify-center overflow-auto bg-[#090a0c] p-8 text-white">
        <section className="w-full max-w-lg rounded-xl border border-white/10 bg-[#141518] p-7 shadow-2xl shadow-black/30">
            <header className="mb-6 border-b border-white/10 pb-5 text-center">
                <h1 className="text-xl font-semibold tracking-tight">Set up RPUK Cropper</h1>
                <p className="mt-1.5 text-xs text-white/45">Choose where screenshots come from and where cropped images should go.</p>
            </header>
            <SettingsForm formID="settings-form" onValidationChange={setIsValid} />
            <button type="submit" form="settings-form" disabled={!isValid} className="mt-7 h-9 w-full rounded-md bg-emerald-600 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">Save settings</button>
        </section>
    </main>;
};

export default SetupScreen;
