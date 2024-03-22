import { Droppable } from "../../DnD/Droppable.tsx";
import { Draggable } from "../../DnD/Draggable.tsx";
import { TabDisplay } from "../displays/TabDisplay.tsx";

export const TabListItem: typeof TabDisplay = ({ tab, ...props }) => {
  return (
    <Droppable id={tab.id as number} data={tab}>
      <Draggable id={tab.id as number} data={tab}>
        <TabDisplay tab={tab} {...props} />
      </Draggable>
    </Droppable>
  );
};
