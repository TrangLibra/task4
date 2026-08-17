import { cookies } from "next/headers";

const MEDUSA_BACKEND_URL: string = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY: string = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

/* ============================================================
 * TYPES
 * ============================================================ */

export interface MedusaLineItem {
	id: string;
	quantity: number;
	totalPrice: {
		gross: {
			amount: number;
			currency: string;
		};
	};
	variant: {
		id: string;
		name: string;
		product: {
			id: string;
			name: string;
			slug: string;
			thumbnail?: {
				url: string;
				alt?: string | null;
			} | null;
			category?: {
				name: string;
			} | null;
		};
		pricing?: {
			price?: {
				gross: {
					amount: number;
					currency: string;
				};
			} | null;
			priceUndiscounted?: {
				gross: {
					amount: number;
					currency: string;
				};
			} | null;
		} | null;
		selectionAttributes?: Array<{
			attribute: {
				name: string;
				slug: string;
			};
			values: Array<{
				name?: string | null;
				value?: string | null;
			}>;
		}>;
		nonSelectionAttributes?: Array<{
			attribute: {
				name: string;
				slug: string;
			};
			values: Array<{
				name?: string | null;
				value?: string | null;
			}>;
		}>;
	};
	[key: string]: any;
}

export interface MedusaCart {
	id: string;
	currency_code?: string;
	items?: unknown[];
	lines: MedusaLineItem[];
	totalPrice: {
		gross: {
			amount: number;
			currency: string;
		};
	};
	total?: number;
	subtotal?: number;
	[key: string]: any;
}

interface MedusaResponse<T> {
	cart?: T;
}

/* ============================================================
 * MEDUSA REQUEST
 * ============================================================ */

async function medusaFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
		...options,
		headers: {
			"x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
			"Content-Type": "application/json",
			...(options.headers ?? {}),
		},
		cache: "no-store",
	});

	if (!response.ok) {
		const errorText = await response.text();

		console.error("[Medusa]", {
			url: `${MEDUSA_BACKEND_URL}${path}`,
			status: response.status,
			error: errorText,
		});

		throw new Error(`Medusa API error ${response.status}: ${errorText || response.statusText}`);
	}

	return response.json() as Promise<T>;
}

/* ============================================================
 * COOKIE
 * ============================================================ */

export async function getIdFromCookies(channel: string) {
	try {
		const cookieName = `checkoutId-${channel}`;

		const checkoutId = (await cookies()).get(cookieName)?.value ?? "";

		return checkoutId;
	} catch {
		return "";
	}
}

export async function saveIdToCookie(channel: string, cartId: string) {
	const shouldUseHttps =
		process.env.NEXT_PUBLIC_STOREFRONT_URL?.startsWith("https") || !!process.env.NEXT_PUBLIC_VERCEL_URL;

	const cookieName = `checkoutId-${channel}`;

	(await cookies()).set(cookieName, cartId, {
		sameSite: "lax",
		secure: shouldUseHttps,
		httpOnly: true,
		path: "/",
	});
}

export async function clearCheckoutCookie(channel: string) {
	const cookieName = `checkoutId-${channel}`;

	(await cookies()).delete(cookieName);
}

/* ============================================================
 * FIND CART
 * ============================================================ */

export async function find(cartId: string): Promise<MedusaCart | null> {
	if (!cartId) {
		return null;
	}

	try {
		const result = await medusaFetch<MedusaResponse<MedusaCart>>(
			`/store/carts/${encodeURIComponent(cartId)}`,
			{
				method: "GET",
			},
		);

		return result.cart ?? null;
	} catch (error) {
		console.error("[Medusa Cart] Failed to find cart:", error);

		return null;
	}
}

/* ============================================================
 * CREATE CART
 * ============================================================ */

