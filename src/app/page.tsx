import { URProgressPage } from "@/components/urprogress/urprogress-page";
import { URProgressProvider } from "@/contexts/urprogress-provider";

export default function Home() {
  return (
    <URProgressProvider>
      <URProgressPage />
    </URProgressProvider>
  );
}
