/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import {
    injectable, injectAll
  } from 'tsyringe';

@injectable()
export class DataMapperDIContext {
    constructor(
        @injectAll('NodeFactory')
        public nodeFactories: any[],
        @injectAll('PortFactory')
        public portFactories: any[],
        @injectAll('LinkFactory')
        public linkFactories: any[],
        @injectAll('LabelFactory')
        public labelFactories: any[]
    ) {}
}
