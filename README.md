# Smart Data Connector

A flexible data integration platform that connects diverse data sources to modern applications through a unified API.

## Features

- Connect to multiple data sources (databases, APIs, files)
- Unified REST API for data access
- Real-time data synchronization
- Schema mapping and transformation

## Project Structure

```
smart-data-connector/
├── backend/          # Node.js/Express API server
├── frontend/         # React-based web interface
├── mock-server/      # Mock data sources for testing
└── demo-assets/      # Sample data and documentation
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd smart-data-connector

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

```bash
# Start backend server
cd backend
npm start

# Start frontend development server (in a new terminal)
cd frontend
npm start
```

## Development

### Backend

The backend is built with Node.js and Express, providing RESTful APIs for data connectivity.

### Frontend

The frontend is built with React, offering a user-friendly interface for managing data connections.

### Mock Server

A test server simulating various data sources for development and testing.

## License

MIT
