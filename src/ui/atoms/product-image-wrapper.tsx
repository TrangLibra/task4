import NextImage, { type ImageProps } from "next/image";
import clsx from "clsx";

interface ProductImageWrapperProps extends ImageProps {
	containerClassName?: string;
}

export const ProductImageWrapper = ({
	containerClassName,
	className,
	...props
}: ProductImageWrapperProps) => {
	return (
		<div className={clsx("aspect-square overflow-hidden rounded-2xl bg-secondary", containerClassName)}>
			<NextImage
				{...props}
				className={clsx(
					"h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-110",
					className,
				)}
			/>
		</div>
	);
};
