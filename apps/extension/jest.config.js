module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  globals: {
    chrome: {
      runtime: {
        getManifest: jest.fn(() => ({ version: '1.0.0' })),
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
        sendMessage: jest.fn(),
        onInstalled: {
          addListener: jest.fn(),
        },
        onStartup: {
          addListener: jest.fn(),
        },
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
          clear: jest.fn(),
          getBytesInUse: jest.fn(),
          QUOTA_BYTES: 102400,
        },
        local: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
          clear: jest.fn(),
          getBytesInUse: jest.fn(),
          QUOTA_BYTES: 5242880,
        },
        onChanged: {
          addListener: jest.fn(),
        },
      },
      tabs: {
        query: jest.fn(),
        get: jest.fn(),
        sendMessage: jest.fn(),
        onUpdated: {
          addListener: jest.fn(),
        },
      },
      action: {
        onClicked: {
          addListener: jest.fn(),
        },
      },
      contextMenus: {
        create: jest.fn(),
        removeAll: jest.fn(),
        onClicked: {
          addListener: jest.fn(),
        },
      },
    },
  },
}; 