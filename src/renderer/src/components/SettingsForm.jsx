import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage
} from "@components-ui/form";
import { Input } from "@components-ui/input";
import { Button } from "@components-ui/button";
import { Switch } from "@components-ui/switch";

import { useSettings } from "@renderer/context/SettingsContext";


const schema = z.object({
    screenshotFolderPath: z.string().min(1, "Select a screenshot folder"),
    destinationFolderPath: z.string().min(1, "Select a destination folder"),
    keepOriginalImage: z.boolean(),
});

const SettingsForm = ({ formID, onValidationChange = null, ...props }) => {
    const { userSettings, setUserSettings } = useSettings();

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: userSettings || {
            screenshotFolderPath: "",
            destinationFolderPath: "",
            keepOriginalImage: true,
        },
    });

    async function handleSelectFolder(fieldName) {
        if (window.api?.selectFolder) {
            const folder = await window.api.selectFolder();
            if (folder) {
                form.setValue(fieldName, folder, { shouldValidate: true });
            }
        }
    }

    useEffect(() => {
        if (onValidationChange) {
            onValidationChange(form.formState.isValid);
        }
    }, [form.formState.isValid, onValidationChange]);


    function onSubmit(values) {
        window.api.setStorage("settings", values);
        setUserSettings(values);
        toast.success("Settings have been saved");
    }

    return (
        <div {...props}>
            <Form {...form}>
                <form id={formID} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* Screenshots Folder */}
                    <FormField
                        control={form.control}
                        name="screenshotFolderPath"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Screenshots Folder Path</FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <Input placeholder="Choose folder…" readOnly {...field} />
                                    </FormControl>
                                    <Button type="button" variant="secondary" onClick={() => handleSelectFolder("screenshotFolderPath")}>
                                        Browse
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Cropped Destination Folder */}
                    <FormField
                        control={form.control}
                        name="destinationFolderPath"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cropped Destination Folder Path</FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <Input placeholder="Choose folder…" readOnly {...field} />
                                    </FormControl>
                                    <Button type="button" variant="secondary" onClick={() => handleSelectFolder("destinationFolderPath")}>
                                        Browse
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Keep Original Image Toggle */}
                    <FormField
                        control={form.control}
                        name="keepOriginalImage"
                        render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                                <FormLabel>Keep Original Image</FormLabel>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </form>
            </Form>
        </div>
    );
};

export default SettingsForm;