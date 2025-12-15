package io.ballerina.servicemodelgenerator.extension.builder.function;

import com.google.gson.Gson;
import com.google.gson.stream.JsonReader;
import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Value;
import io.ballerina.servicemodelgenerator.extension.model.context.AddModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.GetModelContext;
import io.ballerina.servicemodelgenerator.extension.model.context.UpdateModelContext;
import io.ballerina.servicemodelgenerator.extension.util.Utils;
import org.eclipse.lsp4j.TextEdit;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.RESOURCE;

public class FTPFunctionBuilder extends AbstractFunctionBuilder{

    private static String FTP_FUNCTION_MODEL_LOCATION = "functions/ftp_resource.json";

    @Override
    public Optional<Function> getModelTemplate(GetModelContext context) {
        return getFtpResourceModel();
    }

    private static Optional<Function> getFtpResourceModel() {
        InputStream resourceStream = Utils.class.getClassLoader()
                .getResourceAsStream(String.format(FTP_FUNCTION_MODEL_LOCATION, RESOURCE));
        if (resourceStream == null) {
            return Optional.empty();
        }

        try (JsonReader reader = new JsonReader(new InputStreamReader(resourceStream, StandardCharsets.UTF_8))) {
            return Optional.of(new Gson().fromJson(reader, Function.class));
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    @Override
    public Map<String, List<TextEdit>> updateModel(UpdateModelContext context) {
        Function function = context.function();

        // Only handle onFileCsv function
//        String functionName = function.getName() != null ? function.getName().getValue() : "";
//        if ("onFileCsv".equals(functionName)) {
//
//            // Check if stream property is enabled and set to true
//            Value streamProperty = function.getProperty("stream");
//            boolean isStreamEnabled = streamProperty != null &&
//                                     streamProperty.isEnabled();
//
//            // Update the REQUIRED parameter named "content"
//            if (function.getParameters() != null) {
//                for (Parameter parameter : function.getParameters()) {
//                    if (parameter.getName() != null &&
//                        "DATA_BINDING".equals(parameter.getKind())) {
//
//                        String currentType = parameter.getType().getValue();
//
//                        if (isStreamEnabled) {
//
//                            // Convert to stream format
//                            if (currentType.endsWith("[]")) {
//                                // Remove the trailing [] and wrap in stream<type, error>
//                                String baseType = currentType.substring(0, currentType.length() - 2);
//                                parameter.getType().setValue("stream<" + baseType + ", error>");
//                            } else if (!currentType.startsWith("stream<")) {
//                                // If it's a custom type without [], wrap in stream<type, error>
//                                parameter.getType().setValue("stream<" + currentType + ", error>");
//                            }
//                        } else {
//                            // Convert to array format
//                            if (currentType.startsWith("stream<") && currentType.endsWith(", error>")) {
//                                // Extract the type from stream<type, error> and add []
//                                String streamContent = currentType.substring(7, currentType.length() - 8);
//                                parameter.getType().setValue(streamContent + "[]");
//                            } else if (!currentType.endsWith("[]")) {
//                                // If it's a custom type without stream, add []
//                                parameter.getType().setValue(currentType + "[]");
//                            }
//                        }
//                        break;
//                    }
//                }
//            }
//        }

        // Call the parent implementation to handle the rest of the update logic
        return super.updateModel(context);
    }

    @Override
    public Map<String, List<TextEdit>> addModel(AddModelContext context) throws Exception {
//        Function function = context.function();
//
//        // Only handle onFileCsv function
//        String functionName = function.getName() != null ? function.getName().getValue() : "";
//        if ("onFileCsv".equals(functionName)) {
//
//            // Check if stream property is enabled and set to true
//            Value streamProperty = function.getProperty("stream");
//            boolean isStreamEnabled = streamProperty != null &&
//                    streamProperty.isEnabled();
//
//            // Update the REQUIRED parameter named "content"
//            if (function.getParameters() != null) {
//                for (Parameter parameter : function.getParameters()) {
//                    if (parameter.getName() != null &&
//                            "DATA_BINDING".equals(parameter.getKind())) {
//
//                        String currentType = parameter.getType().getValue();
//
//                        if (isStreamEnabled) {
//                            // Convert to stream format
//                            if (currentType.endsWith("[]")) {
//                                // Remove the trailing [] and wrap in stream<type, error>
//                                String baseType = currentType.substring(0, currentType.length() - 2);
//                                parameter.getType().setValue("stream<" + baseType + ", error>");
//                            } else if (!currentType.startsWith("stream<")) {
//                                // If it's a custom type without [], wrap in stream<type, error>
//                                parameter.getType().setValue("stream<" + currentType + ", error>");
//                            }
//                        } else {
//                            // Convert to array format
//                            if (currentType.startsWith("stream<") && currentType.endsWith(", error>")) {
//                                // Extract the type from stream<type, error> and add []
//                                String streamContent = currentType.substring(7, currentType.length() - 8);
//                                parameter.getType().setValue(streamContent + "[]");
//                            } else if (!currentType.endsWith("[]")) {
//                                // If it's a custom type without stream, add []
//                                parameter.getType().setValue(currentType + "[]");
//                            }
//                        }
//                        break;
//                    }
//                }
//            }
//        }
//
        return super.addModel(context);
    }
}
