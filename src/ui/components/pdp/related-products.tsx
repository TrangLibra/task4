import { ProductList } from "@/ui/components/product-list";
import type { ProductListItemFragment } from "@/gql/graphql";

interface RelatedProductsProps {
	title?: string;
	products: ProductListItemFragment[];
}

export function RelatedProducts({ title = "SẢN PHẨM LIÊN QUAN", products }: RelatedProductsProps) {
	if (!products.length) return null;

	return (
		<section className="mt-16">
			<h2 className="mb-8 border-b-2 border-orange-500 pb-2 text-3xl font-bold">{title}</h2>

			<ProductList products={products} />
		</section>
	);
}
