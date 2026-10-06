import {
  UserRole,
} from '../generated/prisma/enums';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  phoneVerifiedAt: Date | null;
  sessionId: string;
}