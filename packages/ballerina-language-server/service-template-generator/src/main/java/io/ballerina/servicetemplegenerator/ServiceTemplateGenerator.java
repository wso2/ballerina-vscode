package io.ballerina.servicetemplegenerator;

import io.ballerina.centralconnector.CentralAPI;
import io.ballerina.centralconnector.RemoteCentral;
import io.ballerina.centralconnector.response.Function;
import io.ballerina.centralconnector.response.Listener;
import io.ballerina.centralconnector.response.Listeners;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class ServiceTemplateGenerator {
    public static void main(String[] args) {
        CentralAPI centralApi = RemoteCentral.getInstance();
//        Listeners listeners = centralApi.listeners("ballerina", "task", "2.11.0");
        Listeners listeners = centralApi.listeners("ballerina", "graphql", "1.16.1");
        for (Listener listener : listeners.listeners()) {
            Function initMethod = listener.initMethod();
            List<String> listenerArgs = new ArrayList<>();
            for (Function.Parameter parameter : initMethod.parameters()) {
                Function.Type type = parameter.type();
                Optional<String> s = generateArg(type);
                s.ifPresent(listenerArgs::add);
            }
        }
        System.out.println(listeners);
    }

    private static Optional<String> generateArg(Function.Type type) {
        if (type.isInclusion() || type.isRestParam()) {
            return Optional.empty();
        }
        if (!type.memberTypes().isEmpty()) {
            for (Function.Type memberType : type.memberTypes()) {
                Optional<String> s = generateArg(memberType);
                if (s.isPresent() && !s.get().isEmpty()) {
                    return s;
                }
                return Optional.of("\"\"");
            }
        }
        String name = type.name();
        return switch (name) {
            case "int" -> Optional.of("0");
            case "float" -> Optional.of("0.0");
            case "boolean" -> Optional.of("false");
            case "decimal" -> Optional.of("0.0d");
            default -> Optional.of("\"\"");
        };
    }
}
