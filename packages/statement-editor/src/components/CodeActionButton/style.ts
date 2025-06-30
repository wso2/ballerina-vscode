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
import { css } from "@emotion/css";

export const useStyles = () => ({
  container: css({
    userSelect: "none",
    pointerEvents: "auto",
    marginRight: '6px'
  }),
  itemContainer: css({
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    color: 'var(--vscode-inputOption-activeForeground)'
  })
});
