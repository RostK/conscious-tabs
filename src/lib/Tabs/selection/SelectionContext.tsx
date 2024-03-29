import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  ReducerAction,
  useEffect,
  useMemo,
  useReducer,
} from "react";

export type SelectionData = number[];
export type SelectionAction =
  | { type: "set"; data: number[] }
  | { type: "sync"; data: number[] }
  | { type: "deselect"; data: number[] }
  | { type: "select"; data: number[] }
  | { type: "switch"; data: number }
  | { type: "clear" };

const broadcast = (payload: number[]): void => {
  void chrome.runtime.sendMessage({ type: "selection", payload });
};

const updateSelected = (
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
    case "sync":
      return [...action.data];
  }
};

const reducer = (
  state: SelectionData,
  action: SelectionAction,
): SelectionData => {
  const newState = updateSelected(state, action);
  if (action.type !== "sync") {
    broadcast(newState);
  }
  return newState;
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
  useEffect(() => {
    const handleRemove = (id: number | undefined) => {
      if (id) {
        dispatch({ type: "deselect", data: [id] });
      }
    };
    const handleMessage = ({
      type,
      payload,
    }: {
      type: string;
      payload: number[];
    }) => {
      if (type === "selection") {
        dispatch({ type: "sync", data: payload });
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.tabs.onRemoved.addListener(handleRemove);
    return () => {
      chrome.tabs.onRemoved.removeListener(handleRemove);
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  return (
    <SelectionContext.Provider value={selectionControls}>
      {children}
    </SelectionContext.Provider>
  );
};
