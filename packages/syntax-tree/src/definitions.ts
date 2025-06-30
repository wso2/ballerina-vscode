import { ModulePart } from './syntax-tree-interfaces';

export interface ConstructIdentifier {
  sourceRoot?: string;
  filePath?: string;
  constructName: string;
  moduleName: string;
  subConstructName?: string;
}

export interface ProjectAST {
  [moduleName: string]: {
    name: string;
    moduleParts: {
      [modulePartName: string]: {
        name: string;
        st: ModulePart;
        uri: string;
      };
    };
  };
}
