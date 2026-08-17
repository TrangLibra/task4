import { Suspense } from "react";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { ErrorBoundary } from "react-error-boundary";
import edjsHTML from "editorjs-html";
import xss from "xss";

import { buildPageMetadata, buildProductJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/ui/components/breadcrumbs";
import {
	ProductGallery,
	ProductAttributes,
	VariantSectionDynamic,
	VariantSectionSkeleton,
	VariantSectionError,
} from "@/ui/components/pdp";
import { FeatureHighlights } from "@/ui/components/pdp/feature-highlights";

import type { HttpTypes } from "@medusajs/types";

// ============================================================================
// Medusa Product Type
// ============================================================================

type Product = HttpTypes.StoreProduct;
type Variant = HttpTypes.StoreProductVariant;

// ============================================================================
// Cached Data Fetching - MEDUSA
// ============================================================================

async function getProductData(slug: string): Promise<Product | null> {
	"use cache";

	const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
	const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

	if (!backendUrl) {
		console.error("NEXT_PUBLIC_MEDUSA_BACKEND_URL is not configured");
		return null;
	}

	if (!publishableKey) {
		console.error("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not configured");
		return null;
	}

	try {
		const url = new URL("/store/products", backendUrl);

		url.searchParams.set("handle", slug);
		url.searchParams.set("fields", "*variants,*options,*type");
		const res = await fetch(url.toString(), {
			headers: {
				"x-publishable-api-key": publishableKey,
			},
			next: {
				revalidate: 300,
			},
		});

		if (!res.ok) {
			console.error(`Medusa product request failed: ${res.status} ${res.statusText}`);
			return null;
		}

		const data = (await res.json()) as {
			products?: Product[];
		};

		return data.products?.[0] ?? null;
	} catch (error) {
		console.error("Failed to fetch product from Medusa:", error);
		return null;
	}
}

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata(props: {
	params: Promise<{ slug: string; channel: string }>;
}): Promise<Metadata> {
	const params = await props.params;

	const product = await getProductData(params.slug);

	if (!product) {
		return {
			title: "Product Not Found",
		};
	}

	const description = product.description || product.title;

	const ogImage = product.images?.[0]?.url || product.thumbnail || undefined;

	// Medusa calculated price
	const calculatedPrice = product.variants?.[0]?.calculated_price;

	const priceAmount = calculatedPrice?.calculated_amount;

	const priceCurrency = calculatedPrice?.currency_code;

	return buildPageMetadata({
		title: product.title,
		description,
		image: ogImage,
		url: `/${params.channel}/products/${encodeURIComponent(params.slug)}`,
		openGraph:
			priceAmount != null && priceCurrency
				? {
						"product:price:amount": String(priceAmount),
						"product:price:currency": priceCurrency.toUpperCase(),
					}
				: undefined,
	});
}

// ============================================================================
// Page Component
// ============================================================================

const parser = edjsHTML();

export default function ProductPage(props: {
	params: Promise<{ slug: string; channel: string }>;
	searchParams: Promise<{ variant?: string }>;
}) {
	return (
		<Suspense fallback={<ProductPageSkeleton />}>
			<ProductContent params={props.params} searchParams={props.searchParams} />
		</Suspense>
	);
}

// ============================================================================
// Product Content
// ============================================================================

async function ProductContent({
	params: paramsPromise,
	searchParams: searchParamsPromise,
}: {
	params: Promise<{ slug: string; channel: string }>;
	searchParams: Promise<{ variant?: string }>;
}) {
	const [params, searchParams] = await Promise.all([paramsPromise, searchParamsPromise]);

	const product = await getProductData(params.slug);

	if (!product) {
		notFound();
	}

	// ==========================================================================
	// Variants
	// ==========================================================================

	const variants = product.variants ?? [];

	const selectedVariantId = searchParams.variant || (variants.length === 1 ? variants[0]?.id : undefined);

	const selectedVariant = variants.find(
		(variant: NonNullable<(typeof variants)[number]>) => variant.id === selectedVariantId,
	);

	// ==========================================================================
	// Description
	// ==========================================================================

	const descriptionHtml = parseDescription(product.description);

	// ==========================================================================
	// Gallery
	// ==========================================================================

	const images = getGalleryImages(product, selectedVariant);

	// ==========================================================================
	// Product Attributes
	// ==========================================================================

	const productAttributes = extractProductAttributes(product);
	console.log("PRODUCT TYPE:", product.type);
	const careInstructions = extractCareInstructions(product);

	// ==========================================================================
	// Related Products
	// ==========================================================================

	const relatedProducts: Product[] = [];

	// ==========================================================================
	// Breadcrumbs
	// ==========================================================================

	const primaryCategory = product.categories?.[0];

	const breadcrumbs = [
		{
			label: "Home",
			href: `/${params.channel}`,
		},

		...(primaryCategory
			? [
					{
						label: primaryCategory.name,
						href: `/${params.channel}/categories/${primaryCategory.handle}`,
					},
				]
			: []),

		{
			label: product.title,
		},
	];

	// ==========================================================================
	// Product JSON-LD
	// ==========================================================================

	const firstVariant = product.variants?.[0];

	const calculatedPrice = firstVariant?.calculated_price;

	const priceAmount = calculatedPrice?.calculated_amount;

	const priceCurrency = calculatedPrice?.currency_code;

	const productJsonLd = buildProductJsonLd({
		name: product.title,

		description: product.description || product.title,

		images: images.length > 0 ? images.map((image) => image.url) : undefined,

		brand: primaryCategory?.name,

		url: `/${params.channel}/products/${product.handle}`,

		priceRange:
			priceAmount != null && priceCurrency
				? {
						lowPrice: priceAmount,
						highPrice: priceAmount,
						currency: priceCurrency.toUpperCase(),
					}
				: undefined,

		inStock:
			product.variants?.some((variant: NonNullable<typeof product.variants>[number]) =>
				isVariantInStock(variant),
			) ?? false,

		variantCount: product.variants?.length ?? 0,
	});

	// ==========================================================================
	// LCP Image
	// ==========================================================================

	const lcpImageUrl = images[0]?.url;

	// ==========================================================================
	// Render
	// ==========================================================================

	return (
		<div className="flex min-h-screen flex-col bg-background">
			{lcpImageUrl && <link rel="preload" as="image" href={lcpImageUrl} fetchPriority="high" />}

			{productJsonLd && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(productJsonLd),
					}}
				/>
			)}

			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
				{/* ============================================================ */}
				{/* Breadcrumbs */}
				{/* ============================================================ */}

				<div className="mb-6 hidden sm:block">
					<Breadcrumbs items={breadcrumbs} />
				</div>

				{/* ============================================================ */}
				{/* Product Layout */}
				{/* ============================================================ */}

				<div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
					{/* ======================================================== */}
					{/* Gallery */}
					{/* ======================================================== */}

					<div className="lg:sticky lg:top-24 lg:self-start">
						<ProductGallery images={images} productName={product.title} />
					</div>

					{/* ======================================================== */}
					{/* Product Information */}
					{/* ======================================================== */}

					<div className="flex flex-col gap-3">
						{/* Product Title */}

						<h1 className="order-2 text-balance text-3xl font-semibold tracking-tight lg:text-4xl">
							{product.title}
						</h1>

						{/* ==================================================== */}
						{/* Variants / Price / Add To Cart */}
						{/* ==================================================== */}

						<ErrorBoundary FallbackComponent={VariantSectionError}>
							<Suspense fallback={<VariantSectionSkeleton />}>
								<VariantSectionDynamic
									product={product}
									channel={params.channel}
									searchParams={searchParamsPromise}
								/>
							</Suspense>
						</ErrorBoundary>

						{/* ==================================================== */}
						{/* Attributes */}
						{/* ==================================================== */}

						<div className="order-4 mt-6">
							<ProductAttributes
								descriptionHtml={descriptionHtml}
								attributes={productAttributes}
								careInstructions={careInstructions}
							/>
						</div>
					</div>
				</div>

				{/* ============================================================ */}
				{/* Related Products */}
				{/* ============================================================ */}

				<div className="mt-16">
					<h2 className="mb-6 text-3xl font-bold">Sản phẩm liên quan</h2>

					{/* 
						Phần Related Products sẽ được nối
						với Medusa Product API sau.
					*/}
				</div>
			</main>
		</div>
	);
}

