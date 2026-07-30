import type { JSX } from "react";

import { PlaceholderScreen } from "@/components/layout/placeholder-screen";

export default function HomeRoute(): JSX.Element {
  return (
    <PlaceholderScreen
      title="Home"
      description="Your events and active roll calls will appear here."
    />
  );
}
