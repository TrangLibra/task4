import type { StoreProduct } from "@medusajs/types";
import { describe, it, expect } from "vitest";

import {
	groupVariantsByAttributes,
	findMatchingVariant,
	getAdjustedSelections,
	getOptionsForAttribute,
	getUnavailableAttributeInfo,
	type MedusaVariant,
} from "./utils";

import {
	tshirtVariants,
	sparseVariants,
	stockVariants,
	discountedVariants,
	singleAttributeVariants,
	nameOnlyVariants,
	nameOnlyDifferentPrices,
} from "./__fixtures__/variants";

// =============================================================================
// TEST ADAPTER
// =============================================================================

/**
 * Các fixture cũ đang dùng format Saleor:
 *
 * selectionAttributes
 * quantityAvailable
 * pricing
 *
 * Trong khi utils hiện tại dùng Medusa:
 *
 * options
 * inventory_quantity
 * calculated_price
 *
 * Adapter này giúp test fixture cũ với code Medusa hiện tại.
 */

type LegacyVariant = {
	id: string;
	name?: string;
	quantityAvailable?: number | null;

	selectionAttributes?: Array<{
		attribute: {
			slug: string;
			name: string;
		};
		values: Array<{
			name: string;
			value: string;
		}>;
	}>;

	pricing?: {
		price?: {
			gross?: {
				amount?: number;
			};
		};
		discount?: {
			gross?: {
				amount?: number;
			};
		};
	};
};

type MedusaVariantWithLoosePrice = MedusaVariant & {
	calculated_price?: {
		calculated_amount?: number;
		original_amount?: number;
	};
};

/**
 * Chuyển fixture Saleor cũ -> Medusa.
 */
function toMedusaVariant(variant: LegacyVariant): MedusaVariantWithLoosePrice {
	const options =
		variant.selectionAttributes?.flatMap((attribute) =>
			attribute.values.map((value) => ({
				option_id: attribute.attribute.slug,
				value: value.name ?? value.value,
			})),
		) ?? [];

	const originalAmount = variant.pricing?.price?.gross?.amount ?? 0;

	const discountAmount = variant.pricing?.discount?.gross?.amount;

	const calculatedAmount = discountAmount !== undefined ? discountAmount : originalAmount;

	return {
		id: variant.id,
		name: variant.name ?? "",
		title: variant.name ?? "",

		options,

		manage_inventory: true,
		inventory_quantity: variant.quantityAvailable ?? 0,
		allow_backorder: false,

		calculated_price: {
			calculated_amount: calculatedAmount,
			original_amount: originalAmount,
		},
	} as unknown as MedusaVariantWithLoosePrice;
}

/**
 * Convert cả mảng fixture.
 */
function toMedusaVariants(variants: readonly LegacyVariant[]): MedusaVariant[] {
	return variants.map(toMedusaVariant);
}

const medusaTshirtVariants = toMedusaVariants(tshirtVariants);
const medusaSparseVariants = toMedusaVariants(sparseVariants);
const medusaStockVariants = toMedusaVariants(stockVariants);
const medusaDiscountedVariants = toMedusaVariants(discountedVariants);
const medusaSingleAttributeVariants = toMedusaVariants(singleAttributeVariants);
const medusaNameOnlyVariants = toMedusaVariants(nameOnlyVariants);
const medusaNameOnlyDifferentPrices = toMedusaVariants(nameOnlyDifferentPrices);

// =============================================================================
// findMatchingVariant
// =============================================================================

