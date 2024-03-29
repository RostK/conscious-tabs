import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  ReducerAction,
  useMemo,
  useReducer,
} from "react";

export type SelectionData = number[];
export type SelectionAction =
  | { type: "set"; data: number[] }
  | { type: "deselect"; data: number[] }
  | { type: "select"; data: number[] }
  | { type: "switch"; data: number }
  | { type: "clear" };

const reducer = (
  state: SelectionData,
  action: SelectionAction,
): SelectionData => {
  switch (action.type) {
    case "clear":
      return [];
    case "switch":
      // eslint-disable-next-line no-case-declarations
      const index = state.indexOf(action.data);
      if (index < 0) {
        return [...state, action.data];
      } else {
        return state.toSpliced(index, 1);
      }
    case "select":
      return [...state, ...action.data];
    case "deselect":
      return [...state.filter((index) => !action.data.includes(index))];
    case "set":
      return [...action.data];
  }
};

export const SelectionContext = createContext<{
  selected: SelectionData;
  dispatch: Dispatch<ReducerAction<typeof reducer>>;
}>({ selected: [], dispatch: () => [] });

export const SelectionProvider: FC<PropsWithChildren> = ({ children }) => {
  const [selected, dispatch] = useReducer(reducer, []);
  const selectionControls = useMemo(
    () => ({
      selected,
      dispatch,
    }),
    [selected],
  );
  return (
    <SelectionContext.Provider value={selectionControls}>
      {children}
    </SelectionContext.Provider>
  );
};
