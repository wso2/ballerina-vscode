Create an HTTP upload integration.

The scenario creates a project and integration, adds an HTTP service with a
POST `/upload` resource, configures the source to return JSON containing the
uploaded key, runs the integration, and verifies that posting bytes to
`/upload?name=probe.txt` returns a JSON body containing `uploads/probe.txt`.
