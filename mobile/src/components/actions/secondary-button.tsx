import type { JSX } from "react";

import { ButtonBase, type ButtonBaseProps } from "./button-base";

export interface SecondaryButtonProps extends ButtonBaseProps {
  children?: never;
}

export function SecondaryButton(props: SecondaryButtonProps): JSX.Element {
  return <ButtonBase {...props} variant="secondary" />;
}
