// Mock mssql globally to avoid connection issues in tests
jest.mock('mssql', () => {
  const mockRequest = {
    input: jest.fn().mockReturnThis(),
    query: jest.fn().mockResolvedValue({ recordset: [], rowsAffected: [0] }),
  };

  const mockPool = {
    request: jest.fn(() => ({ ...mockRequest })),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const MockConnectionPool = jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(mockPool),
  }));

  return {
    ConnectionPool: MockConnectionPool,
  };
});
