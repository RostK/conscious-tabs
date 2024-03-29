import { Active, useDroppable } from "@dnd-kit/core";
import { styled } from "@mui/material";
import { ComponentProps, FC, PropsWithChildren, useMemo } from "react";

import { GroupItem, TabItem } from "../types.ts";

export type DefaultDrag = TabItem[] | TabItem | GroupItem;

export type DZonDrop<DZData, DropData = DefaultDrag> = (
  drop: DropData,
  dropzone: { type: string; data: DZData },
) => Promise<void>;

export type DZCurrentData<DZData = unknown, DropData = DefaultDrag> = {
  type: string;
  data: DZData;
  dropHandler?: DZonDrop<DZData, DropData>;
};

// eslint-disable-next-line react-refresh/only-export-components
const DropzoneEl = styled("div")``;

export const useDropzone: <DZData = unknown, DropData = DefaultDrag>({
  type,
  id,
  data,
  onDrop,
}: {
  type: string;
  id: string | number;
  data: DZData;
  onDrop?: DZonDrop<DZData, DropData>;
}) => {
  Dropzone: FC<
    PropsWithChildren<{ sx?: ComponentProps<typeof DropzoneEl>["sx"] }>
  >;
  isOver: boolean;
  isSelf: boolean;
  active: Active | null;
} = <DZData = unknown, DropData = unknown>({
  type,
  id,
  data,
  onDrop,
}: {
  type: string;
  id: string | number;
  data: DZData;
  onDrop?: DZonDrop<DZData, DropData>;
}) => {
  const dzPayload: DZCurrentData<DZData, DropData> = {
    type,
    data,
    dropHandler: onDrop,
  };

  const {
    isOver,
    active,
    setNodeRef: setDroppableRef,
  } = useDroppable({
    id: `${type}--${id}`,
    data: dzPayload,
  });

  const Dropzone = useMemo(() => {
    const Dz: FC<
      PropsWithChildren<{ sx?: ComponentProps<typeof DropzoneEl>["sx"] }>
    > = ({ sx, children }) => {
      return (
        <DropzoneEl
          ref={setDroppableRef}
          sx={[...(Array.isArray(sx) ? sx : [sx])]}
        >
          {children}
        </DropzoneEl>
      );
    };
    return Dz;
  }, [setDroppableRef]);

  return { isOver, isSelf: active?.id === id, Dropzone, active };
};
