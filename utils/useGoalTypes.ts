import useSWR from "swr";

interface GoalType {
  id: string;
  name: string;
  description: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
export function useGoalTypes() {
  const {
    data: goalTypes,
    error,
    mutate,
  } = useSWR<GoalType[]>("/api/goal-types", fetcher);
  const isLoading = !error && !goalTypes;
  const isError = error;

  const addGoal = async (goal: string) => {
    const response = await fetch("/api/goal-types", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ goal }),
    });
    const result = await response.json();
    mutate(result.goals);
  };

  const updateGoal = async (goal: string, id: string) => {
    const response = await fetch("/api/goal-types/" + id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: goal }),
    });
    const result = await response.json();
    mutate(result.goals);
  };

  const deleteGoal = async (id: string) => {
    const response = await fetch("/api/goal-types/" + id, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const result = await response.json();
    mutate(result.goals);
  };

  return {
    goalTypes,
    isLoading,
    isError,
    addGoal,
    updateGoal,
    deleteGoal,
  };
}
