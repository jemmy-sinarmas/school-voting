import { ComponentProps } from "react";
import { TextInputProps as NativeTextInputProps } from "react-native";
import { TextInput as PaperTextInput } from "react-native-paper";

/**
 * react-native-paper 5.15.3 (its latest stable) derives TextInput's prop
 * type via `ComponentPropsWithRef<typeof NativeTextInput>`, which doesn't
 * resolve cleanly against RN 0.86's newer TextInput typings — the native
 * props (autoCapitalize, keyboardType, secureTextEntry, maxLength, ...) get
 * dropped from the inferred type even though Paper forwards them at runtime
 * via `{...rest}`. This wrapper restores the full native prop surface so
 * call sites don't need per-line type suppressions.
 */
type Props = ComponentProps<typeof PaperTextInput> & NativeTextInputProps;

export function AppTextInput(props: Props) {
  return <PaperTextInput {...props} />;
}
