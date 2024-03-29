import { FC, useEffect } from "react";

import { promptUndo } from "./promptUndo.tsx";

export const SyncPrompt: FC = () => {
  useEffect(() => {
    const handleMessage = ({
      type,
      payload,
    }: {
      type: string;
      payload: string;
    }) => {
      if (type === "undo-prompt") {
        promptUndo(payload, true);
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);
  return <></>;
};
