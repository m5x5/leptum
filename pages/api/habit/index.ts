import { PrismaClient } from ".prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { name, jobId, status, description } = req.body;
    const [valid, error] = validate({ name, jobId });
    if (!valid) {
      res.status(400).json({ error });
      return;
    }
    const index = await getHighestIndex();
    const habit = await prisma.habit.create({
      data: {
        name,
        jobId,
        index,
        status,
        description,
      },
    });
    console.log({ habit });
    res.status(200).json(habit);
  }
}

const validate = (job: any): [boolean, string?] => {
  const { name, jobId } = job;

  if (typeof name !== "string") {
    return [false, "name must be a string"];
  } else if (typeof jobId !== "string") {
    return [false, "jobId must be a string"];
  }

  return [true];
};

const getHighestIndex = async () => {
  const j = await prisma.habit.findFirst({
    orderBy: { index: "desc" },
  });

  const index = j ? j.index + 1 : 1;
  console.log("Highest index:", index);

  return index;
};
