"use client";

import { type ReactNode } from "react";

interface Attribute {
	name: string;
	value: string | boolean | string[];
}

interface ProductAttributesProps {
	descriptionHtml?: string[] | null;
	attributes?: Attribute[];
	careInstructions?: string | null;
}

function formatValue(value: string | boolean | string[]): ReactNode {
	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}

	if (Array.isArray(value)) {
		return value.join(", ");
	}

	return value || "-";
}

export function ProductAttributes({
	descriptionHtml,
	attributes = [],
	careInstructions,
}: ProductAttributesProps) {
	// Không hiển thị Size và Color ở đây
	// vì Size/Color đã được xử lý ở VariantSectionDynamic
	const displayAttributes = attributes.filter((attr) => !["Size", "Color"].includes(attr.name));

	return (
		<div className="mt-10 space-y-10">
			{/* ============================================================
			    PRODUCT INFORMATION
			============================================================ */}
			{displayAttributes.length > 0 && (
				<section className="border-t border-gray-200 pt-6">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-medium text-gray-700">Product Information</h2>

						<span className="text-xl text-gray-500">−</span>
					</div>

					<div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-7 sm:grid-cols-2">
						{displayAttributes.map((attribute) => (
							<div key={attribute.name}>
								<p className="text-sm font-semibold text-gray-900">{attribute.name}</p>

								<p className="mt-2 text-sm text-gray-700">{formatValue(attribute.value)}</p>
							</div>
						))}
					</div>
				</section>
			)}

			{/* ============================================================
			    DESCRIPTION
			============================================================ */}
			{descriptionHtml && descriptionHtml.length > 0 && (
				<section className="border-t border-gray-200 pt-6">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-medium text-gray-700">Description</h2>

						<span className="text-xl text-gray-500">−</span>
					</div>

					<div className="prose mt-6 max-w-none text-sm text-gray-700">
						{descriptionHtml.map((html, index) => (
							<div key={`${html}-${index}`} dangerouslySetInnerHTML={{ __html: html }} />
						))}
					</div>
				</section>
			)}

			{/* ============================================================
			    CARE INSTRUCTIONS
			============================================================ */}
			{careInstructions && (
				<section className="border-t border-gray-200 pt-6">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-medium text-gray-700">Care Instructions</h2>

						<span className="text-xl text-gray-500">−</span>
					</div>

					<p className="mt-6 text-sm leading-7 text-gray-700">{careInstructions}</p>
				</section>
			)}
		</div>
	);
}
