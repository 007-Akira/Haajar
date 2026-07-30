import { forwardRef } from "react";
import type { TextInput } from "react-native";

import { TextField, type TextFieldProps } from "./text-field";

export interface PhoneFieldProps extends TextFieldProps {
  format?: "international" | "national";
}

export const PhoneField = forwardRef<TextInput, PhoneFieldProps>(function PhoneField(
  { format = "international", ...props },
  ref
) {
  return (
    <TextField
      {...props}
      ref={ref}
      autoComplete={format === "national" ? "tel-national" : "tel"}
      inputMode="tel"
      keyboardType="phone-pad"
      textContentType="telephoneNumber"
    />
  );
});
