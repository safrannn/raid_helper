"use client";

import dynamic from "next/dynamic";

const TimelineComponent = dynamic(
  () =>
    import("@/app/visTimeline/visTimelineComponent").then(
      (m) => m.VisTimelineComponent,
    ),
  { ssr: false },
);

export default function Home() {
  return (
    <section className="h-full p-2">
      <TimelineComponent />
    </section>
  );
}