describe("findMatchingVariant", () => {
	it("returns undefined when no selections made", () => {
		const result = findMatchingVariant(medusaTshirtVariants, {});

		expect(result).toBeUndefined();
	});

	it("returns undefined when only partial selection (missing size)", () => {
		const result = findMatchingVariant(medusaTshirtVariants, {
			color: "black",
		});

		expect(result).toBeUndefined();
	});

	it("returns undefined when only partial selection (missing color)", () => {
		const result = findMatchingVariant(medusaTshirtVariants, {
			size: "m",
		});

		expect(result).toBeUndefined();
	});

	it("returns variant ID when all attributes selected", () => {
		const result = findMatchingVariant(medusaTshirtVariants, {
			color: "black",
			size: "m",
		});

		expect(result).toBe("tshirt-black-m");
	});

	it("returns correct variant for different selections", () => {
		expect(
			findMatchingVariant(medusaTshirtVariants, {
				color: "white",
				size: "l",
			}),
		).toBe("tshirt-white-l");

		expect(
			findMatchingVariant(medusaTshirtVariants, {
				color: "black",
				size: "s",
			}),
		).toBe("tshirt-black-s");
	});

	it("returns undefined for non-existent combination in sparse matrix", () => {
		const result = findMatchingVariant(medusaSparseVariants, {
			color: "red",
			size: "m",
		});

		expect(result).toBeUndefined();
	});

	it("returns variant for valid combination in sparse matrix", () => {
		const result = findMatchingVariant(medusaSparseVariants, {
			color: "red",
			size: "s",
		});

		expect(result).toBe("sparse-red-s");
	});

	it("works with single attribute products", () => {
		const result = findMatchingVariant(medusaSingleAttributeVariants, {
			color: "navy",
		});

		expect(result).toBe("single-navy");
	});
});

// =============================================================================
// getAdjustedSelections
// =============================================================================

describe("getAdjustedSelections", () => {
	it("adds selection to empty state", () => {
		const result = getAdjustedSelections(medusaTshirtVariants, {}, "color", "black");

		expect(result).toEqual({
			color: "black",
		});
	});

	it("adds second selection when compatible", () => {
		const result = getAdjustedSelections(
			medusaTshirtVariants,
			{
				color: "black",
			},
			"size",
			"m",
		);

		expect(result).toEqual({
			color: "black",
			size: "m",
		});
	});

	it("keeps all selections when variant exists", () => {
		const result = getAdjustedSelections(
			medusaTshirtVariants,
			{
				color: "black",
				size: "m",
			},
			"color",
			"white",
		);

		expect(result).toEqual({
			color: "white",
			size: "m",
		});
	});

	it("clears conflicting selections in sparse matrix", () => {
		const result = getAdjustedSelections(
			medusaSparseVariants,
			{
				color: "blue",
				size: "l",
			},
			"color",
			"red",
		);

		expect(result).toEqual({
			color: "red",
		});
	});

	it("clears conflicting selections when switching to incompatible size", () => {
		const result = getAdjustedSelections(
			medusaSparseVariants,
			{
				color: "red",
				size: "s",
			},
			"size",
			"l",
		);

		expect(result).toEqual({
			size: "l",
		});
	});

	it("preserves selection when switching to compatible option", () => {
		const result = getAdjustedSelections(
			medusaSparseVariants,
			{
				color: "blue",
				size: "s",
			},
			"size",
			"m",
		);

		expect(result).toEqual({
			color: "blue",
			size: "m",
		});
	});
});

// =============================================================================
// groupVariantsByAttributes
// =============================================================================

