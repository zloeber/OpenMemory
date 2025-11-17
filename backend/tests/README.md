# Repository Pattern Testing

This directory contains tests for the OpenMemory vector repository implementations.

## Test Structure

- `QdrantVectorRepository.test.ts` - Unit tests for Qdrant backend
- `SQLiteVectorRepository.test.ts` - Unit tests for SQLite backend
- `VectorRepositoryFactory.test.ts` - Factory pattern tests
- `integration/` - End-to-end integration tests

## Running Tests

### Prerequisites

1. Install test dependencies:
```bash
cd backend
npm install --save-dev jest @types/jest ts-jest
```

2. For Qdrant tests, start Qdrant server:
```bash
docker run -p 6333:6333 qdrant/qdrant:v1.7.4
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test QdrantVectorRepository.test.ts

# Run with coverage
npm test -- --coverage
```

## Test Configuration

Tests use Jest with TypeScript support. Configuration in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
```

## Manual Testing

You can also manually test the repositories using the integration example:

```bash
tsx src/repositories/integration-example.ts
```

## Test Coverage Goals

- Line coverage: >85%
- Branch coverage: >85%
- Function coverage: >85%

## CI/CD Integration

Tests are automatically run in GitHub Actions on:
- Pull requests
- Commits to main branch
- Release builds

See `.github/workflows/test.yml` for CI configuration.
