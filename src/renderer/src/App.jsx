import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@compui/card"
import { Separator } from "@compui/separator"
import { TGH2, TGH3, TGP } from "@compui/typography"
import { ScrollArea } from "@compui/scroll-area"
import { Button } from '@compui/button';
import MainScreen from '@comp/MainScreen'
import SettingsForm from '@comp/SettingsForm'
import { useSettings } from "@renderer/context/SettingsContext";
import './styles/App.scss'


function App() {
    const [isMaximized, setIsMaximized] = useState(false);
    const { userSettings, setUserSettings } = useSettings();
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        if (window.api) {
            window.api.onWindowMaximize(() => setIsMaximized(true));
            window.api.onWindowRestore(() => setIsMaximized(false));
        }
    });

    return (
        <div className={`app h-full w-full overflow-hidden flex flex-col ${isMaximized ? "maximized" : ""}`}>
            {userSettings !== null && (userSettings ? <MainScreen /> :
                <ScrollArea className="overflow-hidden [&>div>div]:h-full h-full">
                    <div className="flex flex-col h-full px-8 py-4 items-center">
                        <div className="w-full">
                            <TGH2 className="text-center">Welcome!</TGH2>
                            <TGP className="!mt-1 text-center">To begin, please set some settings.</TGP>
                        </div>
                        <div className="flex flex-grow w-full py-2 items-center justify-center">
                            <Card className="w-full max-w-xl">
                                <CardHeader>
                                    <TGH3 className="text-center">Configuration</TGH3>
                                    <Separator />
                                </CardHeader>
                                <CardContent>
                                    <SettingsForm formID="settings-form" onValidationChange={setIsValid} />
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        type="submit"
                                        form="settings-form"
                                        variant={isValid ? "default" : "outline"}
                                        className={`w-full mt-5 ${isValid ? "" : "cursor-not-allowed disabled:pointer-events-auto"}`}
                                    >Save changes</Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </ScrollArea>
            )}
        </div>
    )
}

export default App
