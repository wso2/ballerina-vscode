/*
 * Copyright (c) 2023, WSO2 Inc. (http://wso2.com) All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package org.ballerinalang.langserver.command.executors;

import com.google.gson.JsonPrimitive;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.ExecuteCommandContext;
import org.ballerinalang.langserver.commons.command.CommandArgument;
import org.ballerinalang.langserver.commons.command.spi.LSCommandExecutor;

import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.Optional;

import static org.ballerinalang.langserver.command.executors.RunExecutor.ARG_PATH;

/**
 * Command executor for stopping a Ballerina project.
 * See {@link RunExecutor} for running a Ballerina project.
 *
 * @since 1.0.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.command.spi.LSCommandExecutor")
public class StopExecutor implements LSCommandExecutor {

    @Override
    public Boolean execute(ExecuteCommandContext context) {
        return context.workspace().stop(extractPath(context));
    }

    private Path extractPath(ExecuteCommandContext context) {
        return getCommandArgWithName(context, ARG_PATH)
                .map(CommandArgument::<JsonPrimitive>value)
                .map(JsonPrimitive::getAsString)
                .map(pathStr -> {
                    try {
                        Path path = Path.of(pathStr);
                        if (!Files.exists(path)) {
                            throw new IllegalArgumentException("Specified path does not exist: " + pathStr);
                        }
                        return path;
                    } catch (InvalidPathException e) {
                        throw new IllegalArgumentException("Invalid path: " + pathStr, e);
                    }
                })
                .orElseThrow(() -> new IllegalArgumentException("Path argument is required"));
    }

    private static Optional<CommandArgument> getCommandArgWithName(ExecuteCommandContext context, String name) {
        return context.getArguments().stream()
                .filter(commandArg -> commandArg.key().equals(name))
                .findAny();
    }

    @Override
    public String getCommand() {
        return "STOP";
    }
}
