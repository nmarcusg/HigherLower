import type { Metadata } from "next";
import CreatorStudio from "@/components/creator/CreatorStudio";

export const metadata: Metadata = {
  title: "Creator Studio",
  description: "Create, edit, and publish custom Higher or Lower comparison playsets.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudioPage() {
  return <CreatorStudio />;
}
