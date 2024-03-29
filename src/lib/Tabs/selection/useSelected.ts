import { useCallback, useContext, useMemo } from "react";

import { SelectionContext } from "./SelectionContext.tsx";

export const useSelected = (id: number) => {
  const { selected, dispatch } = useContext(SelectionContext);
  const isSelected = selected.includes(id);
  const switchSelection = useCallback(() => {
    dispatch({ type: "switch", data: id });
  }, [dispatch, id]);
  return useMemo(
    () => ({ isSelected, switchSelection }),
    [isSelected, switchSelection],
  );
};
