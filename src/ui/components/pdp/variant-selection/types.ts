import type { StoreProduct } from "@medusajs/types";

/**
 * Types for the variant selection system.
 */

export interface VariantOption {
	/** Unique identifier derived from option value */
	id: string;

	/** Display name */
	name: string;

	/** Whether this option is currently purchasable */
	available: boolean;

	/** Whether this option exists with current selections */
	existsWithCurrentSelection?: boolean;

	/** Hex color for color swatches */
	colorHex?: string;

	/** Variant IDs containing this option */
	variantIds?: string[];

	/** Whether any variant using this option is on sale */
	hasDiscount?: boolean;

	/** Maximum discount percentage */
	discountPercent?: number;

	/** Optional metadata */
	metadata?: Record<string, unknown>;
}

export interface AttributeGroup {
	/** Medusa ProductOption ID */
	slug: string;

	/** Product option title, e.g. Color / Size */
	name: string;

	/** Options belonging to this attribute */
	options: VariantOption[];
}

export interface OptionRendererProps {
	option: VariantOption;
	isSelected: boolean;
	onSelect: (id: string) => void;
	isPending?: boolean;
}

export type OptionRenderer = React.ComponentType<OptionRendererProps>;

export interface RendererRegistry {
	[attributeSlug: string]: OptionRenderer;
}

export interface VariantSelectorProps {
	label: string;
	options: VariantOption[];
	selectedId?: string;
	attributeSlug: string;
	onSelect: (attributeSlug: string, optionId: string) => void;
	renderer?: OptionRenderer;
	unavailableMessage?: string;
	isPending?: boolean;
}

export interface VariantSelectionSectionProps {
	/** Variants from Medusa */
	variants: NonNullable<StoreProduct["variants"]>;

	/** Product options from Medusa */
	productOptions?: NonNullable<StoreProduct["options"]>;

	/** Currently selected variant */
	selectedVariantId?: string;

	/** Product handle */
	productSlug: string;

	/** Medusa sales channel */
	channel: string;

	/** Custom renderers */
	renderers?: Partial<RendererRegistry>;

	/** Optional custom rendering */
	children?: React.ReactNode;
}
