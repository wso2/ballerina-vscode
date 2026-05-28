-- MSSQL test database initialization
-- This script runs after SQL Server starts

-- Create database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'testdb')
BEGIN
    CREATE DATABASE testdb;
END
GO

USE testdb;
GO

-- Create departments table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[departments]') AND type in (N'U'))
BEGIN
    CREATE TABLE departments (
        dept_id INT IDENTITY(1,1) PRIMARY KEY,
        dept_name VARCHAR(100) NOT NULL,
        location VARCHAR(100),
        budget DECIMAL(12, 2),
        CONSTRAINT departments_dept_name_key UNIQUE (dept_name)
    );
END
GO

-- Create employees table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[employees]') AND type in (N'U'))
BEGIN
    CREATE TABLE employees (
        id INT IDENTITY(1,1) PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        salary DECIMAL(10, 2),
        hire_date DATE,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT employees_email_key UNIQUE (email)
    );
END
GO

-- Create projects table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[projects]') AND type in (N'U'))
BEGIN
    CREATE TABLE projects (
        project_id INT IDENTITY(1,1) PRIMARY KEY,
        project_name VARCHAR(200) NOT NULL,
        start_date DATE,
        end_date DATE,
        status VARCHAR(50),
        department_id INT,
        FOREIGN KEY (department_id) REFERENCES departments(dept_id)
    );
END
GO

-- Insert sample data
IF NOT EXISTS (SELECT * FROM departments)
BEGIN
    INSERT INTO departments (dept_name, location, budget) VALUES
    ('Engineering', 'New York', 500000.00),
    ('Marketing', 'Los Angeles', 250000.00),
    ('Sales', 'Chicago', 300000.00);
END
GO

IF NOT EXISTS (SELECT * FROM employees)
BEGIN
    INSERT INTO employees (first_name, last_name, email, department, salary, hire_date) VALUES
    ('John', 'Doe', 'john.doe@example.com', 'Engineering', 75000.00, '2020-01-15'),
    ('Jane', 'Smith', 'jane.smith@example.com', 'Marketing', 65000.00, '2021-03-20'),
    ('Bob', 'Johnson', 'bob.johnson@example.com', 'Sales', 70000.00, '2019-11-10');
END
GO

IF NOT EXISTS (SELECT * FROM projects)
BEGIN
    INSERT INTO projects (project_name, start_date, end_date, status, department_id) VALUES
    ('Project Alpha', '2024-01-01', '2024-12-31', 'In Progress', 1),
    ('Project Beta', '2024-06-01', '2025-06-30', 'Planning', 2);
END
GO
