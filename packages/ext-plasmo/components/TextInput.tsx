import { TextInputRef } from '@plasmicapp/react-web';
import * as React from 'react';



import {
  DefaultTextInputProps,
  PlasmicTextInput
} from "./plasmic/short_stop/PlasmicTextInput"


interface TextInputProps extends DefaultTextInputProps {
  transparentBorder?: boolean
  // Feel free to add any additional props that this component should receive
}
function TextInput_(
  { transparentBorder = true, ...props }: TextInputProps,
  ref: TextInputRef
) {
  const { plasmicProps } = PlasmicTextInput.useBehavior<TextInputProps>(
    props,
    ref
  )
  props.defaultValue = !!props?.value ? undefined : props?.defaultValue;
  return (
    <PlasmicTextInput
      {...plasmicProps}
      input={{
        style: {
          border: transparentBorder ? "0px solid transparent" : undefined,
          outline: "0px solid transparent",
          boxShadow: "none",
          backgroundColor: "transparent",
          background: "transparent"
        }
      }}
    />
  )
}

const TextInput = React.forwardRef(TextInput_)

export default Object.assign(TextInput, {
  __plumeType: "text-input"
})