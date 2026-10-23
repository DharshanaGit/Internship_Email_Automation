import { PrismaClient } from '@prisma/client';

let prismaInstance;

if (process.env.NODE_ENV === 'production') {
  prismaInstance = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prismaInstance = global.prisma;
}

export const prisma = prismaInstance;
export default prismaInstance;
