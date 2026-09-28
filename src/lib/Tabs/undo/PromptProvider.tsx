import { SnackbarProvider } from "notistack";
import { FC, PropsWithChildren } from "react";

import { PROMPT_DURATION, SyncPrompt } from "./SyncPrompt.tsx";

export const PromptProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SnackbarProvider autoHideDuration={PROMPT_DURATION} maxSnack={1}>
      <SyncPrompt />
      {children}
    </SnackbarProvider>
  );
};
