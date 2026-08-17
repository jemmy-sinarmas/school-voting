import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  /** When set, the confirm button stays disabled until the user types this exact value — for actions that can never be undone. */
  confirmText?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null);
  const [typed, setTyped] = useState("");

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setTyped("");
      setState({ options, resolve });
    });
  }, []);

  function close(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  const value = useMemo(() => confirm, [confirm]);
  const confirmText = state?.options.confirmText;
  const canConfirm = !confirmText || typed === confirmText;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog open={!!state} onClose={() => close(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{state?.options.title}</DialogTitle>
        <DialogContent>
          {state?.options.description && <DialogContentText>{state.options.description}</DialogContentText>}
          {confirmText && (
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label={`Type "${confirmText}" to confirm`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => close(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => close(true)}
            color={state?.options.destructive ? "error" : "primary"}
            variant="contained"
            disabled={!canConfirm}
          >
            {state?.options.confirmLabel ?? "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
