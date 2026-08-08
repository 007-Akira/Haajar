import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, shadows, spacing, typography } from "@/theme";

export interface AppDialogAction {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface DialogState {
  title: string;
  message?: string;
  actions: AppDialogAction[];
}

interface AppDialogContextValue {
  alert: (title: string, message?: string, actions?: AppDialogAction[]) => void;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }): JSX.Element {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const alert = useCallback(
    (title: string, message?: string, actions: AppDialogAction[] = [{ text: "OK" }]) =>
      setDialog({ title, message, actions: actions.length ? actions : [{ text: "OK" }] }),
    []
  );
  const dismiss = useCallback(() => setDialog(null), []);
  const value = useMemo(() => ({ alert }), [alert]);
  const cancelAction = dialog?.actions.find((action) => action.style === "cancel");

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <Modal
        animationType="fade"
        onRequestClose={() => {
          dismiss();
          cancelAction?.onPress?.();
        }}
        transparent
        visible={dialog !== null}
      >
        <View style={styles.scrim} testID="app-dialog">
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.title}>
              {dialog?.title}
            </Text>
            {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
            <View style={styles.actions}>
              {dialog?.actions.map((action, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={`${action.text}-${index}`}
                  onPress={() => {
                    dismiss();
                    action.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.action,
                    action.style === "destructive" ? styles.destructive : styles.standard,
                    pressed && styles.pressed,
                  ]}
                  testID={`app-dialog-action-${index}`}
                >
                  <Text
                    style={[
                      styles.actionLabel,
                      action.style === "destructive"
                        ? styles.destructiveLabel
                        : styles.standardLabel,
                    ]}
                  >
                    {action.text.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog(): AppDialogContextValue {
  const context = useContext(AppDialogContext);
  if (!context) throw new Error("useAppDialog must be used inside AppDialogProvider");
  return context;
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.scrim,
  },
  dialog: {
    ...shadows.hardSmall,
    width: "100%",
    maxWidth: 480,
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.xs,
  },
  title: { ...typography.headingLarge, color: colors.textPrimary },
  message: { ...typography.body, color: colors.textSecondary },
  actions: { gap: spacing.sm },
  action: {
    minHeight: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: layout.borderWidth,
    borderRadius: radii.xs,
  },
  standard: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  destructive: { backgroundColor: colors.danger, borderColor: colors.textPrimary },
  pressed: { opacity: 0.75, transform: [{ translateX: 2 }, { translateY: 2 }] },
  actionLabel: { ...typography.button },
  standardLabel: { color: colors.textPrimary },
  destructiveLabel: { color: colors.textInverse },
});
