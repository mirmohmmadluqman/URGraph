import { LifeGraphPage } from "@/components/lifegraph/lifegraph-page";
import { LifeGraphProvider } from "@/contexts/lifegraph-provider";

export default function Home() {
  return (
    <LifeGraphProvider>
      <LifeGraphPage />
    </LifeGraphProvider>
  );
}
