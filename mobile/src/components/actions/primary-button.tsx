import type { JSX } from "react";

import { ButtonBase, type ButtonBaseProps } from "./button-base";

export interface PrimaryButtonProps extends ButtonBaseProps {
  children?: never;
}

export function PrimaryButton(props: PrimaryButtonProps): JSX.Element {
  return <ButtonBase {...props} variant="primary" />;
}
