"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, SearchIcon } from "lucide-react";

type Category = {
	id: string;
	name: string;
	handle: string;
};

type SearchBarProps = {
	channel: string;
	categories?: Category[];
};

export function SearchBar({ channel, categories = [] }: SearchBarProps) {
	const router = useRouter();

	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const query = search.trim();

		if (!query) {
			return;
		}

		router.push(`/${encodeURIComponent(channel)}/search?query=${encodeURIComponent(query)}`);

		setOpen(false);
	};

	const handleCategoryClick = (handle: string) => {
		setOpen(false);

		router.push(`/${encodeURIComponent(channel)}/categories/${encodeURIComponent(handle)}`);
	};

	return (
		<div className="relative w-full max-w-4xl">
			<form onSubmit={handleSubmit}>
				<div className="flex h-14 overflow-visible rounded-full border border-gray-300 bg-white">
					{/* DANH MỤC */}
					<button
						type="button"
						onClick={() => setOpen((prev) => !prev)}
						className="flex w-64 shrink-0 items-center justify-between rounded-l-full border-r px-6 text-gray-600 transition-colors hover:bg-gray-50"
					>
						<span>Danh mục sản phẩm</span>

						<ChevronDown
							className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
								open ? "rotate-180" : ""
							}`}
						/>
					</button>

					{/* SEARCH */}
					<input
						type="text"
						name="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Tìm theo tên sản phẩm..."
						autoComplete="off"
						className="min-w-0 flex-1 border-0 bg-transparent px-5 text-base outline-none focus:outline-none focus:ring-0"
					/>

					{/* BUTTON */}
					<button
						type="submit"
						className="flex w-20 shrink-0 items-center justify-center rounded-r-full bg-[#ff8a5b] text-white transition-colors hover:bg-[#ff7440]"
					>
						<SearchIcon className="h-6 w-6" />
					</button>
				</div>
			</form>

			{/* DROPDOWN */}
			{open && (
				<div className="absolute left-0 top-[60px] z-[999] w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 text-gray-700 shadow-xl">
					{categories.length > 0 ? (
						categories.map((category) => (
							<button
								key={category.id}
								type="button"
								onClick={() => handleCategoryClick(category.handle)}
								className="block w-full px-5 py-3 text-left text-sm transition-colors hover:bg-orange-50 hover:text-orange-500"
							>
								{category.name}
							</button>
						))
					) : (
						<div className="px-5 py-3 text-sm text-gray-500">Không có danh mục sản phẩm</div>
					)}
				</div>
			)}
		</div>
	);
}
