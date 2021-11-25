import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prisma = new PrismaClient();
  const id = req.query.id as string;
  if (req.method === "GET") {
    const goal = await prisma.goals.findFirst({
      where: { id },
    });
    res.json(goal);
  } else if (req.method === "DELETE") {
    const deletedGoal = await prisma.goals.delete({
      where: { id },
    });
    res.json(deletedGoal);
  }
}
