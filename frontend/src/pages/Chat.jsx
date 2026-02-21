import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";

export default function Chat() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-1">Chat</h1>
                <p className="text-text-secondary text-sm">Ask questions about your finances in plain language.</p>
            </div>
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-24 gap-4">
                    <MessageSquare size={48} strokeWidth={1.2} className="text-brand opacity-25" />
                    <div className="text-center">
                        <p className="font-semibold text-text-primary mb-1">AI chat coming soon</p>
                        <p className="text-sm text-text-secondary max-w-sm">
                            Ask things like "How much did I spend on food last month?" and get instant answers.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
