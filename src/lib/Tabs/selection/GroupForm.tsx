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
          <FormInputText
            name="title"
            control={control}
            label="Group name"
            size="small"
            margin="dense"
            fullWidth
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
          {/* A modal has to take focus, or the keyboard is left behind it
              on the page it covers — which is what this autoFocus is for,
              not a preference. */}
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <Button type="submit" autoFocus color="primary" variant="contained">
            OK
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
