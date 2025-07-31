import Head from "next/head";
import CreationBar from "../components/CreationBar";
import { useJobContext } from "../components/Job/Context";
import JobListItem from "../components/Job/ListItem";
import { DbJob, Habit } from "../components/Job/api";
import Sidebar from "../components/Sidebar";
import TaskListItem from "../components/Tasks/Item";
import TaskList from "../components/Tasks/List";
import StandaloneTaskItem from "../components/Tasks/StandaloneItem";
import { useStandaloneTasks } from "../utils/useStandaloneTasks";
import { isCronValid, sortObjectsByDueDate } from "../utils/cron";


export default function Home() {
  const { jobs, selected } = useJobContext();
  const { 
    tasks: standaloneTasks, 
    addTask: addStandaloneTask, 
    updateTask: updateStandaloneTask,
    deleteTask: deleteStandaloneTask,
    completeTask: completeStandaloneTask,
    uncompleteTask: uncompleteStandaloneTask
  } = useStandaloneTasks();

  return (
    <>
      <Head>
        <title>Leptum</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Sidebar className="flex-grow rounded-xl">
        {jobs
          .sort(sortObjectsByDueDate)
          .map((job: DbJob, i: number) => (
            <JobListItem key={job.cron + "-" + i} job={job} isValid={isCronValid(job)} />
          ))}
      </Sidebar>
      <div className="flex-grow overflow-y-auto">
        <CreationBar onCreateStandaloneTask={addStandaloneTask} />
        
        {/* Standalone Tasks Section */}
        {standaloneTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 px-2">
              Quick Tasks
            </h2>
            <div className="space-y-1">
              {standaloneTasks.map((task) => (
                <StandaloneTaskItem
                  key={task.id}
                  task={task}
                  onComplete={completeStandaloneTask}
                  onUncomplete={uncompleteStandaloneTask}
                  onDelete={deleteStandaloneTask}
                  onUpdate={updateStandaloneTask}
                />
              ))}
            </div>
          </div>
        )}

        {/* Routine Tasks Section */}
        <TaskList>
          {selected ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 px-2">
                Routine Tasks
              </h2>
              {jobs
                .find((job: DbJob) => job.cron === selected)
                ?.habits.map((habit: Habit, i: number) => (
                  <TaskListItem key={habit.name + "-" + i} task={habit} index={i} />
                ))}
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <p className="text-lg">Select a routine from the sidebar to view routine tasks</p>
            </div>
          )}
        </TaskList>
      </div>
    </>
  );
}
