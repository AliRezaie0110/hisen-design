import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',

  testMatch: [
    '<rootDir>/src/**/*.spec.ts'
  ],

  extensionsToTreatAsEsm: [
    '.ts'
  ],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.spec.json'
      }
    ]
  },

  transformIgnorePatterns: [],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  clearMocks: true
};

export default config;
