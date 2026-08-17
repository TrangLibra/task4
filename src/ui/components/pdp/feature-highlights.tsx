import { CheckCircle2 } from "lucide-react";

interface FeatureHighlightsProps {
	features: string[];
}

export function FeatureHighlights({ features }: FeatureHighlightsProps) {
	if (features.length === 0) return null;

	return (
		<div className="mt-8 rounded-2xl border bg-orange-50 p-6">
			<h2 className="mb-5 text-xl font-bold text-orange-600">ĐẶC ĐIỂM NỔI BẬT</h2>

			<div className="space-y-3">
				{features.map((feature, index) => (
					<div key={index} className="flex items-start gap-3">
						<CheckCircle2 className="mt-1 h-5 w-5 text-orange-500" />
						<p className="text-gray-700">{feature}</p>
					</div>
				))}
			</div>
		</div>
	);
}
