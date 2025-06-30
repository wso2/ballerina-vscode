// tslint:disable: jsx-no-lambda jsx-no-multiline-js
import * as React from "react";

import { DefaultLinkWidget as ReactDiagramDefaultLinkWidget } from "@projectstorm/react-diagrams";

import { DefaultLinkSegmentWidget } from "./DefaultLinkSegmentWidget";

export class DefaultLinkWidget extends ReactDiagramDefaultLinkWidget {
    generateLink(
        path: string,
        extraProps: React.Attributes,
        id: string | number
    ): JSX.Element {
        const ref = React.createRef<SVGPathElement>();
        this.refPaths.push(ref);
        return (
            <DefaultLinkSegmentWidget
                key={`link-${id}`}
                path={path}
                selected={this.state.selected}
                diagramEngine={this.props.diagramEngine}
                factory={this.props.diagramEngine.getFactoryForLink(
                    this.props.link
                )}
                link={this.props.link}
                forwardRef={ref}
                onSelection={(selected) => {
                    this.setState({ selected });
                }}
                extras={extraProps}
            />
        );
    }
}
