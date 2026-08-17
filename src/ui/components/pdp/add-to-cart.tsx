"use client";

import { useFormStatus } from "react-dom";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { cn } from "@/lib/utils";

interface AddToCartProps {
	price: string;
	compareAtPrice?: string | null;
	discountPercent?: number | null;
	disabled?: boolean;
	disabledReason?: "no-selection" | "out-of-stock";
}

function AddToCartButton({
	disabled,
	disabledReason,
}: {
	disabled?: boolean;
	disabledReason?: "no-selection" | "out-of-stock";
}) {
	const { pending } = useFormStatus();

	const getButtonText = () => {
		if (pending) return "Đang thêm...";
		if (!disabled) return "Thêm vào giỏ";
		if (disabledReason === "out-of-stock") return "Hết hàng";
		return "Chọn phân loại";
	};
	// Simple, clean - no success state needed
	// The cart badge/drawer updating IS the feedback (like Apple)
	return (
		<Button
			type="submit"
			size="lg"
			disabled={disabled || pending}
			className={cn(
				"h-16 w-full rounded-xl bg-orange-500 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl",
				pending && "opacity-80",
			)}
		>
			<ShoppingBag className={cn("mr-2 h-5 w-5 transition-transform", pending && "scale-90")} />
			{getButtonText()}
		</Button>
	);
}

export function AddToCart({
	price,
	compareAtPrice,
	discountPercent,
	disabled = false,
	disabledReason,
}: AddToCartProps) {
	return (
		<div className="space-y-4">
			{/* Price Display */}
			<div className="flex items-baseline gap-3">
				<span className="text-4xl font-bold text-red-600">{price}</span>
				{compareAtPrice && (
					<>
						<span className="text-xl text-gray-400 line-through">{compareAtPrice}</span>
						{discountPercent && (
							<span className="rounded bg-red-500 px-2 py-1 text-xs font-bold text-white">
								-{discountPercent}%
							</span>
						)}
					</>
				)}
			</div>

			{/* Add to Cart Button */}
			<AddToCartButton disabled={disabled} disabledReason={disabledReason} />
		</div>
	);
}