export async function create({ channel: _channel }: { channel?: string } = {}): Promise<{
	ok: boolean;
	data?: {
		cart: MedusaCart;
	};
	error?: unknown;
}> {
	try {
		/*
		 * Medusa v2:
		 *
		 * POST /store/carts
		 *
		 * channel trong URL của storefront không nhất thiết
		 * là sales channel ID của Medusa.
		 *
		 * Nếu bạn có REGION_ID thì có thể truyền thêm region_id.
		 */

		const result = await medusaFetch<MedusaResponse<MedusaCart>>("/store/carts", {
			method: "POST",
			body: JSON.stringify({}),
		});

		if (!result.cart) {
			return {
				ok: false,
				error: "Medusa did not return a cart",
			};
		}

		return {
			ok: true,
			data: {
				cart: result.cart,
			},
		};
	} catch (error) {
		console.error("[Medusa Cart] Failed to create cart:", error);

		return {
			ok: false,
			error,
		};
	}
}

/* ============================================================
 * FIND OR CREATE CART
 * ============================================================ */

export async function findOrCreate({
	channel,
	checkoutId,
}: {
	checkoutId?: string;
	channel: string;
}): Promise<MedusaCart | null> {
	/*
	 * Có cart ID trong cookie
	 */
	if (checkoutId) {
		const cart = await find(checkoutId);

		if (cart) {
			return cart;
		}

		/*
		 * Cart cũ không tồn tại nữa.
		 * Tạo cart mới.
		 */
		await clearCheckoutCookie(channel);
	}

	/*
	 * Tạo Medusa cart mới
	 */
	const result = await create({
		channel,
	});

	if (!result.ok || !result.data?.cart) {
		return null;
	}

	const cart = result.data.cart;

	/*
	 * Lưu Medusa cart ID vào cookie
	 */
	await saveIdToCookie(channel, cart.id);

	return cart;
}

/* ============================================================
 * ADD LINE ITEM
 * ============================================================ */

export async function addLineItem({
	cartId,
	variantId,
	quantity = 1,
}: {
	cartId: string;
	variantId: string;
	quantity?: number;
}): Promise<MedusaCart | null> {
	if (!cartId) {
		throw new Error("Cart ID is required");
	}

	if (!variantId) {
		throw new Error("Variant ID is required");
	}

	if (quantity <= 0) {
		throw new Error("Quantity must be greater than 0");
	}

	try {
		/*
		 * Medusa v2:
		 *
		 * POST /store/carts/:cart_id/line-items
		 *
		 * Body:
		 * {
		 *   variant_id: "...",
		 *   quantity: 1
		 * }
		 */

		const result = await medusaFetch<MedusaResponse<MedusaCart>>(
			`/store/carts/${encodeURIComponent(cartId)}/line-items`,
			{
				method: "POST",
				body: JSON.stringify({
					variant_id: variantId,
					quantity,
				}),
			},
		);

		console.log("[Medusa Cart] Added item:", {
			cartId,
			variantId,
			quantity,
		});

		return result.cart ?? null;
	} catch (error) {
		console.error("[Medusa Cart] Failed to add line item:", error);

		throw error;
	}
}

/* ============================================================
 * UPDATE LINE ITEM
 * ============================================================ */

export async function updateLineItem({
	cartId,
	lineItemId,
	quantity,
}: {
	cartId: string;
	lineItemId: string;
	quantity: number;
}): Promise<MedusaCart | null> {
	if (!cartId) {
		throw new Error("Cart ID is required");
	}

	if (!lineItemId) {
		throw new Error("Line item ID is required");
	}

	if (quantity <= 0) {
		return deleteLineItem({
			cartId,
			lineItemId,
		});
	}

	const result = await medusaFetch<MedusaResponse<MedusaCart>>(
		`/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineItemId)}`,
		{
			method: "POST",
			body: JSON.stringify({
				quantity,
			}),
		},
	);

	return result.cart ?? null;
}

/* ============================================================
 * DELETE LINE ITEM
 * ============================================================ */

export async function deleteLineItem({
	cartId,
	lineItemId,
}: {
	cartId: string;
	lineItemId: string;
}): Promise<MedusaCart | null> {
	const result = await medusaFetch<MedusaResponse<MedusaCart>>(
		`/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineItemId)}`,
		{
			method: "DELETE",
		},
	);

	return result.cart ?? null;
}
