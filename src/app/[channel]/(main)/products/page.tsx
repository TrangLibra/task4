import { Suspense } from "react";
import Link from "next/link";
import { CategoryHero } from "@/ui/components/plp";
import { AddToCartButton } from "@/ui/components/products/add-to-cart-button";
export const metadata = {
	title: "All Products",
	description: "Discover our full collection of products.",
};

type PageProps = {
	params: Promise<{
		channel: string;
	}>;
	searchParams: Promise<{
		cursor?: string | string[];
		direction?: string | string[];
		sort?: string;
		price?: string;
		colors?: string;
		sizes?: string;
		categories?: string;
	}>;
};

type MedusaCalculatedPrice = {
	currency_code: string;
	calculated_amount: number;
};

type MedusaVariant = {
	id: string;
	title?: string;
	calculated_price?: MedusaCalculatedPrice | null;
	inventory_quantity?: number | null;
	manage_inventory?: boolean;
	allow_backorder?: boolean;
	options?: {
		id?: string;
		option_id?: string;
		value?: string;
	}[];
};
type MedusaProduct = {
	id: string;
	title: string;
	handle: string;
	thumbnail?: string | null;
	variants?: MedusaVariant[];
};

type MedusaProductsResponse = {
	products?: MedusaProduct[];
	count?: number;
	limit?: number;
	offset?: number;
};

export default async function Page(props: PageProps) {
	const params = await props.params;

	const breadcrumbs = [
		{
			label: "Home",
			href: `/${params.channel}`,
		},
		{
			label: "All Products",
			href: `/${params.channel}/products`,
		},
	];

	return (
		<>
			<CategoryHero
				title="All Products"
				description="Discover our full collection of premium products."
				breadcrumbs={breadcrumbs}
			/>

			<Suspense fallback={<ProductsGridSkeleton />}>
				<ProductsContent params={props.params} searchParams={props.searchParams} />
			</Suspense>
		</>
	);
}

async function ProductsContent({
	params: paramsPromise,
	searchParams: searchParamsPromise,
}: {
	params: PageProps["params"];
	searchParams: PageProps["searchParams"];
}) {
	const params = await paramsPromise;
	const searchParams = await searchParamsPromise;

	const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
	const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

	if (!backendUrl) {
		throw new Error("NEXT_PUBLIC_MEDUSA_BACKEND_URL is not configured");
	}

	if (!publishableKey) {
		throw new Error("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not configured");
	}

	/*
	 * ================================
	 * MEDUSA PRODUCTS API
	 * ================================
	 */
	const url = new URL("/store/products", backendUrl);

	url.searchParams.set("limit", "20");
	url.searchParams.set("fields", "*variants,*options");
	/*
	 * Pagination
	 */
	const cursor = Array.isArray(searchParams.cursor) ? searchParams.cursor[0] : searchParams.cursor;

	if (cursor) {
		url.searchParams.set("cursor", cursor);
	}

	const response = await fetch(url.toString(), {
		headers: {
			"x-publishable-api-key": publishableKey,
			"Content-Type": "application/json",
		},
		next: {
			revalidate: 300,
		},
	});

	if (!response.ok) {
		console.error("[Medusa Products]", response.status, response.statusText);

		throw new Error("Failed to fetch products from Medusa");
	}

	/*
	 * response.json() = unknown
	 * nên phải cast về type MedusaProductsResponse
	 */
	const data = (await response.json()) as MedusaProductsResponse;

	const products = data.products ?? [];

	console.log("[Medusa Products] Loaded:", products.length, products);

	return (
		<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			{/* HEADER */}
			<div className="mb-6 flex items-center justify-between">
				<p className="text-sm text-muted-foreground">{products.length} sản phẩm</p>
			</div>

			{/* PRODUCT GRID */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
				{products.map((product) => {
					const firstVariant = product.variants?.[0];
					const price = firstVariant?.calculated_price;

					return (
						<div
							key={product.id}
							className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
						>
							{/* IMAGE */}
							<Link href={`/${params.channel}/products/${product.handle}`} className="block">
								<div className="relative overflow-hidden bg-gray-50">
									{product.thumbnail ? (
										<img
											src={product.thumbnail}
											alt={product.title}
											className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
									) : (
										<div className="flex aspect-[3/4] w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
											Không có hình ảnh
										</div>
									)}
								</div>
							</Link>

							{/* PRODUCT INFO */}
							<div className="p-4">
								<Link href={`/${params.channel}/products/${product.handle}`}>
									<h2 className="line-clamp-2 min-h-[48px] text-base font-semibold text-gray-900 transition-colors group-hover:text-orange-500">
										{product.title}
									</h2>
								</Link>

								{/* PRICE */}
								{price && (
									<p className="mt-2 text-lg font-bold text-orange-600">
										{price.calculated_amount.toLocaleString("vi-VN")} {price.currency_code.toUpperCase()}
									</p>
								)}

								{/* PRODUCT INFO */}
								<div className="mt-2 flex items-center justify-between text-xs text-gray-500">
									<span>{product.variants?.length ?? 0} phiên bản</span>

									<span className="text-green-600">✓ Còn hàng</span>
								</div>

								{/* ADD TO CART */}
								<AddToCartButton variantId={firstVariant?.id} />
							</div>
						</div>
					);
				})}
			</div>

			{/* EMPTY */}
			{products.length === 0 && (
				<div className="py-16 text-center">
					<p className="text-muted-foreground">Không tìm thấy sản phẩm trong Medusa.</p>
				</div>
			)}
		</div>
	);
}

function ProductsGridSkeleton() {
	return (
		<div className="mx-auto max-w-7xl animate-skeleton-delayed px-4 py-8 opacity-0 sm:px-6 lg:px-8">
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="animate-pulse">
						<div className="mb-4 aspect-[3/4] rounded-xl bg-muted" />

						<div className="space-y-1.5">
							<div className="h-4 w-3/4 rounded bg-muted" />
							<div className="h-4 w-1/2 rounded bg-muted" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
