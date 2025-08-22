import { URGraphPage } from "@/components/urgraph/urgraph-page";
import { URGraphProvider } from "@/contexts/urgraph-provider";

export default function Home() {
  return (
    <URGraphProvider>
      <URGraphPage />
    </URGraphProvider>
  );
}
