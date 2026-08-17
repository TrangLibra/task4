import Link from "next/link";
import type { HttpTypes } from "@medusajs/types";

type ProductCategory = HttpTypes.StoreProductCategory;

async function getMedusaCategories(): Promise<ProductCategory[]> {
	const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
	const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

	if (!backendUrl || !publishableKey) {
		console.error("Medusa environment variables are missing");
		return [];
	}

	try {
		const url = new URL("/store/product-categories", backendUrl);

		url.searchParams.set("limit", "20");

		const response = await fetch(url.toString(), {
			headers: {
				"x-publishable-api-key": publishableKey,
				"bypass-tunnel-reminder": "true",
			},
			next: {
				revalidate: 300,
			},
		});

		if (!response.ok) {
			console.error(`Medusa categories request failed: ${response.status}`);

			return [];
		}

		const data = (await response.json()) as {
			product_categories?: ProductCategory[];
		};

		return data.product_categories ?? [];
	} catch (error) {
		console.error("Failed to fetch Medusa categories:", error);
		return [];
	}
}

export async function CategorySection() {
	const categories = await getMedusaCategories();

	if (categories.length === 0) {
		return null;
	}

	return (
		<section className="mx-auto max-w-7xl px-4 py-10">
			<div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
				{categories.map((category) => (
					<Link
						key={category.id}
						href={`/default-channel/categories/${category.handle}`}
						className="group flex cursor-pointer flex-col items-center"
					>
						<div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-gray-100">
							{category.metadata?.image ? (
								<img
									src={String(category.metadata.image)}
									alt={category.name}
									className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-sm text-gray-400">
									{category.name}
								</div>
							)}
						</div>

						<h3 className="mt-4 text-center text-lg font-semibold">{category.name}</h3>
					</Link>
				))}
			</div>
		</section>
	);
}
