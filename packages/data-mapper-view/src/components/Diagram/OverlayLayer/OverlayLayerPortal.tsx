import * as React from 'react';
import ReactDOM from 'react-dom';

import { OverlayContainerID } from './OverlayLayerWidget';

export const OverlayLayerPortal: React.FC<React.PropsWithChildren<{}>> = (props) => {
    const container = document.getElementById(OverlayContainerID);
	   return container !== null ? ReactDOM.createPortal(props.children, container) : <></>;
}
