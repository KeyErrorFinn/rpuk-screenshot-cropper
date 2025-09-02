import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@compui/tabs"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@compui/sheet"
import { Button } from '@compui/button';
import { ScrollArea } from "@compui/scroll-area"
import { Settings } from 'lucide-react'
import SettingsForm from '@comp/SettingsForm'
import Crop from '@comp/Crop'

const MainScreen = () => {
    return (
        <>
            <Tabs defaultValue="crop" className="w-full overflow-hidden items-center pt-2">
                <Sheet>
                    <SheetTrigger className="absolute right-2" asChild>
                        <Button variant="secondary" size="icon" onClick={(e) => e.currentTarget.blur()}>
                            <Settings />
                        </Button>
                    </SheetTrigger>
                    <SheetContent onOpenAutoFocus={(e) => { e.preventDefault() }}>
                        <SheetHeader>
                            <SheetTitle>Settings</SheetTitle>
                            <SheetDescription />
                        </SheetHeader>
                        <SettingsForm formID="settings-form" className="px-4" />
                        <SheetFooter>
                            <Button type="submit" form="settings-form">Save changes</Button>
                            <SheetClose asChild>
                                <Button variant="outline">Close</Button>
                            </SheetClose>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
                <TabsList>
                    <TabsTrigger value="crop">Crop</TabsTrigger>
                    <TabsTrigger value="view">View</TabsTrigger>
                </TabsList>
                <TabsContent value="crop" className="h-full w-full overflow-hidden flex">
                    <ScrollArea className="overflow-hidden w-full">
                        <div className={`p-8 space-y-6 items-center w-full justify-center flex flex-col`}>
                            <Crop />
                        </div>
                    </ScrollArea>
                </TabsContent>
                <TabsContent value="view" className="h-full w-full overflow-hidden flex">
                    <ScrollArea className="overflow-hidden w-full">
                        <div className={`p-8 space-y-6 items-center w-full justify-center flex flex-col`}>
                            <div>hello</div>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </>
    )
}

export default MainScreen