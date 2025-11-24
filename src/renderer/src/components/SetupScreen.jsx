import { useState } from "react";

import SettingsForm from '@components/SettingsForm';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@components-ui/card";
import { Separator } from "@components-ui/separator";
import { TGH2, TGH3, TGP } from "@components-ui/typography";
import { ScrollArea } from "@components-ui/scroll-area";
import { Button } from '@components-ui/button';

import { cn } from "@renderer/lib/utils";


const SetupScreen = () => {
    const [isValid, setIsValid] = useState(false);

    return (
        <ScrollArea className="overflow-hidden [&>div>div]:h-full h-full">
            <div className="flex flex-col h-full px-8 py-4 items-center">
                <div className="w-full">
                    <TGH2 className="text-center">Welcome!</TGH2>
                    <TGP className="mt-1! text-center">To begin, please set some settings.</TGP>
                </div>
                <div className="flex grow w-full py-2 items-center justify-center">
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
                                className={cn("w-full mt-5", isValid ? "" : "cursor-not-allowed disabled:pointer-events-auto")}
                            >Save changes</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </ScrollArea>
    );
};

export default SetupScreen;