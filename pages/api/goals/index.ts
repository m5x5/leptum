import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prisma = new PrismaClient();

  if (req.method === "GET") {
    const goals = await prisma.goals.findMany();
    res.json(goals);
  } else if (req.method === "POST") {
    const { goal: name, type } = req.body;
    const goal = await prisma.goals.create({
      data: {
        name,
        type,
      },
    });
    res.json(goal);
  }
}
