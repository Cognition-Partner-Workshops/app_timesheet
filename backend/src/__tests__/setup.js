// Mock pg globally to avoid native module loading issues in tests
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: jest.fn().mockResolvedValue(undefined)
  };

  return {
    Pool: jest.fn(() => mockPool)
  };
});
