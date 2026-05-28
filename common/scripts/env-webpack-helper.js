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

/**
 * Creates environment variables object for webpack DefinePlugin with fallback logic:
 * 1. Check .env file first for variable values
 * 2. If .env declares a variable but has no value, fallback to process.env
 * 3. Only define variables that are explicitly declared in .env file
 * 
 * @param {Object} env - Parsed environment variables from .env file (from dotenv.config().parsed)
 * @returns {Object} Object containing envKeys for webpack.DefinePlugin and missingVars array
 */
function createEnvDefinePlugin(env) {
  
    const envKeys = Object.create(null);
    const missingVars = [];
  
    if (env) {
      Object.entries(env).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          envKeys[`process.env.${key}`] = JSON.stringify(value);
        }
        else if (process.env[key] !== undefined && process.env[key] !== '') {
          envKeys[`process.env.${key}`] = JSON.stringify(process.env[key]);
        }
        else {
          missingVars.push(key);
        }
      });
    }
  
    return { envKeys, missingVars };
  }
  
  module.exports = {
    createEnvDefinePlugin
  }; 
  