import { Typography } from "heroui-native";
import type { JSX, ReactNode } from "react";
import { View } from "react-native";

type PlaceholderScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderScreen({
  title,
  description,
  children,
}: PlaceholderScreenProps): JSX.Element {
  return (
    <View className="flex-1 justify-center gap-4 bg-background px-6">
      <Typography.Heading type="h1">{title}</Typography.Heading>
      <Typography.Paragraph>{description}</Typography.Paragraph>
      {children}
    </View>
  );
}
