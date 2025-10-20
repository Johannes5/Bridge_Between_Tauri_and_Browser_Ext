import { HTMLElementRefOf } from '@plasmicapp/react-web';
import * as React from 'react';
import {
    DefaultLabelButtonContainerProps,
    PlasmicLabelButtonContainer,
} from './plasmic/short_stop/PlasmicLabelButtonContainer';

export interface LabelButtonContainerProps extends DefaultLabelButtonContainerProps {
    buttonCallbackFn: () => void;
}

function LabelButtonContainer_(
    { buttonCallbackFn, ...props }: LabelButtonContainerProps,
    ref: HTMLElementRefOf<'div'>
) {
    return (
        <PlasmicLabelButtonContainer
            labelButton={{
                onClick: buttonCallbackFn,
            }}
            labelButtonContainer={{ ref }}
            {...props}
        />
    );
}

const LabelButtonContainer = React.forwardRef(LabelButtonContainer_);
export default LabelButtonContainer;
