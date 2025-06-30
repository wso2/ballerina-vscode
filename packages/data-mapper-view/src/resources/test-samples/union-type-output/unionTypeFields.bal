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
// Union type field, the type is resolved via the value expr
function tnfUnionField1(Vehicle car) returns Car => {
    vehicle: {
        model: car.category,
        year: car.year
    }
};

// Type casted union type field
function tnfUnionField2(Vehicle car) returns Car => {
    vehicle: <SUV>{
        model: car.category,
        year: car.model.engine.length()
    }
};

// Union type field which is missing the value
function tnfUnionField3(Vehicle car) returns Car => {
    vehicle:

};

// Normal field
function tnfUnionField4(Vehicle car) returns CarA => {
    vehicle: {
        model: car.category,
        year: car.year
    }

};

// Value assigned via link
function tnfUnionField5(Vehicle vehicle) returns NewVehicle => {
    model: <string>vehicle.category

};

// Union type consist with error
function tnfUnionField6(Vehicle car) returns CarB => {
    vehicle: {}
};

// Union type field containing arrays
function tnfUnionField7(Vehicle car) returns CarC => {
    vehicle: <HighEndCar[]>[
        {
            model: car.model
        },
        {
            model: {
                engine: car.category + car.model.engine
            }
        }
    ]

};

// Union type field within query expression
function tnfUnionField8(VehicleA car) returns CarArr => {
};

// Union type inside a union type field
function tnfUnionField9(Vehicle car) returns CarInner => {
    vehicle: <ModelA>{
        vehicleA: <HighEndCar>{
            model: car.model,
            year: car.year
        }
    }

};

// Union type field inside a root union type
function tnfUnionField10(Vehicle car) returns Car|CarA => {

};

// Array of union type field
function tnfUnionField11(Vehicle car) returns CarD => {
    vehicle: [
        <HighEndCar>{}
    ]

};
