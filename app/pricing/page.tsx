import type { Metadata } from "next";
import PricingPlansView from "@/components/pricing/PricingPlansView";

export const metadata: Metadata = {
  title: "Plans & Pricing",
  description:
    "Compare Higher or Lower Free Tier vs. Creator Pro: active playset slot limits (3 vs. 25), items per set, archiving and permanent deletion rules, and one-time Pro unlock details.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Plans & Pricing — Higher or Lower",
    description:
      "Compare Free Tier (3 active playset slots, 50 items/set) and Creator Pro (25 active slots, 200 items/set, ad-free & Studio analytics).",
    url: "/pricing",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <div className="ui-scale-120">
      <PricingPlansView />
    </div>
  );
}
