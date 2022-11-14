# Ballerina Project Design View

With the increasing size and complexity of software applications, it is likely that your product is a composition of multiple inter-related components. When the number and/or depth of such components grow, the need to create a simple picture of its interactions becomes important. The Ballerina project design view is deployed with this intention of providing a convenient way to generate the high-level picture of such applications, purely based on the source code. And, in addition to the component interactions, the project design view is also capable of visualizing the Ballerina record types in your application and their associations.

## Prerequisites
1. Ballerina version [2201.2.2](https://ballerina.io/downloads/) or upwards
2. Ballerina VSCode plugin version [3.3.0](https://marketplace.visualstudio.com/items?itemName=WSO2.ballerina) or upwards

The Ballerina Project Design View tool is packed with the latest release of the Ballerina VS Code plugin available in the VS Code marketplace. The diagrams can be generated upon executing the `Ballerina: Project Design View` extension command. However, to get the best possible view of your project, it is necessary to setup your Ballerina project with the following concepts in mind.

## Related Concepts

### 1. A Ballerina Project

In the context of this tool, a Ballerina project is considered to be a collection of one or more Ballerina packages.

### 2. The Project Workspace

In the context of this tool, a Ballerina project is contained by a [VSCode workspace](https://code.visualstudio.com/docs/editor/workspaces). Hence, the diagram generator is functional only if the Ballerina packages are added to the IDE as a workspace.
> **Tip:** You can save your VSCode workspace as a file and simply use this file to access your workspace thereafter. The diagrams could be refreshed to reflect any changes you make to this workspace.

### 3. Service Identifiers

Since multiple services can have the same path, this tool depends on an additional annotation to uniquely identify the services within your project. The current approach to do so is via the `display annotation`: a general purpose annotation that can be used in Ballerina code.

By providing an unique value to the id field of the display annotation, you can assign an identifier to each service. For reference, the *CurrencyService* in the following code snippet has been annotated with an id of value *“currency”*, and this identifier will be used to differentiate the service throughout the project.

```ballerina
@display {
   label: "CurrencyService",
   id: "currency"
}
@grpc:ServiceDescriptor {descriptor: ROOT_DESCRIPTOR, descMap: getDescriptorMapDemo()}
service "CurrencyService" on ep {final map<decimal> & readonly currencyMap;
   function init() returns error? {
       json currencyJson = check io:fileReadJson(currencyJsonPath);
       self.currencyMap = check parseCurrencyJson(currencyJson).cloneReadOnly();
   }
 
   remote function GetSupportedCurrencies(Empty value) returns GetSupportedCurrenciesResponse|error {
       return {currency_codes: self.currencyMap.keys()};
   }
}
```

If other services interact with this service, this same identifier has to be provided upon creating the client endpoint. By doing so, it makes it possible to uniquely identify and link the service interactions between one another. 

For example, refer to the following code snippet that calls on the *Currency Service* from a different component.

```ballerina
isolated function getSupportedCurrencies() returns string[]|error {
   @display {
       label: "CurrencyService",
   	id: "currency"
   }
   final CurrencyServiceClient currencyClient = check new ("http://localhost:9093");
   GetSupportedCurrenciesResponse|grpc:Error supportedCurrencies = currencyClient->GetSupportedCurrencies({});
   if supportedCurrencies is grpc:Error {
       log:printError("failed to call getSupportedCurrencies from currency service");
       return supportedCurrencies;
   }
   return supportedCurrencies.currency_codes;
}
```

### 4. Invoking service resources

The resource invocations between services need to be done using [client access actions](https://ballerina.io/downloads/swan-lake-release-notes/swan-lake-2201.2.0#support-for-resource-methods-in-client-objects).

## Explore the Project Design View Features
As mentioned previously, the Ballerina design diagrams can be generated through `Ballerina: Project Design View` extension command. This will lead you to a separate webview panel that will contain three types of design diagrams.

### 1. Service Diagram - Level 1

The level 1 diagram is your starting point with the design diagram tool. This diagram displays all the available services within your project, with directed links representing any interactions between them. The following is a level 1 diagram generated for a sample Ballerina project. 

   ![L1 Service Diagram](images/service-l1.png)
   > This project has 4 HTTP services that interact with one another. The directed link between the *Flights* service and the *Bookings* service is an indication that a component in the Flights service invokes the *Booking* service. In addition to this, the *Flights* service also invokes an **external** service via a connector.

### 2. Service Diagram - Level 2

The level 2 diagram delves deeper into the compositions of the services and the interactions between them. The following diagram is the level 2 representation of the same project sample referred to above. This diagram has further delved into the individual resource/remote functions of the services and their invocations.

   ![L2 Service Diagram](images/service-l2.png)

The data types of the request and response bodies of for the interactions can be viewed when hovering over a particular invocation.
   ![L2 Service Data Types Hover](images/invocation-data-types.png)

### 3. Types Diagram

The types diagram provides a comprehensive view of all the Ballerina record types defined in your project and their associations.

   ![Types Diagram](images/types-diagram.png)

   > The multiplicities of the associations are represented on either side of the connector, while the [type inclusions](https://ballerina.io/learn/by-example/type-inclusion-for-records/) are differentiated using a directed link (represents inheritance).


In addition to the above diagrams, you can also view the **composition** of an individual record type. These type compositions can be accessed through:
   1. Clicking on the record types that are included in the request/response bodies of service invocations shown in the level 2 service diagram
   2. Clicking on the record head of the records displayed in the types diagram

The following is the composition diagram generated for the *PassengerFare* record type seen in the above types diagram.
   
   ![Types Composition Diagram](images/types-composition.png)


### Accessory Features

In addition to the above, the Ballerina project design diagram tool also includes the following features.
   1. Export the diagrams in JPEG format
   2. Filter the services and types based on the packages
   3. Rearrange the diagram as you see fit
