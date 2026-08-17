"use client";

import type { StoreProductVariant } from "@medusajs/types";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Fallback selector for variants that have no structured attributes.
 *
 * Used when variants only have names (e.g., "Navy blue S", "Navy blue M")
 * but no attribute data for grouping by Color/Size/etc.
 *
 * ## When this is used
 *
 * - Variants have empty `attributes` arrays
 * - Product has multiple variants but no attribute-based grouping possible
 *
 * ## Limitations vs. structured attributes
 *
 * - No color swatches or visual differentiation
 * - No cross-filtering (can't gray out incompatible options)
 * - Combinatorial explosion for products with many variants
 * - Inconsistent UX compared to attribute-based selectors
 *
 * Consider configuring proper variant attributes in Saleor Dashboard
 * for a better customer experience.
 */

interface VariantNameSelectorProps {
	variants: StoreProductVariant[];
	selectedVariantId?: string;
	onSelect: (variantId: string) => void;
	label?: string;
	isPending?: boolean;
}

export function VariantNameSelector({
	variants,
	selectedVariantId,
	onSelect,
	label = "Variant",
	isPending,
}: VariantNameSelectorProps) {
	const selectedVariant = variants.find((v) => v.id === selectedVariantId);

	// Lấy giá hiện tại của các variant
	const prices = variants
		.map((v) => v.calculated_price?.calculated_amount)
		.filter((p): p is number => p !== undefined && p !== null);

	const showPrices = prices.length > 1 && new Set(prices).size > 1;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium">{label}</span>

				{selectedVariant && <span className="text-sm text-muted-foreground">{selectedVariant.title}</span>}
			</div>

			<div
				role="group"
				aria-label={label}
				aria-busy={isPending}
				className={cn(
					"flex flex-wrap gap-3 transition-opacity duration-150",
					isPending && "pointer-events-none opacity-60",
				)}
				style={{
					transitionDelay: isPending ? "100ms" : "0ms",
				}}
			>
				{variants.map((variant) => {
					const isSelected = variant.id === selectedVariantId;

					// Medusa inventory
					const isOutOfStock =
						variant.manage_inventory === true &&
						(variant.inventory_quantity ?? 0) <= 0 &&
						variant.allow_backorder !== true;

					const price = variant.calculated_price?.calculated_amount;

					const originalPrice = variant.calculated_price?.original_amount;

					const currencyCode = variant.calculated_price?.currency_code;

					const hasDiscount =
						typeof price === "number" && typeof originalPrice === "number" && originalPrice > price;

					const discountPercent = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : null;

					const accessibleParts = [
						variant.title,
						isOutOfStock && "out of stock",
						showPrices && typeof price === "number" && currencyCode && formatMoney(price, currencyCode),
						discountPercent && `${discountPercent}% off`,
					].filter(Boolean);

					return (
						<div key={variant.id} className="relative">
							<button
								type="button"
								onClick={() => onSelect(variant.id)}
								disabled={isOutOfStock}
								aria-disabled={isOutOfStock}
								aria-label={accessibleParts.join(", ")}
								aria-pressed={isSelected}
								className={cn(
									"h-12 min-w-[4.5rem] rounded-lg border px-4 text-sm font-medium transition-all",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",

									isSelected
										? "border-foreground bg-foreground text-background"
										: "border-border bg-background text-foreground hover:border-foreground",

									isOutOfStock && "cursor-not-allowed text-muted-foreground line-through opacity-60",
								)}
								title={isOutOfStock ? `${variant.title} - Out of stock` : undefined}
							>
								<span className="flex items-center gap-2">
									{variant.title}

									{showPrices && typeof price === "number" && currencyCode && (
										<span className={cn("text-xs", isSelected ? "opacity-80" : "text-muted-foreground")}>
											{formatMoney(price, currencyCode)}
										</span>
									)}
								</span>
							</button>

							{discountPercent && discountPercent > 0 && !isOutOfStock && (
								<span
									className="pointer-events-none absolute -bottom-2 -right-1 rounded-full border border-destructive bg-background px-1.5 py-0.5 text-[10px] font-semibold text-destructive"
									aria-hidden="true"
								>
									-{discountPercent}%
								</span>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
