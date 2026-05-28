import * as React from "react";

import copy from "clipboard-copy";

interface ChildProps {
    copy: (content: any) => void;
}

interface Props {
    // TooltipProps?: Partial<TooltipProps>;
    children: (props: ChildProps) => React.ReactElement<any>;
    title: string,
    datatestid?: string
}

export function CopyToClipboard(props: Props) {
    // const classes = useStyles();
    const [showTooltip, setShowTooltip] = React.useState(false);

    const onCopy = (content: any) => {
        copy(content);
        setShowTooltip(true);
    };

    const handleOnTooltipClose = () => {
        setShowTooltip(false);
    };


    const child = props.children({ copy: onCopy }) as React.ReactElement<any>;
    return (
        // <Tooltip
        //     open={showTooltip}
        //     title={props.title}
        //     leaveDelay={1000}
        //     onClose={handleOnTooltipClose}
        //     data-testid={props.datatestid}
        //     {...props.TooltipProps || {}}
        //     tabIndex={-1}
        //     classes={{ popper: classes.tooltip }}
        // >
        <>
            {child}
        </>
        // </Tooltip>
    );
}
