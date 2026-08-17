import type { StoreProduct } from "@medusajs/types";
import type { VariantOption, AttributeGroup } from "./types";

import { getColorHex, isColorAttribute, isSizeAttribute, COLOR_NAME_TO_HEX } from "@/lib/colors";

import { sortBySizeProperty } from "@/lib/sizes";
import { getDiscountInfo } from "@/lib/pricing";

export { COLOR_NAME_TO_HEX };

export type MedusaVariant = NonNullable<StoreProduct["variants"]>[number];
export type MedusaProductOption = NonNullable<StoreProduct["options"]>[number];

/* ============================================================
 * HELPERS
 * ============================================================ */

function normalizeValue(value: string | null | undefined): string {
	return (value ?? "").toLowerCase().trim().replace(/\s+/g, "-");
}

function normalizeOptionName(value: string | null | undefined): string {
	return (value ?? "")
		.toLowerCase()
		.trim()
		.replace(/[_\s]+/g, "-");
}

function getVariantOptions(variant: MedusaVariant) {
	return variant.options ?? [];
}

function isVariantAvailable(variant: MedusaVariant): boolean {
	if (variant.manage_inventory === false) {
		return true;
	}

	return (variant.inventory_quantity ?? 0) > 0;
}

function getVariantDiscount(variant: MedusaVariant) {
	return getDiscountInfo(
		variant.calculated_price?.calculated_amount,
		variant.calculated_price?.original_amount,
	);
}

function getMaxDiscountInfo(variants: MedusaVariant[]) {
	let hasDiscount = false;
	let maxPercent = 0;

	for (const variant of variants) {
		const discount = getVariantDiscount(variant);

		if (discount.isOnSale) {
			hasDiscount = true;
			maxPercent = Math.max(maxPercent, discount.discountPercent ?? 0);
		}
	}

	return {
		hasDiscount,
		maxPercent,
	};
}

/* ============================================================
 * PRODUCT OPTIONS
 * ============================================================ */

function createProductOptionMap(productOptions: MedusaProductOption[]) {
	const map = new Map<
		string,
		{
			title: string;
			slug: string;
		}
	>();

	for (const option of productOptions) {
		if (!option.id || !option.title) continue;

		const title = option.title.trim();
		const normalized = normalizeOptionName(title);

		let slug = normalized;

		if (normalized === "color" || normalized === "colour") {
			slug = "color";
		}

		if (normalized === "size" || normalized === "product-size") {
			slug = "size";
		}

		map.set(option.id, {
			title,
			slug,
		});
	}

	return map;
}

/* ============================================================
 * GROUP VARIANTS
 * ============================================================ */

export function groupVariantsByAttributes(
	variants: MedusaVariant[],
	productOptions: MedusaProductOption[] = [],
): AttributeGroup[] {
	const optionMap = createProductOptionMap(productOptions);

	const groups = new Map<
		string,
		{
			optionId: string;
			name: string;
			slug: string;
			options: Map<
				string,
				{
					name: string;
					variantIds: Set<string>;
					colorHex?: string;
				}
			>;
		}
	>();

	for (const variant of variants) {
		for (const variantOption of getVariantOptions(variant)) {
			const optionId = variantOption.option_id;
			const value = variantOption.value?.trim();

			if (!optionId || !value) continue;

			const productOption = optionMap.get(optionId);

			/*
			 * Nếu Medusa product.options không được trả về,
			 * thử đoán từ option_id.
			 */
			const title =
				productOption?.title ??
				(isColorAttribute(optionId) ? "Color" : isSizeAttribute(optionId) ? "Size" : optionId);

			const slug = productOption?.slug ?? normalizeOptionName(title);

			if (!groups.has(optionId)) {
				groups.set(optionId, {
					optionId,
					name: title,
					slug,
					options: new Map(),
				});
			}

			const group = groups.get(optionId)!;

			if (!group.options.has(value)) {
				const isColor = slug === "color" || slug === "colour" || isColorAttribute(optionId);

				group.options.set(value, {
					name: value,
					variantIds: new Set(),
					colorHex: isColor
						? getColorHex({
								name: value,
								value,
							})
						: undefined,
				});
			}

			group.options.get(value)!.variantIds.add(variant.id);
		}
	}

	const result: AttributeGroup[] = [];

	for (const group of groups.values()) {
		const options: VariantOption[] = [];

		for (const option of group.options.values()) {
			const relatedVariants = variants.filter((variant) => option.variantIds.has(variant.id));

			const available = relatedVariants.some(isVariantAvailable);

			const { hasDiscount, maxPercent } = getMaxDiscountInfo(relatedVariants);

			options.push({
				id: normalizeValue(option.name),
				name: option.name,
				available,
				existsWithCurrentSelection: true,
				hasDiscount,
				discountPercent: maxPercent > 0 ? maxPercent : undefined,
				colorHex: option.colorHex,
				variantIds: [...option.variantIds],
			});
		}

		const sorted = group.slug === "size" ? sortBySizeProperty(options) : options;

		result.push({
			slug: group.slug,
			name: group.name,
			options: sorted,
		});
	}

	/*
	 * Color trước
	 * Size sau
	 */
	result.sort((a, b) => {
		if (a.slug === "color") return -1;
		if (b.slug === "color") return 1;

		if (a.slug === "size") return -1;
		if (b.slug === "size") return 1;

		return 0;
	});

	return result;
}

/* ============================================================
 * FIND MATCHING VARIANT
 * ============================================================ */