// ============================================================================
// Skeleton
// ============================================================================

function ProductPageSkeleton() {
	return (
		<div className="flex min-h-screen animate-skeleton-delayed flex-col bg-background opacity-0">
			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
				<div className="mb-6 hidden h-4 w-64 animate-pulse rounded bg-secondary sm:block" />

				<div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
					<div className="aspect-square animate-pulse rounded-lg bg-secondary" />

					<div className="flex flex-col gap-4">
						<div className="h-8 w-3/4 animate-pulse rounded bg-secondary" />

						<div className="h-6 w-24 animate-pulse rounded bg-secondary" />

						<div className="mt-4 space-y-3">
							<div className="h-10 w-full animate-pulse rounded bg-secondary" />

							<div className="h-10 w-full animate-pulse rounded bg-secondary" />
						</div>

						<div className="mt-4 h-12 w-full animate-pulse rounded bg-secondary" />
					</div>
				</div>
			</main>
		</div>
	);
}

// ============================================================================
// Description Parser
// ============================================================================

function parseDescription(description: string | null | undefined): string[] | null {
	if (!description) {
		return null;
	}

	try {
		const parsed = parser.parse(JSON.parse(description));

		return parsed.map((html: string) => xss(html));
	} catch {
		return [xss(`<p>${description}</p>`)];
	}
}

