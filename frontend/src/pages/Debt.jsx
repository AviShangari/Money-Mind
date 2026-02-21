import { CreditCard } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";

export default function Debt() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-1">Debt</h1>
                <p className="text-text-secondary text-sm">Track loans, credit cards, and payoff timelines.</p>
            </div>
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-24 gap-4">
                    <CreditCard size={48} strokeWidth={1.2} className="text-brand opacity-25" />
                    <div className="text-center">
                        <p className="font-semibold text-text-primary mb-1">Debt tracking coming soon</p>
                        <p className="text-sm text-text-secondary max-w-sm">
                            Add your debts and see projected payoff dates with avalanche or snowball strategies.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
