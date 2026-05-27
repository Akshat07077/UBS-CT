"use client";
import { useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

function BookingRedirect() {
  const { carId } = useParams<{ carId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickup = searchParams.get("pickup") ?? "";
  const ret = searchParams.get("return") ?? "";
  const pickupTime = searchParams.get("pickupTime") ?? "";
  const returnTime = searchParams.get("returnTime") ?? "";

  useEffect(() => {
    const q = new URLSearchParams();
    if (pickup) q.set("pickup", pickup);
    if (ret) q.set("return", ret);
    if (pickupTime) q.set("pickupTime", pickupTime);
    if (returnTime) q.set("returnTime", returnTime);
    q.set("book", "1");
    router.replace(`/cars/${carId}?${q.toString()}`);
  }, [carId, pickup, ret, pickupTime, returnTime, router]);

  return (
    <div className="min-h-screen flex justify-center items-center text-muted-foreground text-sm">
      Opening booking…
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex justify-center items-center"><Skeleton className="w-8 h-8 rounded-full" /></div>}>
      <BookingRedirect />
    </Suspense>
  );
}