export function findMatchingVariant(
	variants: MedusaVariant[],
	selections: Record<string, string>,
	productOptions: MedusaProductOption[] = [],
): string | undefined {
	const groups = groupVariantsByAttributes(variants, productOptions);

	if (!groups.length) {
		return variants.length === 1 ? variants[0]?.id : undefined;
	}

	// Phải chọn đủ Color / Size / các option khác
	const allSelected = groups.every((group) => Boolean(selections[group.slug]));

	if (!allSelected) {
		return undefined;
	}

	const optionMap = createProductOptionMap(productOptions);

	const matchingVariant = variants.find((variant) => {
		return groups.every((group) => {
			const selectedValue = selections[group.slug];

			if (!selectedValue) {
				return false;
			}

			const productOption = [...optionMap.entries()].find(([, data]) => data.slug === group.slug);

			if (!productOption) {
				return false;
			}

			const optionId = productOption[0];

			const variantOption = getVariantOptions(variant).find((option) => option.option_id === optionId);

			if (!variantOption) {
				return false;
			}

			return normalizeValue(variantOption.value) === normalizeValue(selectedValue);
		});
	});

	return matchingVariant?.id;
}

/* ============================================================
 * GET SELECTIONS FROM VARIANT
 * ============================================================ */

export function getSelectionsFromVariant(
	variants: MedusaVariant[],
	variantId: string,
	productOptions: MedusaProductOption[] = [],
): Record<string, string> {
	const variant = variants.find((item) => item.id === variantId);

	if (!variant) return {};

	const optionMap = createProductOptionMap(productOptions);

	const selections: Record<string, string> = {};

	for (const option of getVariantOptions(variant)) {
		if (!option.option_id || !option.value) {
			continue;
		}

		const productOption = optionMap.get(option.option_id);

		if (!productOption) {
			continue;
		}

		selections[productOption.slug] = normalizeValue(option.value);
	}

	return selections;
}

/* ============================================================
 * GET OPTIONS FOR ATTRIBUTE
 * ============================================================ */

export function getOptionsForAttribute(
	variants: MedusaVariant[],
	attributeGroups: AttributeGroup[],
	currentSelections: Record<string, string>,
	targetAttributeSlug: string,
	productOptions: MedusaProductOption[] = [],
): VariantOption[] {
	const group = attributeGroups.find((item) => item.slug === targetAttributeSlug);

	if (!group) return [];

	const optionMap = createProductOptionMap(productOptions);

	const targetProductOption = [...optionMap.entries()].find(([, data]) => data.slug === targetAttributeSlug);

	if (!targetProductOption) {
		return group.options;
	}

	const targetOptionId = targetProductOption[0];

	const otherSelections = Object.entries(currentSelections).filter(
		([slug, value]) => slug !== targetAttributeSlug && Boolean(value),
	);

	return group.options.map((option) => {
		const matchingVariants = variants.filter((variant) => {
			const targetVariantOption = getVariantOptions(variant).find(
				(item) => item.option_id === targetOptionId && normalizeValue(item.value) === option.id,
			);

			if (!targetVariantOption) {
				return false;
			}

			return otherSelections.every(([slug, selectedValue]) => {
				const otherGroup = attributeGroups.find((item) => item.slug === slug);

				if (!otherGroup) return false;

				const otherProductOption = [...optionMap.entries()].find(([, data]) => data.slug === slug);

				if (!otherProductOption) return false;

				const otherOptionId = otherProductOption[0];

				return getVariantOptions(variant).some(
					(item) =>
						item.option_id === otherOptionId && normalizeValue(item.value) === normalizeValue(selectedValue),
				);
			});
		});

		const available = matchingVariants.some(isVariantAvailable);

		const { hasDiscount, maxPercent } = getMaxDiscountInfo(matchingVariants);

		return {
			...option,
			available,
			hasDiscount,
			discountPercent: maxPercent > 0 ? maxPercent : undefined,
			existsWithCurrentSelection: matchingVariants.length > 0,
		};
	});
}

/* ============================================================
 * ADJUST SELECTIONS
 * ============================================================ */

export function getAdjustedSelections(
	variants: MedusaVariant[],
	currentSelections: Record<string, string>,
	attributeSlug: string,
	newValue: string,
): Record<string, string> {
	return {
		...currentSelections,
		[attributeSlug]: normalizeValue(newValue),
	};
}

/* ============================================================
 * AVAILABLE OPTIONS
 * ============================================================ */

export const getAvailableOptionsForAttribute = getOptionsForAttribute;

/* ============================================================
 * UNAVAILABLE INFO
 * ============================================================ */

export function getUnavailableAttributeInfo(
	variants: MedusaVariant[],
	attributeGroups: AttributeGroup[],
	currentSelections: Record<string, string>,
	productOptions: MedusaProductOption[] = [],
) {
	const selections = Object.entries(currentSelections).filter(([, value]) => Boolean(value));

	if (!selections.length) {
		return null;
	}

	for (const group of attributeGroups) {
		if (currentSelections[group.slug]) {
			continue;
		}

		const options = getOptionsForAttribute(
			variants,
			attributeGroups,
			currentSelections,
			group.slug,
			// cần truyền productOptions vào đây
			productOptions,
		);
		const available = options.some(
			(option) => option.available && option.existsWithCurrentSelection !== false,
		);

		if (!available) {
			const last = selections[selections.length - 1];

			return {
				slug: group.slug,
				name: group.name,
				blockedBy: last[1],
			};
		}
	}

	return null;
}
