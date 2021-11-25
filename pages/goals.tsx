import EditableList from "../components/EditableList";
import { useGoals } from "../utils/useGoals";

export default function GoalsPage() {
  const { goals, isError } = useGoals();

  const handleRemove = (index) => {};

  if (isError) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goals) return <div>loading...</div>;

  return (
    <>
      <h1 className="text-2xl mb-5">Goals</h1>
      <div className="grid grid-cols-2 gap-4">
        {goals.map((stack, stackIndex) => (
          <EditableList
            name={stack.name}
            stored={true}
            key={stack.id}
            id={stack.id}
            remove={handleRemove}
          />
        ))}
      </div>
    </>
  );
}
