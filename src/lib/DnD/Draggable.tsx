import { FC, PropsWithChildren } from "react";
import { useDraggable } from "@dnd-kit/core";
import { TabItem } from "../Tabs";

export const Draggable: FC<
  PropsWithChildren<{ id: string | number; data: TabItem }>
> = ({ children, data, id }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
    data,
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {children}
    </div>
  );
};
