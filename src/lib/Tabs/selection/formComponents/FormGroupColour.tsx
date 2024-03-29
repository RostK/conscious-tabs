import { Radio, RadioGroup } from "@mui/material";
import { ComponentProps } from "react";
import { Controller } from "react-hook-form";
import { FieldPath, FieldValues } from "react-hook-form";
import { UseControllerProps } from "react-hook-form";

export const FormGroupColour = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  colours,
  name,
  control,
  rules,
  ...radiogroupProps
}: Exclude<UseControllerProps<TFieldValues, TName>, "name"> &
  ComponentProps<typeof RadioGroup> & { colours: Readonly<string[]> }) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, value } }) => (
        <RadioGroup onChange={onChange} value={value} {...radiogroupProps}>
          {colours.map((colour) => (
            <Radio
              key={colour}
              value={colour}
              onChange={onChange}
              sx={{
                p: "3px",
                color: colour,
                "&.Mui-checked": {
                  color: colour,
                },
              }}
            />
          ))}
        </RadioGroup>
      )}
    />
  );
};
