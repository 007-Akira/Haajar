import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { EmptyState, PageHeader, ScreenContainer } from "@/components";
import { colors, layout } from "@/theme";
export function GeneralScannerUnavailableScreen(): JSX.Element {
  const router = useRouter();
  return (
    <ScreenContainer showGrid testID="general-scanner-safe-block">
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
        }}
        title="General Scanner"
      />
      <EmptyState
        title="Secure resolver required"
        description="General scanning is safely blocked until the backend can resolve an opaque membership ticket against an event-wide attendance unit without trusting a group identifier from the client."
      />
    </ScreenContainer>
  );
}
