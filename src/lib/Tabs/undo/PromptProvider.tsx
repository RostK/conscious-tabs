import { SnackbarProvider } from "notistack";
import { FC, PropsWithChildren } from "react";

import { SyncPrompt } from "./SyncPrompt.tsx";

export const PromptProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SnackbarProvider autoHideDuration={3000} maxSnack={1}>
      <SyncPrompt />
      {children}
    </SnackbarProvider>
  );
};
