import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
const defaultGoals = [
  {
    name: "Short Term",
    habits: [
      {
        name: "Eat",
      },
      {
        name: "Do Homework",
      },
      {
        name: "Prepare for class test",
      },
      {
        name: "Improve Leptum",
      },
    ],
  },
  {
    name: "Long Term",
    habits: [
      {
        name: "Write faster",
      },
      {
        name: "Read faster",
      },
    ],
  },
];

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const goals = await prisma.goals.findMany();
  console.log({ goals });
  res.json(goals || defaultGoals);
}
