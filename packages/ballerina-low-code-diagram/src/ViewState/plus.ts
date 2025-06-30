import { BallerinaConnectorInfo } from "@wso2/ballerina-core";
import { LocalVarDecl, NodePosition } from "@wso2/syntax-tree";

import { ViewState } from "./view-state";

export class PlusViewState extends ViewState {
    public visible: boolean = true;
    public collapsedPlusDuoExpanded: boolean = false;
    public expanded: boolean = false;
    public collapsedClicked: boolean = false;
    public index: number;
    public initialPlus: boolean = false;
    public draftAdded: string = undefined;
    public draftSubType: string = undefined;
    public draftConnector?: BallerinaConnectorInfo;
    public draftForExistingConnector?: boolean = false;
    public draftSelectedConnector?: LocalVarDecl = undefined;
    public isLast: boolean = false;
    public selectedComponent: string;
    public isTriggerDropdown: boolean = false;
    public isAPICallsExisting: boolean = false;
    public isAPICallsExistingCollapsed: boolean = false;
    public isAPICallsExistingCreateCollapsed: boolean = false;
    public allowWorker: boolean = false;
    public selected: boolean = false;
    public targetPosition: NodePosition;
    constructor() {
        super();
    }
}
