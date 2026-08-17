import { LinkWithChannel } from "../atoms/link-with-channel";
import { ProductImageWrapper } from "@/ui/atoms/product-image-wrapper";

import type { ProductListItemFragment } from "@/gql/graphql";
import { formatMoneyRange } from "@/lib/utils";

export function ProductElement({
	product,
	loading,
	priority,
}: { product: ProductListItemFragment } & { loading: "eager" | "lazy"; priority?: boolean }) {
	return (
		<li
			data-testid="ProductElement"
			className="group overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
		>
			<LinkWithChannel href={`/products/${product.slug}`} key={product.id} prefetch={false}>
				<div>
					<div className="overflow-hidden rounded-2xl">
						{product?.thumbnail?.url && (
							<ProductImageWrapper
								loading={loading}
								src={product.thumbnail.url}
								alt={product.thumbnail.alt ?? ""}
								width={512}
								height={512}
								sizes="512px"
								priority={priority}
							/>
						)}
					</div>

					<div className="p-4">
						<h3 className="line-clamp-2 text-base font-semibold text-gray-800">{product.name}</h3>

						<p className="mt-2 text-sm font-medium text-orange-500" data-testid="ProductElement_Category">
							{product.category?.name}
						</p>

						<p className="mt-3 text-xl font-bold text-red-600" data-testid="ProductElement_PriceRange">
							{formatMoneyRange({
								start: product?.pricing?.priceRange?.start?.gross,
								stop: product?.pricing?.priceRange?.stop?.gross,
							})}
						</p>

						<button className="mt-4 w-full rounded-xl bg-orange-500 py-2 text-white transition hover:bg-orange-600">
							Mua ngay
						</button>
					</div>
				</div>
			</LinkWithChannel>
		</li>
	);
}
