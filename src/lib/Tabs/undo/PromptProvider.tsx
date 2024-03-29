import { SnackbarProvider } from "notistack";
import { FC, PropsWithChildren } from "react";

export const PromptProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SnackbarProvider autoHideDuration={3000} maxSnack={1}>
      {children}
    </SnackbarProvider>
  );
};
