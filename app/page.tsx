import { Sawgrass17Client } from "@/components/golf/Sawgrass17Client";

// Full-viewport render of TPC Sawgrass Hole 17
// This page is the standalone dev host — the component drops into
// the main portfolio at D:\thomascrowe when ready.
// RSC page → delegates canvas work to Sawgrass17Client ("use client")

export default function Page() {
  return (
    <main style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Sawgrass17Client />
    </main>
  );
}
