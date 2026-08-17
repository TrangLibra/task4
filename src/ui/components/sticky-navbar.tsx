"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown, Phone } from "lucide-react";

type Category = {
	id: string;
	name: string;
	handle: string;
};

type StickyNavbarProps = {
	channel: string;
	categories: Category[];
};

export function StickyNavbar({ channel, categories }: StickyNavbarProps) {
	const [open, setOpen] = useState(false);

	const closeMenu = () => {
		setOpen(false);
	};

	return (
		<>
			{/* ================= THANH NAVBAR MÀU CAM ================= */}
			<div className="relative z-40 bg-orange-400 text-white">
				<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
					{/* LEFT */}
					<div className="flex h-full items-center gap-8 font-medium">
						{/* DANH MỤC */}
						<button
							type="button"
							onClick={() => setOpen(true)}
							className="flex h-full items-center gap-2 transition-colors hover:text-orange-100"
						>
							<Menu className="h-5 w-5" />

							<span>Danh mục sản phẩm</span>

							<ChevronDown
								className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
							/>
						</button>

						{/* ALL PRODUCTS */}
						<Link
							href={`/${encodeURIComponent(channel)}/products`}
							className="transition-colors hover:text-orange-100"
						>
							All Products
						</Link>

						{/* TIN TỨC */}
						<Link
							href={`/${encodeURIComponent(channel)}`}
							className="transition-colors hover:text-orange-100"
						>
							Tin tức
						</Link>
					</div>

					{/* HOTLINE */}
					<div className="hidden items-center gap-2 sm:flex">
						<Phone className="h-5 w-5" />
						<span>Hotline: 0902751819</span>
					</div>
				</div>
			</div>

			{/* ================= OVERLAY ================= */}
			{open && (
				<div className="fixed inset-0 z-[999] bg-black/50" onClick={closeMenu}>
					{/* ================= SIDEBAR ================= */}
					<div
						className="h-full w-[440px] max-w-[90vw] overflow-y-auto bg-white text-gray-800 shadow-2xl"
						onClick={(event) => event.stopPropagation()}
					>
						{/* HEADER SIDEBAR */}
						<div className="flex h-20 items-center justify-between border-b px-5">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200">
									<Menu className="h-5 w-5" />
								</div>

								<div>
									<p className="text-sm text-gray-400">Danh mục</p>

									<p className="font-semibold text-gray-900">Sản phẩm</p>
								</div>
							</div>

							<button
								type="button"
								onClick={closeMenu}
								className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-400 text-orange-500 transition-colors hover:bg-orange-50"
								aria-label="Đóng danh mục"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						{/* ================= CATEGORIES ================= */}
						<div className="border-b">
							{categories.length > 0 ? (
								categories.map((category) => (
									<Link
										key={category.id}
										href={`/${encodeURIComponent(channel)}/categories/${encodeURIComponent(category.handle)}`}
										onClick={closeMenu}
										className="block border-b border-gray-100 px-6 py-4 text-[16px] transition-colors last:border-b-0 hover:bg-orange-50 hover:text-orange-500"
									>
										{category.name}
									</Link>
								))
							) : (
								<div className="px-6 py-5 text-sm text-gray-500">Không có danh mục sản phẩm</div>
							)}
						</div>

						{/* ================= ALL PRODUCTS ================= */}
						<Link
							href={`/${encodeURIComponent(channel)}/products`}
							onClick={closeMenu}
							className="block border-b px-6 py-5 text-[16px] transition-colors hover:bg-orange-50 hover:text-orange-500"
						>
							Tất cả sản phẩm
						</Link>

						{/* ================= TIN TỨC ================= */}
						<Link
							href={`/${encodeURIComponent(channel)}`}
							onClick={closeMenu}
							className="block border-b px-6 py-5 text-[16px] transition-colors hover:bg-orange-50 hover:text-orange-500"
						>
							Tin tức
						</Link>
					</div>
				</div>
			)}
		</>
	);
}
