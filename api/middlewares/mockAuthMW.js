export const mockAuthMW = (req, res, next) => {
  req.user = {
    id: "mockUserId",
    name: "Mock User",
    email: "mockuser@example.com",
    tenantId: 2,
    branchId: 1,
    };
    next();
};

export default mockAuthMW;