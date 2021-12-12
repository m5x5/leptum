import { PrismaClient } from ".prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const client = new PrismaClient();

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { cron, status, lastEndTime, name } = req.body;
    const [valid, error] = validateJob(req.body);
    console.log({ valid, error });
    if (!valid) {
      res.status(400).json({ error });
      return;
    }

    const index = await getHighestIndex();
    const job = await client.job.create({
      data: {
        cron,
        status,
        index,
        lastEndTime,
        name,
      },
    });
    res.status(201).json(job);
  }
  if (req.method === "GET") {
    const jobs = await client.job.findMany({
      include: {
        habits: true,
      },
    });
    res.status(200).json(jobs);
  }
}

const getHighestIndex = async () => {
  const j = await client.job.findFirst({
    orderBy: { index: "desc" },
  });

  const index = j ? j.index + 1 : 1;
  console.log("Highest index:", index);

  return index;
};

const validateJob = (job: any): [boolean, string?] => {
  const { cron, status, lastEndTime, name } = job;
  if (!["pending", "scheduled", "due"].includes(status)) {
    return [false, "status must be pending or scheduled"];
  }

  if (typeof name !== "undefined" && typeof lastEndTime !== "number") {
    return [false, "lastEndTime must be a number"];
  }

  if (typeof name !== "undefined" && typeof name !== "string") {
    return [false, "name must be a string"];
  }

  if (typeof cron !== "string") {
    return [false, "cron must be a string"];
  }

  return [true];
};
