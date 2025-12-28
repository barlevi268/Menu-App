import {
  Input as HeroInput,
  Select as HeroSelect,
  Textarea as HeroTextarea,
  extendVariants,
} from "@heroui/react";

export const Input = extendVariants(HeroInput, {
  defaultVariants: {
    variant: "bordered",
  },
});

export const Select = extendVariants(HeroSelect, {
  defaultVariants: {
    variant: "bordered",
  },
});

export const Textarea = extendVariants(HeroTextarea, {
  defaultVariants: {
    variant: "bordered",
  },
});
