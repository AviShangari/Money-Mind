import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";

export default function Insights() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-1">Insights</h1>
                <p className="text-text-secondary text-sm">AI-powered analysis of your spending patterns.</p>
            </div>
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-24 gap-4">
                    <TrendingUp size={48} strokeWidth={1.2} className="text-brand opacity-25" />
                    <div className="text-center">
                        <p className="font-semibold text-text-primary mb-1">Smart insights coming soon</p>
                        <p className="text-sm text-text-secondary max-w-sm">
                            Get personalized recommendations and anomaly detection across your financial history.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
