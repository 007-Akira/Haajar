import { Link } from "expo-router";
import { Button } from "heroui-native";
import type { JSX } from "react";

import { PlaceholderScreen } from "@/components/layout/placeholder-screen";

export function SignInScreen(): JSX.Element {
  return (
    <PlaceholderScreen
      title="Sign in"
      description="Google sign-in will be connected in a later stage."
    >
      <Link href="/profile-setup" asChild>
        <Button>Continue with mock account</Button>
      </Link>
    </PlaceholderScreen>
  );
}
