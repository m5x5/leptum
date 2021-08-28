import { useState } from "react";
import { useJobContext } from "../Job/Context";

export default function TaskList({ children }) {
  const [task, setTask] = useState([]);
  const { addTask } = useJobContext();

  const onChange = (e) => {
    const { value } = e.target;
    setTask(value);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    addTask(task);
    setTask("");
  };

  return (
    <div>
      <form>
        <input
          type="text"
          name="task"
          onChange={onChange}
          value={task}
          placeholder="Task name"
        />
        <button type="submit" onClick={onSubmit}>
          Add Task
        </button>
      </form>
      {children}
    </div>
  );
}