describe("groupVariantsByAttributes", () => {
	it("extracts unique attribute values", () => {
		const groups = groupVariantsByAttributes(medusaTshirtVariants);

		expect(groups).toHaveLength(2);

		const colorGroup = groups.find((group) => group.slug === "color");

		const sizeGroup = groups.find((group) => group.slug === "size");

		expect(colorGroup?.options).toHaveLength(2);

		expect(sizeGroup?.options).toHaveLength(3);
	});

	it("marks options as available based on stock", () => {
		const groups = groupVariantsByAttributes(medusaStockVariants);

		const colorGroup = groups.find((group) => group.slug === "color");

		const greenOption = colorGroup?.options.find((option) => option.name === "Green");

		const yellowOption = colorGroup?.options.find((option) => option.name === "Yellow");

		expect(greenOption?.available).toBe(true);

		expect(yellowOption?.available).toBe(false);
	});

	it("detects discounts on options", () => {
		const groups = groupVariantsByAttributes(medusaDiscountedVariants);

		const colorGroup = groups.find((group) => group.slug === "color");

		const purpleOption = colorGroup?.options.find((option) => option.name === "Purple");

		const orangeOption = colorGroup?.options.find((option) => option.name === "Orange");

		expect(purpleOption?.hasDiscount).toBe(true);

		expect(purpleOption?.discountPercent).toBe(20);

		expect(orangeOption?.hasDiscount).toBe(true);

		expect(orangeOption?.discountPercent).toBe(100);
	});

	it("handles $0 price correctly", () => {
		const groups = groupVariantsByAttributes(medusaDiscountedVariants);

		const sizeGroup = groups.find((group) => group.slug === "size");

		const sOption = sizeGroup?.options.find((option) => option.name === "S");

		expect(sOption?.hasDiscount).toBe(true);
	});

	it("sorts color attributes first, then size", () => {
		const groups = groupVariantsByAttributes(medusaTshirtVariants);

		expect(groups[0]?.slug).toBe("color");

		expect(groups[1]?.slug).toBe("size");
	});
});

// =============================================================================
// getOptionsForAttribute
// =============================================================================

describe("getOptionsForAttribute", () => {
	it("marks all options as existsWithCurrentSelection when no other selections", () => {
		const groups = groupVariantsByAttributes(medusaTshirtVariants);

		const colorOptions = getOptionsForAttribute(medusaTshirtVariants, groups, {}, "color");

		colorOptions.forEach((option) => {
			expect(option.existsWithCurrentSelection).toBe(true);
		});
	});

	it("marks incompatible options in sparse matrix", () => {
		const groups = groupVariantsByAttributes(medusaSparseVariants);

		const sizeOptions = getOptionsForAttribute(
			medusaSparseVariants,
			groups,
			{
				color: "red",
			},
			"size",
		);

		const sOption = sizeOptions.find((option) => option.name === "S");

		const mOption = sizeOptions.find((option) => option.name === "M");

		const lOption = sizeOptions.find((option) => option.name === "L");

		expect(sOption?.existsWithCurrentSelection).toBe(true);

		expect(mOption?.existsWithCurrentSelection).toBe(false);

		expect(lOption?.existsWithCurrentSelection).toBe(false);
	});

	it("all sizes exist with Blue selection", () => {
		const groups = groupVariantsByAttributes(medusaSparseVariants);

		const sizeOptions = getOptionsForAttribute(
			medusaSparseVariants,
			groups,
			{
				color: "blue",
			},
			"size",
		);

		sizeOptions.forEach((option) => {
			expect(option.existsWithCurrentSelection).toBe(true);
		});
	});
});

// =============================================================================
// getUnavailableAttributeInfo
// =============================================================================

