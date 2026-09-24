import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from "@mui/material";
import { FC, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";

import { FormGroupColour } from "./formComponents/FormGroupColour.tsx";
import { FormInputText } from "./formComponents/FormInputText.tsx";

const GROUP_COLOURS = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
] as const;

export const GroupForm: FC<{
  open?: boolean;
  onClose: () => void;
  handleSave: (data: { title?: string; color: string }) => Promise<void>;
  group?: { title?: string; color: string };
}> = ({ open, onClose, handleSave, group }) => {
  const { control, reset, handleSubmit } = useForm<{
    title?: string;
    color: string;
  }>();
  useEffect(() => {
    reset(
      group
        ? group
        : {
            title: "New group",
            color:
              GROUP_COLOURS[
                Math.floor(Math.random() * (GROUP_COLOURS.length - 1))
              ],
          },
    );
  }, [group, open, reset]);
  const handleFormSubmit = useCallback<
    (data: { title?: string; color: string }) => Promise<void>
  >(
    async (data) => {
      await handleSave(data);
      onClose();
    },
    [handleSave, onClose],
  );

  return (
    <Dialog
      open={Boolean(open)}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      keepMounted={false}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <DialogContentText>
            {group !== undefined
              ? `Change group "${group.title}"`
              : "Add tabs to new group"}
          </DialogContentText>
          {/* The dialog has to take focus, or the keyboard is left behind it on
              the page it covers. It used to land on OK, which is the one
              control in here nobody opened the dialog to reach — a keyboard or
              screen-reader user arrived at "confirm" rather than at the field
              they came to fill. Selecting the text makes the rename case work
              by typing, since the field arrives holding the old name. */}
          <FormInputText
            name="title"
            control={control}
            label="Group name"
            size="small"
            margin="dense"
            fullWidth
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onFocus={(event) => {
              event.target.select();
            }}
            rules={{ required: true }}
          />
          <FormGroupColour
            name="color"
            control={control}
            row
            rules={{ required: true }}
            colours={GROUP_COLOURS}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" color="primary" variant="contained">
            OK
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
