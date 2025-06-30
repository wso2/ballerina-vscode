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

export const tooltipBaseStyles = {
  tooltip: {
      color: "#8d91a3",
      backgroundColor: "#fdfdfd",
      border: "1px solid #e6e7ec",
      borderRadius: 6,
      padding: "1rem"
  },
  arrow: {
      color: "#fdfdfd"
  }
};

export const useStyles = () => ({
  element: css({
    backgroundColor: "var(--vscode-input-background)",
    padding: "10px",
    cursor: "pointer",
    transitionDuration: "0.2s",
    userSelect: "none",
    pointerEvents: "auto",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    "&:hover": {
      filter: "brightness(0.95)",
    }
  }),
  lightBulbWrapper: css({
    height: "22px",
    width: "22px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  }),
  iconButton: css({
    padding: "10px 14px",
  }),
  menu: css({
    '& .MuiMenuItem-root': {
      fontSize: '11px',
      paddingBottom: "1px",
      paddingTop: "1px"
    }
  }),
  pre: css({
    margin: 0,
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    backgroundColor: "white"
  })
});
