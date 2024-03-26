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
  | { type: "switch"; data: number }
  | { type: "clear" };

const reducer = (
  state: SelectionData,
  action: SelectionAction,
): SelectionData => {
  if (action.type === "clear") {
    return [];
  } else {
    const index = state.indexOf(action.data);
    if (index < 0) {
      return [...state, action.data];
    } else {
      return state.toSpliced(index, 1);
    }
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
