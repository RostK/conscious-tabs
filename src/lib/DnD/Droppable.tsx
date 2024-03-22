import { FC, PropsWithChildren } from "react";
import { useDroppable } from "@dnd-kit/core";
import { GroupItem, TabItem } from "../Tabs";

export const Droppable: FC<
  PropsWithChildren<{ id: string | number; data: TabItem | GroupItem }>
> = ({ children, id, data }) => {
  const { isOver, active, setNodeRef } = useDroppable({
    id,
    data,
  });
  const style = {
    paddingBottom: active?.id !== id && isOver ? "2.2rem" : undefined,
    pointerEvents: active?.id ? ("none" as const) : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
};
