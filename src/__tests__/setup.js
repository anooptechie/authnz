process.env.NODE_ENV = "test";
// Mock Redis
jest.mock("../db/redis", () => {
  const store = new Map();

  return {
    get: jest.fn((key) => Promise.resolve(store.get(key) || null)),
    set: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve("OK");
    }),
    del: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
    ping: jest.fn(() => Promise.resolve("PONG")),

    call: jest.fn(() => Promise.resolve(1)),
  };
});

// Mock Postgres
jest.mock("../db/postgres", () => ({
  query: jest.fn(),
}));