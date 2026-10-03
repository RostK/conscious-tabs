import { FC, PropsWithChildren } from "react";

import { DropPlaceholder } from "../DnD";
import { useDropzone } from "../DnD/useDropzone.tsx";
import { TabGrid } from "../elements/TabGrid.tsx";
import { handleDrop } from "./handleDrop.ts";

export const WindowDropzone: FC<
  PropsWithChildren<{ window: chrome.windows.Window }>
> = ({ window }) => {
  const { isOver, active, Dropzone } = useDropzone({
    id: window.id as number,
    type: "window-end",
    data: window,
    onDrop: handleDrop,
  });
  return (
    <>
      {isOver && <DropPlaceholder />}
      {/* Somewhere to drop, mounted for the length of every drag, with nothing
          in it. Not a row, so not an item: see `decorative` on `TabGrid`. */}
      {active?.id && (
        <TabGrid decorative>
          <Dropzone sx={{ minHeight: "2rem" }} />
        </TabGrid>
      )}
    </>
  );
};
