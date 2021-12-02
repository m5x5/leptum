import Head from "next/head";
import GoalList from "../components/Goals/List";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";

export default function GoalsPage() {
  const { goals, isError } = useGoals();
  const { goalTypes, isError: isErrorGoalTypes } = useGoalTypes();

  const handleRemove = (index) => {};

  if (isError) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goals) return <div>loading...</div>;
  if (isErrorGoalTypes) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goalTypes) return <div>loading...</div>;

  return (
    <>
      <Head>
        <title>Goals - Leptum</title>
      </Head>
      <h1 className="text-2xl mb-5">Goals</h1>
      <div className="grid grid-cols-2 gap-4">
        {goalTypes.map((goalType) => (
          <GoalList
            name={goalType.name}
            stored={true}
            key={goalType.id}
            id={goalType.id}
            remove={handleRemove}
            items={goals.filter((goal) => goal.type === goalType.id)}
          />
        ))}
      </div>
    </>
  );
}
