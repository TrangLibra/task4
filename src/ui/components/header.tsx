import { Suspense } from "react";
import { Logo } from "./logo";
import { CartNavItem } from "./nav/components/cart-nav-item";
import { UserMenuContainer } from "./nav/components/user-menu/user-menu-container";
import { SearchBar } from "./nav/components/search-bar";
import { StickyNavbar } from "./sticky-navbar";

function SearchBarSkeleton() {
	return <div className="h-14 w-full max-w-4xl animate-pulse rounded-full bg-gray-100" />;
}

type Category = {
	id: string;
	name: string;
	handle: string;
};

type MedusaCategoryResponse = {
	product_categories?: Category[];
};

async function getCategories(): Promise<Category[]> {
	try {
		const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
		const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

		if (!backendUrl || !publishableKey) {
			console.error("Thiếu cấu hình Medusa environment variables");
			return [];
		}

		const url = new URL("/store/product-categories", backendUrl);

		url.searchParams.set("limit", "50");

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
			console.error("Không lấy được danh mục Medusa:", response.status, response.statusText);

			return [];
		}

		const data = (await response.json()) as MedusaCategoryResponse;

		return (
			data.product_categories?.map((category) => ({
				id: category.id,
				name: category.name,
				handle: category.handle,
			})) ?? []
		);
	} catch (error) {
		console.error("Lỗi lấy danh mục Medusa:", error);
		return [];
	}
}

export async function Header({ channel }: { channel: string }) {
	const categories = await getCategories();

	return (
		<header className="sticky top-0 z-40 bg-white">
			{/* ================= HEADER TRÊN ================= */}
			<div className="border-b bg-white">
				<div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
					{/* LOGO */}
					<Logo />

					{/* SEARCH */}
					<div className="mx-8 hidden flex-1 md:block">
						<SearchBar channel={channel} categories={categories} />
					</div>

					{/* ACCOUNT + CART */}
					<div className="flex items-center gap-3">
						<Suspense fallback={<div />}>
							<UserMenuContainer />
						</Suspense>

						<Suspense fallback={<div />}>
							<CartNavItem channel={channel} />
						</Suspense>
					</div>
				</div>
			</div>

			{/* ================= HEADER DƯỚI ================= */}
			<div className="bg-orange-400 text-white">
				<StickyNavbar channel={channel} categories={categories} />
			</div>
		</header>
	);
}
