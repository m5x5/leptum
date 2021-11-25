import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const goalTypes = await prisma.goal_types.findMany();
  console.log({ goalTypes });
  res.json(goalTypes);
}
