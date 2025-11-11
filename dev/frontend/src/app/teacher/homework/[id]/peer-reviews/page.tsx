"use client";
import { useParams } from "next/navigation";
import { PeerReviewPanel } from "@/components/homework/PeerReviewPanel";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id) return null;
  return (
    <div className="w-full max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Peer Reviews</h1>
      <PeerReviewPanel homeworkId={id} />
    </div>
  );
}
