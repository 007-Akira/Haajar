import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet } from "react-native";

import { EmptyState, ScreenContainer } from "@/components";
import { spacing } from "@/theme";

export default function GroupsRoute(): JSX.Element {
  const router = useRouter();
  return (
    <ScreenContainer contentContainerStyle={styles.content} showGrid testID="groups-tab">
      <EmptyState
        actionLabel="Join Group"
        description="Open a Haajar invitation link or enter the organiser's join code."
        onActionPress={() => router.push("/join" as never)}
        testID="groups-join-action"
        title="Your groups"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { paddingTop: spacing["2xl"] } });
