/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { DMModel, EnumType, IOTypeField, Mapping, RecordType } from "@wso2/ballerina-core";

/**
 * DMModel optimization functions for processing and optimizing data mapper models
 */

export function ensureUnionRefs(model: DMModel): DMModel {
  const processedModel = JSON.parse(JSON.stringify(model));
  const unionRefs = new Map<string, any>();

  interface FieldVisitor {
    visitUnion(field: IOTypeField): void;
    visitRecord(field: IOTypeField): void;
    visitArray(field: IOTypeField): void;
    visitField(field: IOTypeField): void;
  }

  class UnionRefCollector implements FieldVisitor {
    visitUnion(field: IOTypeField): void {
      if (field.ref) {
        const refId = field.ref;

        if (!processedModel.refs[refId] && !unionRefs.has(refId)) {
          unionRefs.set(refId, {
            members: field.members || [],
            typeName: field.typeName,
            kind: 'union'
          });
        }

        field.members = [];
      }
    }

    visitRecord(field: IOTypeField): void {
      if (field.fields) {
        this.visitFields(field.fields);
      }
    }

    visitArray(field: IOTypeField): void {
      if (field.member) {
        this.visitField(field.member);
      }
    }

    visitField(field: IOTypeField): void {
      if (!field) { return; }

      switch (field.kind) {
        case 'union':
          this.visitUnion(field);
          break;
        case 'record':
          this.visitRecord(field);
          break;
        case 'array':
          this.visitArray(field);
          break;
      }

      if (field.members && Array.isArray(field.members)) {
        field.members.forEach(member => this.visitField(member));
      }

      if (field.member && field.kind !== 'array') {
        this.visitField(field.member);
      }
    }

    visitFields(fields: IOTypeField[]): void {
      if (!fields || !Array.isArray(fields)) { return; }

      for (const field of fields) {
        this.visitField(field);
      }
    }
  }

  class UnionMemberClearer implements FieldVisitor {
    visitUnion(field: IOTypeField): void {
      if (field.ref && field.members) {
        field.members = [];
      }
    }

    visitRecord(field: IOTypeField): void {
      if (field.fields) {
        this.visitFields(field.fields);
      }
    }

    visitArray(field: IOTypeField): void {
      if (field.member) {
        this.visitField(field.member);
      }
    }

    visitField(field: IOTypeField): void {
      if (!field || typeof field !== 'object') { return; }

      if (Array.isArray(field)) {
        field.forEach(item => this.visitField(item));
        return;
      }

      switch (field.kind) {
        case 'union':
          this.visitUnion(field);
          break;
        case 'record':
          this.visitRecord(field);
          break;
        case 'array':
          this.visitArray(field);
          break;
      }

      for (const key of Object.keys(field)) {
        if (typeof field[key] === 'object') {
          this.visitField(field[key]);
        }
      }
    }

    visitFields(fields: IOTypeField[]): void {
      if (!fields || !Array.isArray(fields)) { return; }

      for (const field of fields) {
        this.visitField(field);
      }
    }
  }

  const collector = new UnionRefCollector();

  if (processedModel.inputs) {
    collector.visitFields(processedModel.inputs);
  }

  if (processedModel.output) {
    if (processedModel.output.fields) {
      collector.visitFields(processedModel.output.fields);
    } else {
      collector.visitField(processedModel.output);
    }
  }

  if (processedModel.subMappings) {
    collector.visitFields(processedModel.subMappings);
  }

  if (processedModel.refs) {
    for (const refKey of Object.keys(processedModel.refs)) {
      const refObj = processedModel.refs[refKey];
      if (refObj.fields) {
        collector.visitFields(refObj.fields);
      } else if (refObj.members) {
        refObj.members.forEach((member: IOTypeField) => collector.visitField(member));
      }
    }
  }

  unionRefs.forEach((unionRef, refId) => {
    if (!processedModel.refs[refId]) {
      processedModel.refs[refId] = unionRef;
    }
  });

  const clearer = new UnionMemberClearer();

  clearer.visitField(processedModel.inputs);
  clearer.visitField(processedModel.output);
  if (processedModel.subMappings) {
    clearer.visitField(processedModel.subMappings);
  }

  if (processedModel.refs) {
    for (const refKey of Object.keys(processedModel.refs)) {
      const refObj = processedModel.refs[refKey];
      if (refObj.kind === 'record' && refObj.fields) {
        clearer.visitField(refObj.fields);
      }
    }
  }

  return processedModel;
}

export function normalizeRefs(model: DMModel): DMModel {
  const processedModel: DMModel = JSON.parse(JSON.stringify(model));

  function removeRef(field: IOTypeField) {
    if (!field || typeof field !== 'object') { return; }

    delete field.ref;

    if (field.member) { removeRef(field.member); }
    if (Array.isArray(field.members)) { field.members.forEach(removeRef); }
    if ((field as IOTypeField).fields && Array.isArray((field as IOTypeField).fields)) {
      (field as IOTypeField).fields.forEach(removeRef);
    }
  }

  if (processedModel.inputs) { processedModel.inputs.forEach(removeRef); }

  if (processedModel.output) { removeRef(processedModel.output); }

  if (processedModel.subMappings) {
    processedModel.subMappings.forEach((sub) => removeRef(sub as IOTypeField));
  }

  const newRefs: Record<string, RecordType | EnumType> = {};
  if (processedModel.refs) {
    for (const refObj of Object.values(processedModel.refs)) {
      const typeName = (refObj as RecordType).typeName;
      if (typeName) {
        if ((refObj as RecordType).fields) {
          (refObj as RecordType).fields.forEach(removeRef);
        }
        newRefs[typeName] = refObj as RecordType | EnumType;
      }
    }
  }

  processedModel.refs = newRefs;

  return processedModel;
}

export function omitDefaultMappings(model: DMModel, enabled: boolean = true): DMModel {
  if (!enabled || !model.mappings || !Array.isArray(model.mappings)) {
    return model;
  }

  const processedModel: DMModel = JSON.parse(JSON.stringify(model));

  processedModel.mappings = processedModel.mappings.filter((mapping: Mapping) => {
    if (!mapping.inputs || !Array.isArray(mapping.inputs)) {
      return true;
    }
    return mapping.inputs.length > 0;
  });

  return processedModel;
}
