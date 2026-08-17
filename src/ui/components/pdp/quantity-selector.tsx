"use client";

import { useState } from "react";

export function QuantitySelector() {
	const [quantity, setQuantity] = useState(1);

	return (
		<div className="flex items-center gap-4">
			<span className="text-gray-700">Số lượng</span>

			<div className="flex items-center rounded-lg border">
				<button
					type="button"
					className="px-4 py-2 text-xl"
					onClick={() => quantity > 1 && setQuantity(quantity - 1)}
				>
					−
				</button>

				<span className="w-12 text-center font-semibold">{quantity}</span>

				<button type="button" className="px-4 py-2 text-xl" onClick={() => setQuantity(quantity + 1)}>
					+
				</button>
			</div>
		</div>
	);
}
