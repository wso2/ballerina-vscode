#!/bin/bash
# MSSQL initialization script
# This script starts SQL Server and initializes the test database

set -e

echo "Starting SQL Server..."
# Start SQL Server in the background
/opt/mssql/bin/sqlservr &

# Wait for SQL Server to be ready
echo "Waiting for SQL Server to start..."
for i in {1..60}; do
    if /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "${SA_PASSWORD}" -Q "SELECT 1" &> /dev/null; then
        echo "SQL Server is ready!"
        break
    fi
    echo "Waiting for SQL Server... ($i/60)"
    sleep 2
done

# Run initialization script
echo "Running database initialization script..."
if /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "${SA_PASSWORD}" -i /scripts/01-init.sql; then
    echo "Database initialized successfully!"
    # Create a marker file to indicate initialization is complete
    touch /tmp/db-initialized
else
    echo "Failed to initialize database!"
    exit 1
fi

# Keep container running
echo "SQL Server is ready for connections"
wait
