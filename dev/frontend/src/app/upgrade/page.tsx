"use client";

import { useRouter } from "next/navigation";
import { PricingModal } from "@/components/pricing/PricingModal";

export default function UpgradePage() {
  const router = useRouter();
  return (
    <PricingModal isOpen={true} onClose={() => router.back()} />
  );
}
