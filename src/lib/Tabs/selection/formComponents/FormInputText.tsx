import TextField from "@mui/material/TextField";
import { ComponentProps } from "react";
import { Controller } from "react-hook-form";
import { FieldPath, FieldValues } from "react-hook-form";
import { UseControllerProps } from "react-hook-form";

export const FormInputText = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  rules,
  ...textfieldProps
}: UseControllerProps<TFieldValues, TName> &
  ComponentProps<typeof TextField>) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <TextField
          helperText={error ? error.message : null}
          error={!!error}
          onChange={onChange}
          value={value}
          {...textfieldProps}
        />
      )}
    />
  );
};
