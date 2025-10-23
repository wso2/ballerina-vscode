package io.ballerina.servicemodelgenerator.extension.util;

import io.ballerina.servicemodelgenerator.extension.model.Function;
import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Parameter;
import io.ballerina.servicemodelgenerator.extension.model.Value;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static io.ballerina.servicemodelgenerator.extension.model.ServiceInitModel.KEY_EXISTING_LISTENER;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_CHOICE;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_EXPRESSION;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_FORM;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_SINGLE_SELECT;
import static io.ballerina.servicemodelgenerator.extension.util.Constants.VALUE_TYPE_STRING;

public final class JmsUtil {

    private static final String EXISTING_LISTENER_CHOICE_DESCRIPTION = "Select from the existing %s listeners";
    private static final String CREATE_NEW_LISTENER_CHOICE_DESCRIPTION = "Create a new %s listener";
    private static final String CALLER_PARAM_DESCRIPTION = "IBM MQ caller object for message acknowledgment";
    public static final String CALLER_PARAM_NAME = "caller";

    private static Value buildUseExistingListenerChoice(Set<String> listeners, String moduleName) {
        Map<String, Value> existingListenerProps = new LinkedHashMap<>();
        List<String> items = listeners.stream().toList();
        List<Object> itemsAsObject = listeners.stream().map(item -> (Object) item).toList();
        Value existingListenerOptions = new Value.ValueBuilder()
                .metadata("Select Listener", String.format(EXISTING_LISTENER_CHOICE_DESCRIPTION, moduleName))
                .value(items.getFirst())
                .valueType(VALUE_TYPE_SINGLE_SELECT)
                .setItems(itemsAsObject)
                .enabled(true)
                .editable(true)
                .setAdvanced(false)
                .build();
        existingListenerProps.put(KEY_EXISTING_LISTENER, existingListenerOptions);

        return new Value.ValueBuilder()
                .metadata("Use Existing Listener", "Use Existing Listener")
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(false).
                editable(false)
                .setAdvanced(false)
                .setProperties(existingListenerProps)
                .build();
    }

    private static Value buildCreateNewListenerChoice(Map<String, Value> existingListenerProps, String moduleName) {
        return new Value.ValueBuilder()
                .metadata("Create New Listener", String.format(CREATE_NEW_LISTENER_CHOICE_DESCRIPTION, moduleName))
                .value("true")
                .valueType(VALUE_TYPE_FORM)
                .enabled(false)
                .editable(false)
                .setAdvanced(false)
                .setProperties(existingListenerProps)
                .build();
    }

    public static Value buildListenerChoice(Map<String, Value> existingListenerProps, Set<String> listeners,
                                            String moduleName) {
        Value choicesProperty = new Value.ValueBuilder()
                .metadata("Use Existing Listener", "Use Existing Listener or Create New Listener")
                .value(true)
                .valueType(VALUE_TYPE_CHOICE)
                .enabled(true)
                .editable(true)
                .setAdvanced(true)
                .build();

        choicesProperty.setChoices(List.of(buildUseExistingListenerChoice(listeners, moduleName),
                buildCreateNewListenerChoice(existingListenerProps, moduleName)));
        return choicesProperty;

    }

    public static void addCallerParameter(Function onMessageFunction, String callerTypeStr, String moduleName) {
        Value callerType = new Value.ValueBuilder()
                .value(callerTypeStr)
                .valueType(VALUE_TYPE_EXPRESSION)
                .enabled(true)
                .editable(false)
                .build();

        Value callerName = new Value.ValueBuilder()
                .value(CALLER_PARAM_NAME)
                .valueType(VALUE_TYPE_STRING)
                .enabled(true)
                .editable(false)
                .build();

        Parameter callerParameter = new Parameter.Builder()
                .metadata(new MetaData("Caller", CALLER_PARAM_DESCRIPTION))
                .kind("OPTIONAL")
                .type(callerType)
                .name(callerName)
                .enabled(true)
                .editable(false)
                .optional(true)
                .build();

        onMessageFunction.getParameters().add(1, callerParameter);
    }

}
