import Image from "next/image";

export function Banner() {
	return (
		<div className="mb-8">
			<Image
				src="/images/banner.jpg"
				alt="Banner"
				width={1400}
				height={500}
				className="h-auto w-full rounded-xl"
				priority
			/>
		</div>
	);
}
