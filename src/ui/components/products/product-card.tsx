"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import type { HttpTypes } from "@medusajs/types";

type Product = HttpTypes.StoreProduct;

type ProductCardProps = {
	product: Product;
	channel: string;
};

export function ProductCard({ product, channel }: ProductCardProps) {
	const firstVariant = product.variants?.[0];

	const price =
		firstVariant?.calculated_price?.calculated_amount ??
		(firstVariant as any)?.prices?.[0]?.amount ??
		null;
	const currency =
		firstVariant?.calculated_price?.currency_code ??
		(firstVariant as any)?.prices?.[0]?.currency_code ??
		"EUR";

	const image = product.thumbnail || product.images?.[0]?.url || null;

	const variantCount = product.variants?.length ?? 0;

	return (
		<div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
			{/* IMAGE */}
			<Link href={`/${channel}/products/${product.handle}`} className="block">
				<div className="relative overflow-hidden bg-gray-50">
					{image ? (
						<img
							src={image}
							alt={product.title}
							className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
					) : (
						<div className="flex aspect-[3/4] items-center justify-center bg-gray-100 text-sm text-gray-400">
							Không có hình ảnh
						</div>
					)}
				</div>
			</Link>

			{/* INFO */}
			<div className="p-4">
				<Link href={`/${channel}/products/${product.handle}`}>
					<h3 className="line-clamp-2 min-h-[48px] text-base font-semibold text-gray-900 transition-colors group-hover:text-orange-500">
						{product.title}
					</h3>
				</Link>

				{/* PRICE */}
				{price != null && (
					<p className="mt-2 text-lg font-bold text-orange-600">
						{price.toLocaleString("vi-VN")} {currency?.toUpperCase()}
					</p>
				)}

				{/* PRODUCT INFO */}
				<div className="mt-2 flex items-center justify-between text-xs text-gray-500">
					<span>{variantCount} phiên bản</span>

					<span className="font-medium text-green-600">✓ Còn hàng</span>
				</div>

				{/* ADD TO CART */}
				<Link
					href={`/${channel}/products/${product.handle}`}
					className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
				>
					<ShoppingCart className="h-4 w-4" />
					Thêm vào giỏ
				</Link>
			</div>
		</div>
	);
}
