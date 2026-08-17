import Link from "next/link";
// import { LinkWithChannel } from "../atoms/link-with-channel";
import { ChannelSelect } from "./channel-select";
import { ChannelsListDocument, MenuGetBySlugDocument } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { CACHE_PROFILES, applyCacheProfile } from "@/lib/cache-manifest";
import { CopyrightText } from "./copyright-text";
import { Logo } from "./shared/logo";
import { MapPin, Mail, Phone, Facebook, Instagram, Youtube } from "lucide-react"; // Default footer links when no CMS data is available
// const defaultFooterLinks = {
// 	support: [
// 		{ label: "Contact Us", href: "/contact" },
// 		{ label: "FAQs", href: "/faq" },
// 		{ label: "Shipping", href: "/shipping" },
// 		{ label: "Returns", href: "/returns" },
// 	],
// 	company: [
// 		{ label: "About", href: "/about" },
// 		{ label: "Sustainability", href: "/sustainability" },
// 		{ label: "Careers", href: "/careers" },
// 		{ label: "Press", href: "/press" },
// 	],
// };

/** Cached channels list - rarely changes */
async function getChannels() {
	"use cache";
	applyCacheProfile(CACHE_PROFILES.channels);

	if (!process.env.SALEOR_APP_TOKEN) {
		return null;
	}

	const result = await executePublicGraphQL(ChannelsListDocument, {
		headers: {
			Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}`,
		},
	});

	return result.ok ? result.data : null;
}

/** Cached footer menu */
async function getFooterMenu(channel: string) {
	"use cache";
	applyCacheProfile(CACHE_PROFILES.footerMenu);

	const result = await executePublicGraphQL(MenuGetBySlugDocument, {
		variables: { slug: "footer", channel },
		revalidate: 60 * 60 * 24,
	});

	return result.ok ? result.data : null;
}

export async function Footer({ channel }: { channel: string }) {
	const [, channels] = await Promise.all([getFooterMenu(channel), getChannels()]);

	// const menuItems = footerLinks?.menu?.items || [];

	return (
		<footer className="border-t border-gray-200 bg-white text-gray-800">
			{/* Extra bottom padding on mobile to account for sticky add-to-cart bar */}
			<div className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pb-12 lg:px-8 lg:py-16">
				<div className="grid grid-cols-1 gap-10 md:grid-cols-4">
					{/* Cột 1 */}
					<div>
						<Logo className="h-16 w-auto" />

						<div className="mt-5 space-y-4">
							<div className="flex items-start gap-3">
								<MapPin className="mt-1 h-5 w-5 text-orange-500" />
								<p className="text-gray-700">23/11 Nguyễn Văn Lạc, Bình Thạnh, TP.HCM</p>
							</div>

							<div className="flex items-center gap-3">
								<Mail className="h-5 w-5 text-orange-500" />
								<p className="text-gray-700">meomeo@meocung.vn</p>
							</div>

							<div className="flex items-center gap-3">
								<Phone className="h-5 w-5 text-orange-500" />
								<p className="text-gray-700">0902751819</p>
							</div>
						</div>

						<h3 className="mb-4 mt-8 text-lg font-bold">MẠNG XÃ HỘI</h3>

						<div className="flex gap-4">
							<Facebook className="h-6 w-6 cursor-pointer text-blue-600 transition hover:scale-110" />
							<Instagram className="h-6 w-6 cursor-pointer text-pink-500 transition hover:scale-110" />
							<Youtube className="h-6 w-6 cursor-pointer text-red-600 transition hover:scale-110" />
						</div>
					</div>

					{/* Cột 2 */}
					<div>
						<h3 className="mb-4 text-xl font-bold">Giới thiệu</h3>

						<ul className="space-y-3 text-gray-700">
							<li className="cursor-pointer transition hover:text-orange-500">Trang chủ</li>
							<li className="cursor-pointer transition hover:text-orange-500">Tin tức</li>
							<li className="cursor-pointer transition hover:text-orange-500">Về Mèo Cưng</li>
						</ul>
					</div>

					{/* Cột 3 */}
					<div>
						<h3 className="mb-4 text-xl font-bold">Hỗ trợ khách hàng</h3>

						<ul className="space-y-3 text-gray-700">
							<li className="cursor-pointer transition hover:text-orange-500">Hướng dẫn mua hàng</li>
							<li className="cursor-pointer transition hover:text-orange-500">Thanh toán VNPAY</li>
							<li className="cursor-pointer transition hover:text-orange-500">Hướng dẫn thanh toán</li>
						</ul>
					</div>

					{/* Cột 4 */}
					<div>
						<h3 className="mb-4 text-xl font-bold">Chính sách</h3>
						<ul className="space-y-3 text-gray-700">
							<li className="cursor-pointer transition hover:text-orange-500">Chính sách kiểm hàng</li>
							<li className="cursor-pointer transition hover:text-orange-500">Chính sách đổi trả</li>
							<li className="cursor-pointer transition hover:text-orange-500">Chính sách vận chuyển</li>
							<li className="cursor-pointer transition hover:text-orange-500">Điều khoản</li>
						</ul>
						<h3 className="mb-4 mt-8 text-lg font-bold">PHƯƠNG THỨC THANH TOÁN</h3>
						<div className="mt-4 flex flex-wrap items-center gap-4">
							<img src="/cod.png" alt="COD" className="h-10 w-auto object-contain" />
							<img src="/credit.png" alt="credit" className="h-10 w-auto object-contain" />
							<img src="/vnpay.png" alt="VNPAY" className="h-10 w-auto object-contain" />
							<img src="/transfer.png" alt="transfer" className="h-10 w-auto object-contain" />
						</div>
					</div>
				</div>

				{/* Channel selector */}
				{channels?.channels && (
					<div className="mt-8 text-neutral-400">
						<label className="flex items-center gap-2 text-sm">
							<span>Change currency:</span>
							<ChannelSelect channels={channels.channels} />
						</label>
					</div>
				)}

				{/* Bottom bar */}
				<div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-800 pt-8 sm:flex-row">
					<p className="text-xs text-neutral-500">
						<CopyrightText />
					</p>
					<div className="flex items-center gap-6">
						<Link
							href="/privacy"
							prefetch={false}
							className="text-xs text-neutral-500 transition-colors hover:text-neutral-300"
						>
							Privacy Policy
						</Link>
						<Link
							href="/terms"
							prefetch={false}
							className="text-xs text-neutral-500 transition-colors hover:text-neutral-300"
						>
							Terms of Service
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