describe("getUnavailableAttributeInfo", () => {
	it("returns null when no selections", () => {
		const groups = groupVariantsByAttributes(medusaStockVariants);

		const result = getUnavailableAttributeInfo(medusaStockVariants, groups, {});

		expect(result).toBeNull();
	});

	it("returns null when selections have available options", () => {
		const groups = groupVariantsByAttributes(medusaTshirtVariants);

		const result = getUnavailableAttributeInfo(medusaTshirtVariants, groups, {
			color: "black",
		});

		expect(result).toBeNull();
	});

	it("returns null when at least one compatible option exists", () => {
		const groups = groupVariantsByAttributes(medusaSparseVariants);

		const result = getUnavailableAttributeInfo(medusaSparseVariants, groups, {
			color: "red",
		});

		expect(result).toBeNull();
	});

	it("returns null when out of stock but variant exists", () => {
		const groups = groupVariantsByAttributes(medusaStockVariants);

		const result = getUnavailableAttributeInfo(medusaStockVariants, groups, {
			color: "yellow",
		});

		expect(result).toBeNull();
	});

	it("detects dead-end when all options are both incompatible AND unavailable", () => {
		const deadEndVariants = toMedusaVariants([
			{
				id: "de-pink-xl",
				name: "Pink / XL",
				quantityAvailable: 0,

				selectionAttributes: [
					{
						attribute: {
							slug: "color",
							name: "Color",
						},
						values: [
							{
								name: "Pink",
								value: "pink",
							},
						],
					},
					{
						attribute: {
							slug: "size",
							name: "Size",
						},
						values: [
							{
								name: "XL",
								value: "xl",
							},
						],
					},
				],
			},
			{
				id: "de-blue-s",
				name: "Blue / S",
				quantityAvailable: 10,

				selectionAttributes: [
					{
						attribute: {
							slug: "color",
							name: "Color",
						},
						values: [
							{
								name: "Blue",
								value: "blue",
							},
						],
					},
					{
						attribute: {
							slug: "size",
							name: "Size",
						},
						values: [
							{
								name: "S",
								value: "s",
							},
						],
					},
				],
			},
		]);

		const groups = groupVariantsByAttributes(deadEndVariants);

		const result = getUnavailableAttributeInfo(deadEndVariants, groups, {
			color: "pink",
		});

		expect(result).not.toBeNull();

		expect(result?.slug).toBe("size");

		expect(result?.blockedBy).toBe("Pink");
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("edge cases", () => {
	it("handles empty variants array", () => {
		const groups = groupVariantsByAttributes([]);

		expect(groups).toEqual([]);

		const match = findMatchingVariant([], {
			color: "black",
		});

		expect(match).toBeUndefined();
	});

	it("handles variant with no attributes", () => {
		const noAttrVariants = toMedusaVariants([
			{
				id: "v1",
				name: "Default",
				quantityAvailable: 10,
				selectionAttributes: [],
			},
		]);

		const groups = groupVariantsByAttributes(noAttrVariants);

		expect(groups).toEqual([]);
	});

	it("returns empty groups for name-only variants", () => {
		const groups = groupVariantsByAttributes(medusaNameOnlyVariants);

		expect(groups).toEqual([]);

		expect(nameOnlyVariants).toHaveLength(3);

		expect(nameOnlyVariants[0]?.name).toBe("Navy blue S");
	});

	it("returns empty groups for gift cards with different prices", () => {
		const groups = groupVariantsByAttributes(medusaNameOnlyDifferentPrices);

		expect(groups).toEqual([]);

		expect(nameOnlyDifferentPrices[0]?.pricing?.price?.gross.amount).toBe(25);

		expect(nameOnlyDifferentPrices[2]?.pricing?.price?.gross.amount).toBe(100);
	});

	it("handles null/undefined quantity gracefully", () => {
		const nullQtyVariants = toMedusaVariants([
			{
				id: "v1",
				name: "Test Blue",
				quantityAvailable: null,

				selectionAttributes: [
					{
						attribute: {
							slug: "color",
							name: "Color",
						},
						values: [
							{
								name: "Blue",
								value: "blue",
							},
						],
					},
				],
			},
			{
				id: "v2",
				name: "Test Red",
				quantityAvailable: 5,

				selectionAttributes: [
					{
						attribute: {
							slug: "color",
							name: "Color",
						},
						values: [
							{
								name: "Red",
								value: "red",
							},
						],
					},
				],
			},
		]);

		const groups = groupVariantsByAttributes(nullQtyVariants);

		const blueOption = groups[0]?.options.find((option) => option.name === "Blue");

		const redOption = groups[0]?.options.find((option) => option.name === "Red");

		expect(blueOption?.available).toBe(false);

		expect(redOption?.available).toBe(true);
	});
});
