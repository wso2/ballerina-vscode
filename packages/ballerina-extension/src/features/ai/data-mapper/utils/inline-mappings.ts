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

import { InlineMappingsSourceResult, MetadataWithAttachments } from "@wso2/ballerina-core";
import { ExtendedLangClient } from "../../../../core";
import { CopilotEventHandler } from "../../utils/events";
import { getAllDataMapperSource } from "../orchestrator";
import { createTempBallerinaDir } from "./temp-project";
import { createTempFileAndGenerateMetadata, generateMappings } from "./model";

/**
 * Inline mapping generation utilities
 */

export async function generateInlineMappingsSource(
  inlineMappingRequest: MetadataWithAttachments,
  langClient: ExtendedLangClient,
  context: any,
  eventHandler: CopilotEventHandler
): Promise<InlineMappingsSourceResult> {
  if (!inlineMappingRequest) {
    throw new Error("Inline mapping request is required");
  }

  if (!inlineMappingRequest.metadata) {
    throw new Error("Metadata is required for inline mapping generation");
  }

  if (!inlineMappingRequest.metadata.codeData) {
    throw new Error("Code data is required for inline mapping generation");
  }

  if (!langClient) {
    throw new Error("Language client is required for inline mapping generation");
  }

  const targetFileName = inlineMappingRequest.metadata.codeData.lineRange.fileName;

  if (!targetFileName) {
    throw new Error("Target file name could not be determined from code data");
  }

  const tempDirectory = await createTempBallerinaDir();
  const tempFileMetadata = await createTempFileAndGenerateMetadata(
    {
      tempDir: tempDirectory,
      filePath: targetFileName,
      metadata: inlineMappingRequest.metadata
    },
    langClient,
    context
  );

  // Prepare mapping request payload
  const mappingRequestPayload: MetadataWithAttachments = {
    metadata: tempFileMetadata,
    attachments: []
  };
  if (inlineMappingRequest.attachments.length > 0) {
    mappingRequestPayload.attachments = inlineMappingRequest.attachments;
  }

  // Generate mappings and source code
  const allMappingsRequest = await generateMappings(
    mappingRequestPayload,
    context,
    eventHandler
  );

  const generatedSourceResponse = await getAllDataMapperSource(allMappingsRequest);

  return {
    sourceResponse: generatedSourceResponse,
    allMappingsRequest,
    tempFileMetadata,
    tempDir: tempDirectory
  };
}
