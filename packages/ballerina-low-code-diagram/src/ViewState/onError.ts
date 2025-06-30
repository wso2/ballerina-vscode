import { StatementViewState } from ".";
import { SimpleBBox } from "./simple-bbox";

export class OnErrorViewState extends StatementViewState {
    public isFirstInFunctionBody: boolean = false;
    public header: SimpleBBox = new SimpleBBox();
    public lifeLine: SimpleBBox = new SimpleBBox();
    public offsets: SimpleBBox = new SimpleBBox();
    constructor() {
        super();
    }
}
