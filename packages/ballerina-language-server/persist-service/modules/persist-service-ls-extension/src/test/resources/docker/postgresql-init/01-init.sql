-- PostgreSQL test database initialization
-- Database 'testdb' is already created by POSTGRES_DB environment variable
-- Drop existing tables to ensure clean state
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Create employees table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    salary DECIMAL(10, 2),
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(100),
    budget DECIMAL(12, 2)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(200) NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50),
    department_id INT,
    FOREIGN KEY (department_id) REFERENCES departments(dept_id)
);

-- Insert sample data
INSERT INTO departments (dept_name, location, budget) VALUES
('Engineering', 'New York', 500000.00),
('Marketing', 'Los Angeles', 250000.00),
('Sales', 'Chicago', 300000.00);

INSERT INTO employees (first_name, last_name, email, department, salary, hire_date) VALUES
('John', 'Doe', 'john.doe@example.com', 'Engineering', 75000.00, '2020-01-15'),
('Jane', 'Smith', 'jane.smith@example.com', 'Marketing', 65000.00, '2021-03-20'),
('Bob', 'Johnson', 'bob.johnson@example.com', 'Sales', 70000.00, '2019-11-10');

INSERT INTO projects (project_name, start_date, end_date, status, department_id) VALUES
('Project Alpha', '2024-01-01', '2024-12-31', 'In Progress', 1),
('Project Beta', '2024-06-01', '2025-06-30', 'Planning', 2);
