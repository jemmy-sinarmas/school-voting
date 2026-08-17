import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { useLanguage } from "../i18n/LanguageContext";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  function close(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Portal>
        <Dialog visible={!!state} onDismiss={() => close(false)}>
          <Dialog.Title>{state?.options.title}</Dialog.Title>
          {state?.options.description && (
            <Dialog.Content>
              <Text variant="bodyMedium">{state.options.description}</Text>
            </Dialog.Content>
          )}
          <Dialog.Actions>
            <Button onPress={() => close(false)}>{t("common.cancel")}</Button>
            <Button onPress={() => close(true)} textColor={state?.options.destructive ? "#c0392b" : undefined}>
              {state?.options.confirmLabel ?? t("common.confirm")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
