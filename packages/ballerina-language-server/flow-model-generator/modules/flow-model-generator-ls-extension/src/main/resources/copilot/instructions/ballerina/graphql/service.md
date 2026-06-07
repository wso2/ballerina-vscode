# Service writing instructions

- GraphQL Service always requires a graphql listener to be attatched to it.
- Service requires base path to be set. Specify /graphql if not specified explictily by the user query.
- Figure out are the Query and Mutation operations required based on the user query.
- Input fields are represented by function parameters. Only use records and basic types as types for input parameters.

## Query
- Represented by resource functions.

## Mutation
- Represented by remote functions.
