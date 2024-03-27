import { FC, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from "@mui/material";
import { FormInputText } from "./formComponents/FormInputText.tsx";
import { FormGroupColour } from "./formComponents/FormGroupColour.tsx";

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
  handleSave: (data: { name: string; color: string }) => Promise<void>;
}> = ({ open, onClose, handleSave }) => {
  const { control, reset, handleSubmit } = useForm({
    defaultValues: {
      name: "New group",
      color:
        GROUP_COLOURS[Math.floor(Math.random() * (GROUP_COLOURS.length - 1))],
    },
  });
  useEffect(() => {
    reset({
      name: "New group",
      color:
        GROUP_COLOURS[Math.floor(Math.random() * (GROUP_COLOURS.length - 1))],
    });
  }, [open, reset]);
  const handleFormSubmit = useCallback<
    (data: { name: string; color: string }) => Promise<void>
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
          <DialogContentText>Add tabs to new group</DialogContentText>
          <FormInputText
            name="name"
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
          <Button type="submit" autoFocus color="primary" variant="contained">
            OK
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
