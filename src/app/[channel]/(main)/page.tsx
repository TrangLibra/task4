import { Suspense } from "react";
import Link from "next/link";

import { Banner } from "@/ui/components/banner";
import { CategorySection } from "@/ui/components/category-section";
import { ProductCard } from "@/ui/components/products/product-card";

import type { HttpTypes } from "@medusajs/types";

type Product = HttpTypes.StoreProduct;
type Category = HttpTypes.StoreProductCategory;

export const metadata = {
	title: "ACME Storefront",
	description: "Medusa Storefront",
};

// ============================================================
// MEDUSA CONFIG
// ============================================================

function getMedusaConfig() {
	const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
	const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

	if (!backendUrl) {
		throw new Error("NEXT_PUBLIC_MEDUSA_BACKEND_URL chưa được cấu hình");
	}

	if (!publishableKey) {
		throw new Error("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY chưa được cấu hình");
	}

	return {
		backendUrl,
		publishableKey,
	};
}

// ============================================================
// GET CATEGORIES
// ============================================================

async function getMedusaCategories(): Promise<Category[]> {
	const { backendUrl, publishableKey } = getMedusaConfig();

	try {
		const url = new URL("/store/product-categories", backendUrl);

		url.searchParams.set("limit", "20");

		const response = await fetch(url.toString(), {
			headers: {
				"x-publishable-api-key": publishableKey,
			},
			cache: "no-store",
		});

		if (!response.ok) {
			console.error("[Medusa Categories]", response.status, response.statusText);

			return [];
		}

		const data = (await response.json()) as {
			product_categories?: Category[];
		};

		console.log("📂 Medusa categories:", data.product_categories);

		return data.product_categories ?? [];
	} catch (error) {
		console.error("❌ Không thể lấy categories từ Medusa:", error);

		return [];
	}
}

// ============================================================
// GET PRODUCTS BY CATEGORY
// ============================================================

async function getProductsByCategory(categoryId: string): Promise<Product[]> {
	const { backendUrl, publishableKey } = getMedusaConfig();

	try {
		const url = new URL("/store/products", backendUrl);

		// Quan trọng:
		// Lấy sản phẩm theo category
		url.searchParams.set("category_id[]", categoryId);

		// Mỗi category chỉ lấy 4 sản phẩm
		url.searchParams.set("limit", "4");

		// Lấy variant + price
		url.searchParams.set("fields", "*variants,*options");

		const response = await fetch(url.toString(), {
			headers: {
				"x-publishable-api-key": publishableKey,
			},
			cache: "no-store",
		});

		if (!response.ok) {
			console.error(`[Medusa Products ${categoryId}]`, response.status, response.statusText);

			return [];
		}

		const data = (await response.json()) as {
			products?: Product[];
		};

		return data.products ?? [];
	} catch (error) {
		console.error(`❌ Không thể lấy sản phẩm category ${categoryId}:`, error);

		return [];
	}
}

// ============================================================
// HOMEPAGE
// ============================================================

export default function Page() {
	return (
		<section className="mx-auto max-w-7xl p-8 pb-16">
			<Banner />

			<CategorySection />

			<Suspense fallback={<ProductsSkeleton />}>
				<CategoryProducts />
			</Suspense>
		</section>
	);
}

// ============================================================
// CATEGORY PRODUCTS
// ============================================================

async function CategoryProducts() {
	const categories = await getMedusaCategories();

	if (categories.length === 0) {
		return (
			<section className="mt-16">
				<h2 className="mb-6 text-2xl font-bold">Sản phẩm</h2>

				<div className="rounded-xl border p-8 text-center text-gray-500">
					Không tìm thấy danh mục sản phẩm.
				</div>
			</section>
		);
	}

	// Lấy sản phẩm của tất cả category
	const categoryProducts = await Promise.all(
		categories.map(async (category) => {
			const products = await getProductsByCategory(category.id);

			return {
				category,
				products,
			};
		}),
	);

	return (
		<div className="mt-16 space-y-16">
			{categoryProducts.map(({ category, products }) => {
				// Không có sản phẩm thì không render category
				if (products.length === 0) {
					return null;
				}

				return (
					<section key={category.id} className="border-t border-gray-200 pt-10">
						{/* CATEGORY HEADER */}
						<div className="mb-6 flex items-center justify-between">
							<div>
								<h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>

								{category.description && <p className="mt-1 text-sm text-gray-500">{category.description}</p>}
							</div>

							{/* XEM TẤT CẢ */}
							<Link
								href={`/default-channel/categories/${category.handle}`}
								className="whitespace-nowrap text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
							>
								Xem tất cả →
							</Link>
						</div>

						{/* PRODUCT GRID */}
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
							{products.slice(0, 4).map((product) => (
								<ProductCard key={product.id} product={product} channel="default-channel" />
							))}
						</div>
					</section>
				);
			})}
		</div>
	);
}

// ============================================================
// SKELETON
// ============================================================

function ProductsSkeleton() {
	return (
		<section className="mt-16">
			<div className="mb-6 h-8 w-48 animate-pulse rounded bg-secondary" />

			<div className="space-y-16">
				{Array.from({ length: 2 }).map((_, sectionIndex) => (
					<div key={sectionIndex}>
						<div className="mb-6 flex justify-between">
							<div className="h-8 w-48 animate-pulse rounded bg-secondary" />

							<div className="h-5 w-24 animate-pulse rounded bg-secondary" />
						</div>

						<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="animate-pulse">
									<div className="aspect-[3/4] rounded-2xl bg-secondary" />

									<div className="mt-4 h-5 w-3/4 rounded bg-secondary" />

									<div className="mt-2 h-5 w-1/2 rounded bg-secondary" />

									<div className="mt-4 h-11 rounded-xl bg-secondary" />
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
