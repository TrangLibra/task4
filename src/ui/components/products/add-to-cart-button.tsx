"use client";

import { useState } from "react";

type AddToCartButtonProps = {
	variantId?: string;
};

export function AddToCartButton({ variantId }: AddToCartButtonProps) {
	const [loading, setLoading] = useState(false);

	const handleAddToCart = async () => {
		if (!variantId) {
			alert("Sản phẩm chưa có biến thể để thêm vào giỏ hàng.");
			return;
		}

		try {
			setLoading(true);

			console.log("Add to cart:", variantId);

			// TODO:
			// Gọi hàm addToCart của cart-context tại đây.
		} catch (error) {
			console.error("Failed to add product to cart:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleAddToCart}
			disabled={loading || !variantId}
			className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{loading ? "Đang thêm..." : "🛒 Thêm vào giỏ"}
		</button>
	);
}
