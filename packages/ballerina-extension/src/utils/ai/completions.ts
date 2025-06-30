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

import { extension } from "../../BalExtensionContext";
import { examplesContent } from "./example-consts";
import { CompletionChunk, CompletionRequest, CompletionResponse, GithubCompletionRequest } from "./types";
import { refreshGithubCopilotToken } from "./auth";

const copilotPrefix = `// Path: eggplant/main.bal
// Compare this snippet from examples/example.bal:
${getCommentedExamples()}`;

const copilotBaseUrl: string = 'https://proxy.individual.githubcopilot.com/v1';

export async function getCompleteSuggestions(request: CompletionRequest): Promise<CompletionResponse> {
  let prefix = request.prefix;
  const trailingSpaces = getTrailingSpaces(prefix);
  const spaces = ' '.repeat(trailingSpaces);

  const copilotResponse = await getCopilotResponse(prefix, request.suffix, 0);
  let stringResult = copilotResponse.completion;
  if (stringResult === '') {
    return { completion : '' };
  }

  if (stringResult.endsWith("\n")) {
    stringResult = stringResult + spaces;
  }

  return { completion: stringResult };
}

async function getCopilotResponse(prefix: string, suffix: string, retryCount: number): Promise<CompletionResponse> {
  const nextIndent = getTrailingSpaces(prefix);

  const req: GithubCompletionRequest = {
    prompt: copilotPrefix + prefix,
    suffix,
    n: 1,
    max_tokens: 500,
    temperature: 0,
    top_p: 1,
    stop: ['\n\n\n', '\n```'],
    nwo: 'github/copilot.vim',
    stream: true,
    extra: { language: 'ballerina', next_indent: nextIndent, trim_by_indentation: true }
  };

  try {
    const accessToken = await extension.context.secrets.get('GITHUB_COPILOT_TOKEN');
    const response = await fetch(`${copilotBaseUrl}/engines/gpt-4o-copilot/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(req)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let output = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      let buffer = "";
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary + 2);
        buffer = buffer.slice(boundary + 2);
        try {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.includes('[DONE]')) { break; }
            try {
              const parsed = JSON.parse(data) as CompletionChunk;
              if (parsed.choices[0].text) {
                output += parsed.choices[0].text;
              }
            } catch (error) {
              console.log(line);
              console.error('Error parsing SSE data:', error);
            }
          }
        } catch (error) {
          console.error("Failed to parse SSE event:", error);
        }

        boundary = buffer.indexOf("\n\n");
      }
    }
    return { completion: output };
  } catch (error: any) {
    if (error.message.includes('401')) {
      if (retryCount === 1) {
        console.error('Access token regeneration failed');
        throw new Error('Access token regeneration failed');
      }
      await refreshGithubCopilotToken();
      console.info('Retrying with new access token');
      return getCopilotResponse(prefix, suffix, retryCount + 1);
    }
    console.error('Failed to get response from Copilot:', error);
    throw error;
  }
}

function getCommentedExamples(): string {
  const fileContent = examplesContent;
  return fileContent.split('\n').map(line => `// ${line}`).join('\n');
}


function getTrailingSpaces(input: string): number {
  const lines = input.split('\n');
  const lastLine = lines[lines.length - 1];
  return lastLine.length - lastLine.trimRight().length;
}


function trimRight(str: string): string {
  return str.replace(/\s+$/, '');
}
