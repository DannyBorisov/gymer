import type { UserToken } from "@prisma/client";
import { prismaClient } from "./client.js";

export class UserTokenModel {
  get(userEmail: string): Promise<UserToken | null> {
    return prismaClient.userToken.findUnique({ where: { userEmail } });
  }

  upsert(userEmail: string, encryptedTokens: string): Promise<UserToken> {
    return prismaClient.userToken.upsert({
      where: { userEmail },
      create: { userEmail, encryptedTokens },
      update: { encryptedTokens },
    });
  }

  delete(userEmail: string): Promise<UserToken> {
    return prismaClient.userToken.delete({ where: { userEmail } });
  }
}
