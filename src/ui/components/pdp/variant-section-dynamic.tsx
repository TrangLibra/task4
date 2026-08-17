import { revalidatePath } from "next/cache";
import type { StoreProduct } from "@medusajs/types";

import { formatMoney } from "@/lib/utils";
import { getDiscountInfo } from "@/lib/pricing";

import * as Checkout from "@/lib/checkout";

import { AddToCart } from "./add-to-cart";
import { VariantSelectionSection } from "./variant-selection";
import { StickyBar } from "./sticky-bar";
import { Badge } from "@/ui/components/ui/badge";
import { QuantitySelector } from "./quantity-selector";

interface VariantSectionDynamicProps {
	product: StoreProduct;
	channel: string;
	searchParams: Promise<{
		variant?: string;
	}>;
}

export async function VariantSectionDynamic({ product, channel, searchParams }: VariantSectionDynamicProps) {
	const { variant: variantParam } = await searchParams;

	/**
	 * Medusa variants
	 */
	const variants = product.variants ?? [];

	/**
	 * Auto select variant:
	 * - Use ?variant=...
	 * - If product has only one variant, select it automatically
	 */
	const selectedVariantId = variantParam ?? (variants.length === 1 ? variants[0]?.id : undefined);

	const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);

	/**
	 * Inventory
	 *
	 * Medusa uses inventory_quantity.
	 *
	 * Note:
	 * inventory_quantity must be requested when fetching the product.
	 */
	const isVariantAvailable = (variant: any) => {
		// Không quản lý tồn kho => luôn cho mua
		if (variant.manage_inventory === false) {
			return true;
		}

		// Cho phép đặt hàng khi hết hàng
		if (variant.allow_backorder === true) {
			return true;
		}

		// Có tồn kho
		return (variant.inventory_quantity ?? 0) > 0;
	};
	const isAvailable = variants.some(isVariantAvailable);

	const selectedVariantAvailable = selectedVariant ? isVariantAvailable(selectedVariant) : false;

	/**
	 * Add to cart button state
	 */
	const isAddToCartDisabled = !selectedVariantId || !selectedVariantAvailable;

	const disabledReason = !selectedVariantId
		? ("no-selection" as const)
		: !selectedVariantAvailable
			? ("out-of-stock" as const)
			: undefined;

	/**
	 * ---------------------------------------------------------
	 * PRICE
	 * ---------------------------------------------------------
	 *
	 * Medusa v2 uses:
	 *
	 * variant.calculated_price.calculated_amount
	 * variant.calculated_price.currency_code
	 */
	const calculatedPrice = selectedVariant?.calculated_price;

	const currentPrice =
		calculatedPrice?.calculated_amount !== undefined ? Number(calculatedPrice.calculated_amount) : undefined;

	const originalPrice =
		calculatedPrice?.original_amount !== undefined ? Number(calculatedPrice.original_amount) : undefined;

	const currencyCode = calculatedPrice?.currency_code?.toUpperCase() ?? "";

	/**
	 * Format current price
	 */
	const price =
		currentPrice !== undefined && currencyCode
			? currentPrice === 0
				? "FREE"
				: formatMoney(currentPrice, currencyCode)
			: "";

	/**
	 * Sale / discount
	 */
	const { isOnSale, discountPercent } = getDiscountInfo(currentPrice, originalPrice);

	/**
	 * Compare-at price
	 */
	const compareAtPrice =
		isOnSale && originalPrice !== undefined && currencyCode ? formatMoney(originalPrice, currencyCode) : null;

	/**
	 * ---------------------------------------------------------
	 * ADD TO CART
	 * ---------------------------------------------------------
	 *
	 * The actual cart implementation should use Medusa's
	 * Cart API / SDK.
	 */
	async function addToCart() {
		"use server";

		if (!selectedVariantId) {
			return;
		}

		try {
			/**
			 * Keep using the existing Checkout helper for now.
			 *
			 * IMPORTANT:
			 * Checkout.findOrCreate / Checkout.addLineItem
			 * must internally use Medusa.
			 */
			const checkout = await Checkout.findOrCreate({
				checkoutId: await Checkout.getIdFromCookies(channel),
				channel,
			});

			if (!checkout) {
				console.error("Add to cart: Failed to create Medusa cart");
				return;
			}

			await Checkout.saveIdToCookie(channel, checkout.id);

			/**
			 * Medusa cart line item
			 *
			 * If your Checkout helper exposes addLineItem,
			 * use it here.
			 */
			if ("addLineItem" in Checkout && typeof Checkout.addLineItem === "function") {
				await Checkout.addLineItem({
					cartId: checkout.id,
					variantId: selectedVariantId,
					quantity: 1,
				});
			} else {
				console.error(
					"Checkout.addLineItem() is not implemented. " + "Convert src/lib/checkout.ts to Medusa Cart API.",
				);

				return;
			}

			revalidatePath("/cart");
		} catch (error) {
			console.error("Add to cart failed:", error);
		}
	}

	/**
	 * Product category
	 *
	 * Medusa uses product.categories[]
	 */
	const category = product.categories?.[0];

	/**
	 * Variant section
	 */
	return (
		<>
			{/* Category + Sale/Stock badges */}
			<div className="order-1 flex items-center gap-2">
				{category?.name && <span className="text-sm text-muted-foreground">{category.name}</span>}

				{isOnSale && (
					<Badge variant="destructive" className="text-xs">
						Sale
					</Badge>
				)}

				{!isAvailable && (
					<Badge variant="secondary" className="text-xs">
						Out of stock
					</Badge>
				)}
			</div>

			{/* Variant section */}
			<form action={addToCart} className="order-3 mt-4 space-y-6">
				<VariantSelectionSection
					variants={variants}
					selectedVariantId={selectedVariantId}
					productSlug={product.handle}
					channel={channel}
					productOptions={product.options ?? []}
				/>

				<QuantitySelector />

				<AddToCart
					price={price}
					compareAtPrice={compareAtPrice}
					discountPercent={discountPercent}
					disabled={isAddToCartDisabled}
					disabledReason={disabledReason}
				/>

				<StickyBar productName={product.title} price={price} show={!isAddToCartDisabled} />
			</form>
		</>
	);
}

/**
 * Skeleton fallback
 */
export function VariantSectionSkeleton() {
	return (
		<>
			{/* Category skeleton */}
			<div className="order-1 h-4 w-20 animate-pulse animate-skeleton-delayed rounded bg-muted opacity-0" />

			{/* Variant section skeleton */}
			<div className="order-3 mt-4 animate-pulse animate-skeleton-delayed space-y-6 opacity-0">
				{/* Variant selector */}
				<div className="space-y-4">
					<div className="h-4 w-16 rounded bg-muted" />

					<div className="flex gap-2">
						<div className="h-10 w-16 rounded bg-muted" />
						<div className="h-10 w-16 rounded bg-muted" />
						<div className="h-10 w-16 rounded bg-muted" />
					</div>
				</div>

				{/* Price */}
				<div className="h-8 w-24 rounded bg-muted" />

				{/* Add to cart */}
				<div className="h-12 w-full rounded bg-muted" />
			</div>
		</>
	);
}
