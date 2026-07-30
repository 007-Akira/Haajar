import { Link } from "expo-router";
import { Button } from "heroui-native";
import type { JSX } from "react";

import { PlaceholderScreen } from "@/components/layout/placeholder-screen";

export function ProfileSetupScreen(): JSX.Element {
  return (
    <PlaceholderScreen
      title="Profile setup"
      description="Name and phone fields will be added when the profile flow is implemented."
    >
      <Link href="/(tabs)" asChild>
        <Button>Open Haajar</Button>
      </Link>
    </PlaceholderScreen>
  );
}