// ============================================================================
// Product Attributes
// ============================================================================

function extractProductAttributes(product: Product): {
	name: string;
	value: string | string[];
}[] {
	const attributes: {
		name: string;
		value: string | string[];
	}[] = [];

	// ============================================================
	// MATERIAL
	// ============================================================

	if (product.material) {
		attributes.push({
			name: "Material",
			value: product.material,
		});
	}

	// ============================================================
	// WEIGHT
	// ============================================================

	if (product.weight != null) {
		attributes.push({
			name: "Weight",
			value: `${product.weight} g`,
		});
	}

	// ============================================================
	// COUNTRY OF ORIGIN
	// ============================================================

	if (product.origin_country) {
		attributes.push({
			name: "Country of origin",
			value: product.origin_country,
		});
	}

	// ============================================================
	// DIMENSIONS
	// ============================================================

	const dimensions = [product.length, product.width, product.height];

	const hasDimensions = dimensions.some((value) => value != null && value !== 0);

	if (hasDimensions) {
		attributes.push({
			name: "Dimensions",
			value: `${product.length ?? "-"} × ${product.width ?? "-"} × ${product.height ?? "-"} cm`,
		});
	}

	// ============================================================
	// TYPE
	// ============================================================

	const productType = product.type as
		| {
				name?: string | null;
		  }
		| null
		| undefined;

	if (productType?.name) {
		attributes.push({
			name: "Type",
			value: productType.name,
		});
	}
	// ============================================================
	// PRODUCT OPTIONS
	// Ví dụ: Color, Size...
	// ============================================================

	for (const option of product.options ?? []) {
		if (!option.title) {
			continue;
		}

		const values =
			(option.values as Array<{ value?: string | null }> | undefined)
				?.map((value) => value.value)
				.filter((value): value is string => Boolean(value)) ?? [];

		if (values.length === 0) {
			continue;
		}

		attributes.push({
			name: option.title,
			value: values.length === 1 ? values[0]! : values,
		});
	}

	return attributes;
}

// ============================================================================
// Care Instructions
// ============================================================================

function extractCareInstructions(product: Product): string | null {
	/*
	 * Saleor had product.attributes here.
	 *
	 * Medusa does not expose the same
	 * attribute structure by default.
	 *
	 * If you later create a custom Medusa
	 * metadata field for care instructions,
	 * it can be read here.
	 */

	const metadata = product.metadata as Record<string, unknown> | null | undefined;

	const care = metadata?.["care-instructions"] ?? metadata?.["care"];

	if (typeof care === "string" && care.trim()) {
		return care.trim();
	}

	return null;
}

// ============================================================================
// Gallery Images
// ============================================================================

function getGalleryImages(
	product: Product,
	selectedVariant?: Variant,
): {
	url: string;
	alt: string | null | undefined;
}[] {
	// ============================================================
	// Variant images
	// ============================================================

	/*
	 * Depending on the Medusa version/configuration,
	 * variant images may not be directly available.
	 *
	 * If they exist, prefer them.
	 */

	const variantImages = (selectedVariant as any)?.images;

	if (Array.isArray(variantImages) && variantImages.length > 0) {
		return variantImages
			.filter((image: any) => image?.url)
			.map((image: any) => ({
				url: image.url,
				alt: image.alt ?? product.title,
			}));
	}

	// ============================================================
	// Product images
	// ============================================================

	if (Array.isArray(product.images) && product.images.length > 0) {
		type ProductImage = {
			url?: string | null;
			metadata?: {
				alt?: string | null;
				[key: string]: unknown;
			} | null;
		};

		const images = product.images as ProductImage[];

		return images
			.filter((image: ProductImage) => Boolean(image?.url))
			.map((image: ProductImage) => ({
				url: image.url as string,
				alt: image.metadata?.alt ?? product.title ?? "Product image",
			}));
	}
	// ============================================================
	// Product thumbnail
	// ============================================================

	if (product.thumbnail) {
		return [
			{
				url: product.thumbnail,
				alt: product.title,
			},
		];
	}

	return [];
}

// ============================================================================
// Variant Stock
// ============================================================================

function isVariantInStock(variant: Variant): boolean {
	/*
	 * Medusa may use manage_inventory,
	 * allow_backorder and inventory_quantity
	 * depending on the fields returned by
	 * the Store API.
	 */

	const variantData = variant as any;

	// No inventory management
	if (variantData.manage_inventory === false) {
		return true;
	}

	// Backorders enabled
	if (variantData.allow_backorder === true) {
		return true;
	}

	// Inventory available
	if (typeof variantData.inventory_quantity === "number" && variantData.inventory_quantity > 0) {
		return true;
	}

	return false;
}
