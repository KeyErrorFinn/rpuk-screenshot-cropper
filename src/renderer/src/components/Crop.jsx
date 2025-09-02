import { Button } from '@compui/button';
import { Input } from '@compui/input';
import { Card } from '@compui/card';
import { Toggle } from '@compui/toggle';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@compui/accordion';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@compui/alert-dialog';

const Crop = () => {
    return (
        <>
            {/* Input */}
            <Input placeholder="Type something..." className="w-full max-w-sm" />
            <Input placeholder="Type something..." className="w-full max-w-sm" />
            <Input placeholder="Type something..." className="w-full max-w-sm" />
            <Input placeholder="Type something..." className="w-full max-w-sm" />

            {/* Card */}
            <Card className="min-w-md p-3">
                <h3 className="text-lg font-bold">Card Title</h3>
                <p className="text-sm text-gray-600">This is a card description.</p>
                <Button className="mt-2">Card Action</Button>
            </Card>

            {/* Toggle */}
            <Toggle className="bg-green-500" />

            {/* Accordion */}
            <Accordion type="single" collapsible className="w-md">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Accordion Item 1</AccordionTrigger>
                    <AccordionContent>
                        This is the content of the first accordion item.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Accordion Item 2</AccordionTrigger>
                    <AccordionContent>
                        Content for the second item.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Alert Dialog */}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button>Open Alert</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end space-x-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction>Confirm</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default Crop