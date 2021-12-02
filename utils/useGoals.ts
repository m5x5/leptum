import useSWR from "swr";

interface Goal {
  id: string;
  name: string;
  type: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
export function useGoals() {
  const { data: goals, error, mutate } = useSWR<Goal[]>("/api/goals", fetcher);
  const isLoading = !error && !goals;
  const isError = error;

  const addGoal = async (goal: string, type: string) => {
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ goal, type }),
    });
    console.log(response);
    const result = await response.json();
    mutate(result.goals);
  };

  const updateGoal = async (goal: string, id: string) => {
    const response = await fetch("/api/goals/" + id, {
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
    const response = await fetch("/api/goals/" + id, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const result = await response.json();
    mutate(result.goals);
  };

  return {
    goals,
    isLoading,
    isError,
    addGoal,
    updateGoal,
    deleteGoal,
  };
}
