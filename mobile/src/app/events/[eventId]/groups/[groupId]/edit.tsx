import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, type JSX } from "react";
import { StyleSheet } from "react-native";
import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  TextField,
  useAppDialog,
} from "@/components";
import { useGroup } from "@/features/groups/hooks/use-group";
import { useGroupMembership } from "@/features/groups/hooks/use-group-membership";
import { useGroupAccess } from "@/features/groups/hooks/use-group-access";
import {
  groupNameMutationError,
  validateGroupName,
} from "@/features/groups/config/group-name-validation";
import { useUpdateGroup } from "@/features/groups/hooks/use-group-lifecycle";
import { colors, layout, spacing } from "@/theme";

export default function EditGroupRoute(): JSX.Element {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const group = useGroup(groupId);
  const membership = useGroupMembership(groupId);
  const access = useGroupAccess(groupId);
  const back = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
  };
  if (group.isLoading || membership.isLoading || access.isLoading)
    return (
      <ScreenContainer>
        <PageHeader leadingAction={back} title="Edit Group" />
        <LoadingSkeleton />
      </ScreenContainer>
    );
  const allowed =
    access.data === "event_admin" ||
    membership.data?.role === "super_organiser" ||
    (group.data?.groupKind === "operational" && membership.data?.role === "organiser");
  if (!group.data || !allowed)
    return (
      <ScreenContainer>
        <PageHeader leadingAction={back} title="Edit Group" />
        <EmptyState
          title="Not authorised"
          description="You do not have permission to edit this group."
        />
      </ScreenContainer>
    );
  return <EditGroupForm key={group.data.id} group={group.data} onBack={() => router.back()} />;
}

function EditGroupForm({
  group,
  onBack,
}: {
  group: { id: string; name: string; description: string | null; groupKind: string };
  onBack: () => void;
}): JSX.Element {
  const dialog = useAppDialog();
  const mutation = useUpdateGroup();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [backendNameError, setBackendNameError] = useState<string>();
  const nameError =
    (submitted || nameTouched ? validateGroupName(name) : undefined) ?? backendNameError;
  return (
    <ScreenContainer
      keyboardSafe
      scroll
      contentContainerStyle={styles.content}
      testID="edit-group-screen"
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: onBack,
        }}
        title="Edit Group"
        subtitle={`The ${group.groupKind} type and parent cannot be changed here.`}
      />
      <TextField
        label="Group name"
        required
        value={name}
        error={nameError}
        onBlur={() => setNameTouched(true)}
        onChangeText={(value) => {
          setName(value);
          setBackendNameError(undefined);
          mutation.reset();
        }}
        testID="edit-group-name"
      />
      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="edit-group-description"
      />
      <PrimaryButton
        fullWidth
        label="Save Group"
        loading={mutation.isPending}
        disabled={!name.trim() || mutation.isPending}
        onPress={() => {
          setSubmitted(true);
          setNameTouched(true);
          if (validateGroupName(name)) return;
          mutation.mutate(
            { groupId: group.id, name, description },
            {
              onSuccess: onBack,
              onError: (error) => {
                const duplicate = groupNameMutationError(
                  error,
                  group.groupKind === "category" ? "category" : "operational"
                );
                if (duplicate) setBackendNameError(duplicate);
                else dialog.alert("Group not updated", error.message);
              },
            }
          );
        }}
        testID="save-group-edit"
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.lg } });
