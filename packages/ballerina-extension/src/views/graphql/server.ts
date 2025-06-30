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

import axios, { Method } from "axios";

interface Request {
  url: string;
  headers: string;
  method: Method;
  body?: string;
}
interface Response {
  status: number;
  statusText: string;
  data?: string;
  text?: string;
  body?: string;
  obj?: string;
  headers?: Record<string, string>;
}

const CONNECTION_REFUSED = 'ECONNREFUSED';
const EAI_AGAIN = 'EAI_AGAIN';
export class SwaggerServer {

  async sendRequest(data: Request, isOriginalResponse: boolean): Promise<Response | boolean> {
    const headers = data.headers as unknown as Record<string, string>;
    return new Promise<Response | boolean>((resolve, reject) => {
      axios({
        method: data.method,
        headers,
        url: data.url,
        data: data.body
      })
        .then(function (response) {
          const responseData = response.data;
          const res: Response = {
            status: response.status,
            statusText: response.statusText,
            data: responseData,
            body: JSON.stringify(responseData),
            text: JSON.stringify(responseData),
            obj: responseData,
            headers: response.headers as Record<string, string>
          };
          resolve(isOriginalResponse ? responseData : res);
        })
        .catch((error) => {
          let res: Response;
          if (error.response) {
            const responseData = error.response.data;
            // Request made and server responded
            res = {
              status: error.response.status,
              statusText: error.response.statusText,
              data: responseData,
              body: JSON.stringify(responseData),
              text: JSON.stringify(responseData),
              obj: responseData,
              headers: error.response.headers
            };
            resolve(res);
          } else {
            const errorCode = error.code;
            // Something happened in setting up the request that triggered an Error
            if (errorCode === CONNECTION_REFUSED || errorCode === EAI_AGAIN) {
              resolve(isOriginalResponse ? errorCode : false);
            }
            resolve(false);
          }
        });
    });
  }
}
