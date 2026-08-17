"use client";

import type { StoreProduct } from "@medusajs/types";
import { useCallback, useMemo, useEffect, useTransition, useOptimistic } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { VariantSelectionSectionProps } from "./types";
import { VariantSelector } from "./variant-selector";
import { VariantNameSelector } from "./variant-name-selector";

import {
	groupVariantsByAttributes,
	findMatchingVariant,
	getSelectionsFromVariant,
	getOptionsForAttribute,
	getAdjustedSelections,
	getUnavailableAttributeInfo,
	type MedusaVariant,
} from "./utils";

import { VariantAttributeBadges, extractOptionalAttributes } from "./optional-attributes";

interface Props extends VariantSelectionSectionProps {
	/**
	 * Product options lấy trực tiếp từ Medusa Product.
	 *
	 * Ví dụ:
	 * [
	 *   {
	 *     id: "opt_...",
	 *     title: "Color",
	 *   },
	 *   {
	 *     id: "opt_...",
	 *     title: "Size",
	 *   }
	 * ]
	 */
	productOptions?: NonNullable<StoreProduct["options"]>;
}

export function VariantSelectionSection({
	variants,
	selectedVariantId,
	productSlug,
	channel,
	productOptions = [],
	children,
}: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [isPending, startTransition] = useTransition();

	/**
	 * ============================================================
	 * ATTRIBUTE GROUPS
	 * ============================================================
	 *
	 * Quan trọng:
	 *
	 * Medusa variant:
	 *
	 * options: [
	 *   {
	 *     option_id: "opt_xxx",
	 *     value: "Black"
	 *   },
	 *   {
	 *     option_id: "opt_yyy",
	 *     value: "M"
	 *   }
	 * ]
	 *
	 * Product options:
	 *
	 * [
	 *   {
	 *     id: "opt_xxx",
	 *     title: "Color"
	 *   },
	 *   {
	 *     id: "opt_yyy",
	 *     title: "Size"
	 *   }
	 * ]
	 *
	 * => utils sẽ map:
	 *
	 * opt_xxx -> Color
	 * opt_yyy -> Size
	 */
	const attributeGroups = useMemo(() => {
		return groupVariantsByAttributes(variants as MedusaVariant[], productOptions);
	}, [variants, productOptions]);

	/**
	 * ============================================================
	 * CURRENT SELECTIONS
	 * ============================================================
	 *
	 * Ưu tiên lấy từ URL:
	 *
	 * ?color=black&size=m&variant=xxx
	 *
	 * Nếu chưa có URL thì lấy từ selectedVariantId.
	 */
	const currentSelections = useMemo(() => {
		const selections: Record<string, string> = {};

		for (const group of attributeGroups) {
			const paramValue = searchParams.get(group.slug);

			if (paramValue) {
				selections[group.slug] = paramValue;
			}
		}

		/**
		 * Nếu URL chưa có color/size
		 * nhưng đã có variant ID
		 * thì lấy option từ variant đó.
		 */
		if (Object.keys(selections).length === 0 && selectedVariantId) {
			return getSelectionsFromVariant(variants as MedusaVariant[], selectedVariantId, productOptions);
		}

		return selections;
	}, [attributeGroups, searchParams, selectedVariantId, variants, productOptions]);
	/**
	 * ============================================================
	 * OPTIMISTIC SELECTIONS
	 * ============================================================
	 *
	 * Khi user click Color / Size,
	 * UI đổi ngay lập tức mà không phải chờ server.
	 */
	const [optimisticSelections, setOptimisticSelections] = useOptimistic(currentSelections);

	/**
	 * ============================================================
	 * OPTIMISTIC VARIANT ID
	 * ============================================================
	 */
	const [optimisticVariantId, setOptimisticVariantId] = useOptimistic(selectedVariantId);

	/**
	 * ============================================================
	 * FIND CURRENT VARIANT
	 * ============================================================
	 */
	const currentVariantId = useMemo(() => {
		return findMatchingVariant(variants as MedusaVariant[], optimisticSelections, productOptions);
	}, [variants, optimisticSelections, productOptions]);
	/**
	 * ============================================================
	 * OPTIONAL ATTRIBUTES
	 * ============================================================
	 */
	const optionalAttributes = useMemo(() => {
		return extractOptionalAttributes(variants, currentVariantId);
	}, [variants, currentVariantId]);

	/**
	 * ============================================================
	 * HANDLE COLOR / SIZE SELECTION
	 * ============================================================
	 */
	const handleSelect = useCallback(
		(attributeSlug: string, optionId: string) => {
			/**
			 * Ví dụ:
			 *
			 * current:
			 * {
			 *   color: "black"
			 * }
			 *
			 * click:
			 * size = "m"
			 *
			 * result:
			 * {
			 *   color: "black",
			 *   size: "m"
			 * }
			 */
			const newSelections = getAdjustedSelections(
				variants as MedusaVariant[],
				optimisticSelections,
				attributeSlug,
				optionId,
			);

			/**
			 * Build URL.
			 */
			const params = new URLSearchParams();

			for (const [slug, value] of Object.entries(newSelections)) {
				if (value) {
					params.set(slug, value);
				}
			}

			/**
			 * Tìm variant tương ứng.
			 */
			const matchingVariantId = findMatchingVariant(
				variants as MedusaVariant[],
				newSelections,
				productOptions,
			);
			if (matchingVariantId) {
				params.set("variant", matchingVariantId);
			}

			/**
			 * Navigate.
			 */
			startTransition(() => {
				setOptimisticSelections(newSelections);

				router.push(`/${channel}/products/${productSlug}?${params.toString()}`, {
					scroll: false,
				});
			});
		},
		[optimisticSelections, variants, productOptions, channel, productSlug, router, setOptimisticSelections],
	);

	/**
	 * ============================================================
	 * UNAVAILABLE ATTRIBUTE
	 * ============================================================
	 */
	const unavailableInfo = useMemo(() => {
		return getUnavailableAttributeInfo(
			variants as MedusaVariant[],
			attributeGroups,
			optimisticSelections,
			productOptions,
		);
	}, [variants, attributeGroups, optimisticSelections, productOptions]);

	/**
	 * ============================================================
	 * DEBUG
	 * ============================================================
	 *
	 * Có thể mở console để kiểm tra:
	 *
	 * productOptions
	 * variants
	 * attributeGroups
	 *
	 * Nếu vẫn thấy opt_xxx ở UI,
	 * kiểm tra 3 giá trị này.
	 */
	useEffect(() => {
		if (process.env.NODE_ENV !== "development") {
			return;
		}

		console.log("[VariantSelectionSection] productOptions:", productOptions);

		console.log("[VariantSelectionSection] variants:", variants);

		console.log("[VariantSelectionSection] attributeGroups:", attributeGroups);
	}, [productOptions, variants, attributeGroups]);

	/**
	 * ============================================================
	 * WARNING
	 * ============================================================
	 */
	useEffect(() => {
		if (process.env.NODE_ENV === "development" && attributeGroups.length === 0 && variants.length > 1) {
			console.warn(
				`[VariantSelectionSection] Product "${productSlug}" has ${variants.length} variants but no structured attributes.`,
			);

			console.warn("Medusa productOptions:", productOptions);

			console.warn("Medusa variants:", variants);
		}
	}, [attributeGroups.length, variants.length, productSlug, productOptions]);

	/**
	 * ============================================================
	 * FALLBACK VARIANT SELECTOR
	 * ============================================================
	 */
	const handleVariantSelect = useCallback(
		(variantId: string) => {
			startTransition(() => {
				setOptimisticVariantId(variantId);

				router.push(`/${channel}/products/${productSlug}?variant=${variantId}`, {
					scroll: false,
				});
			});
		},
		[channel, productSlug, router, setOptimisticVariantId],
	);

	/**
	 * ============================================================
	 * CUSTOM CHILDREN
	 * ============================================================
	 */
	if (children) {
		return <>{children}</>;
	}

	/**
	 * ============================================================
	 * SINGLE VARIANT
	 * ============================================================
	 */
	if (variants.length <= 1) {
		return null;
	}

	/**
	 * ============================================================
	 * NO STRUCTURED OPTIONS
	 * ============================================================
	 *
	 * Nếu product không có options,
	 * dùng selector theo variant name.
	 */
	if (attributeGroups.length === 0) {
		return (
			<div className="space-y-6 py-2">
				<VariantNameSelector
					variants={variants}
					selectedVariantId={optimisticVariantId}
					onSelect={handleVariantSelect}
					isPending={isPending}
				/>
			</div>
		);
	}

	/**
	 * ============================================================
	 * RENDER COLOR / SIZE / OTHER OPTIONS
	 * ============================================================
	 */
	return (
		<div className="space-y-6 py-2">
			{attributeGroups.map((group) => {
				const options = getOptionsForAttribute(
					variants as MedusaVariant[],
					attributeGroups,
					optimisticSelections,
					group.slug,
					productOptions,
				);

				const isUnavailable = unavailableInfo?.slug === group.slug;

				const unavailableMessage = isUnavailable
					? `No ${group.name.toLowerCase()} available in ${unavailableInfo.blockedBy}`
					: undefined;

				return (
					<VariantSelector
						key={group.slug}
						label={group.name}
						options={options}
						selectedId={optimisticSelections[group.slug]}
						attributeSlug={group.slug}
						onSelect={handleSelect}
						unavailableMessage={unavailableMessage}
						isPending={isPending}
					/>
				);
			})}

			<VariantAttributeBadges attributes={optionalAttributes} />
		</div>
	);
}
