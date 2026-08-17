import { notFound } from "next/navigation";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:8000";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

type PageProps = {
	params: Promise<{
		slug: string;
		channel: string;
	}>;
	searchParams: Promise<{
		sort?: string;
		price?: string;
	}>;
};

type MedusaCategory = {
	id: string;
	name: string;
	handle: string;
	description?: string | null;
	seo_title?: string | null;
	seo_description?: string | null;
	metadata?: Record<string, unknown> | null;
};

type MedusaProduct = {
	id: string;
	title: string;
	handle: string;
	thumbnail?: string | null;
	images?: {
		url: string;
	}[];
	variants?: {
		id: string;
		calculated_price?: {
			calculated_amount: number;
			currency_code: string;
		};
	}[];
};

type MedusaProductsResponse = {
	products: MedusaProduct[];
	count?: number;
	offset?: number;
	limit?: number;
};

/**
 * Lấy category từ Medusa bằng handle.
 *
 * Ví dụ:
 * /default-channel/categories/shirts
 *
 * => handle = shirts
 */
async function getCategoryData(slug: string): Promise<MedusaCategory | null> {
	try {
		const url = new URL(`${MEDUSA_URL}/store/product-categories`);

		url.searchParams.set("handle", slug);
		url.searchParams.set("limit", "1");

		const response = await fetch(url.toString(), {
			method: "GET",
			headers: {
				"x-publishable-api-key": PUBLISHABLE_KEY,
				"Content-Type": "application/json",
			},
			cache: "no-store",
		});

		if (!response.ok) {
			console.error("[Medusa Category]", response.status, response.statusText);

			return null;
		}

		const data = (await response.json()) as {
			product_categories?: MedusaCategory[];
		};

		const category = data.product_categories?.[0];

		if (!category) {
			console.warn(`[Medusa Category] Không tìm thấy category với handle: ${slug}`);
			return null;
		}

		return category;
	} catch (error) {
		console.error("[Medusa Category] Lỗi khi lấy category:", error);

		return null;
	}
}

/**
 * Lấy sản phẩm thuộc category từ Medusa.
 */
async function getCategoryProducts(
	categoryId: string,
	searchParams: {
		sort?: string;
		price?: string;
	},
): Promise<MedusaProduct[]> {
	try {
		const url = new URL(`${MEDUSA_URL}/store/products`);

		// Quan trọng:
		// Đây là chỗ lọc sản phẩm theo category Medusa.
		url.searchParams.set("category_id", categoryId);

		url.searchParams.set("limit", "20");

		/*
		 * SORT
		 */
		if (searchParams.sort) {
			switch (searchParams.sort) {
				case "price_asc":
					url.searchParams.set("order", "variants.calculated_price.calculated_amount");
					break;

				case "price_desc":
					url.searchParams.set("order", "-variants.calculated_price.calculated_amount");
					break;

				case "name_asc":
					url.searchParams.set("order", "title");
					break;

				case "name_desc":
					url.searchParams.set("order", "-title");
					break;

				default:
					break;
			}
		}

		const response = await fetch(url.toString(), {
			method: "GET",
			headers: {
				"x-publishable-api-key": PUBLISHABLE_KEY,
				"Content-Type": "application/json",
			},
			cache: "no-store",
		});

		if (!response.ok) {
			console.error("[Medusa Products]", response.status, response.statusText);

			return [];
		}

		const data = (await response.json()) as MedusaProductsResponse;
		return data.products ?? [];
	} catch (error) {
		console.error("[Medusa Products] Lỗi khi lấy sản phẩm:", error);

		return [];
	}
}

/**
 * Format giá sản phẩm.
 */
function formatPrice(amount?: number, currencyCode?: string) {
	if (amount === undefined || amount === null) {
		return "Liên hệ";
	}

	return new Intl.NumberFormat("vi-VN", {
		style: "currency",
		currency: currencyCode || "VND",
	}).format(amount);
}

/**
 * Lấy giá của variant đầu tiên.
 */
function getProductPrice(product: MedusaProduct) {
	const variant = product.variants?.[0];

	if (!variant?.calculated_price) {
		return "Liên hệ";
	}

	return formatPrice(variant.calculated_price.calculated_amount, variant.calculated_price.currency_code);
}

/**
 * CATEGORY PAGE
 */
export default async function Page(props: PageProps) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	const category = await getCategoryData(params.slug);

	if (!category) {
		notFound();
	}

	const products = await getCategoryProducts(category.id, searchParams);

	return (
		<div className="min-h-screen bg-white">
			{/* ================= HERO CATEGORY ================= */}
			<section className="border-b bg-gray-50">
				<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
					{/* Breadcrumb */}
					<div className="mb-5 flex items-center gap-2 text-sm text-gray-500">
						<a href={`/${params.channel}`} className="hover:text-orange-500">
							Trang chủ
						</a>

						<span>/</span>

						<span className="text-gray-800">{category.name}</span>
					</div>

					<h1 className="text-4xl font-bold text-gray-900">{category.name}</h1>

					{category.description && <p className="mt-3 max-w-2xl text-gray-600">{category.description}</p>}
				</div>
			</section>

			{/* ================= FILTER / SORT ================= */}
			<section className="border-b bg-white">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
					<div className="text-sm text-gray-600">{products.length} sản phẩm</div>

					<div className="flex items-center gap-3">
						<a
							href={`/${params.channel}/categories/${params.slug}?sort=name_asc`}
							className="rounded-lg border px-4 py-2 text-sm hover:border-orange-400 hover:text-orange-500"
						>
							Tên A-Z
						</a>

						<a
							href={`/${params.channel}/categories/${params.slug}?sort=price_asc`}
							className="rounded-lg border px-4 py-2 text-sm hover:border-orange-400 hover:text-orange-500"
						>
							Giá thấp → cao
						</a>

						<a
							href={`/${params.channel}/categories/${params.slug}?sort=price_desc`}
							className="rounded-lg border px-4 py-2 text-sm hover:border-orange-400 hover:text-orange-500"
						>
							Giá cao → thấp
						</a>
					</div>
				</div>
			</section>

			{/* ================= PRODUCTS ================= */}
			<section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				{products.length === 0 ? (
					<div className="py-20 text-center">
						<h2 className="text-xl font-semibold text-gray-800">Không có sản phẩm</h2>

						<p className="mt-2 text-gray-500">Danh mục này hiện chưa có sản phẩm.</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
						{products.map((product) => {
							const image = product.thumbnail || product.images?.[0]?.url;

							return (
								<a
									key={product.id}
									href={`/${params.channel}/products/${product.handle}`}
									className="group block"
								>
									{/* IMAGE */}
									<div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
										{image ? (
											<img
												src={image}
												alt={product.title}
												className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
										) : (
											<div className="flex h-full items-center justify-center text-sm text-gray-400">
												Không có hình ảnh
											</div>
										)}
									</div>

									{/* PRODUCT INFO */}
									<div className="pt-4">
										<h2 className="line-clamp-2 font-medium text-gray-900 group-hover:text-orange-500">
											{product.title}
										</h2>

										<p className="mt-2 font-semibold text-orange-500">{getProductPrice(product)}</p>
									</div>
								</a>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}
