declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      subscriptionStatus: string;
    }
    
    interface Request {
      user?: User;
      tenantId?: string;
      playerId?: string;
    }
  }
}

export {};
