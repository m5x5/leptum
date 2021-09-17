import { Line } from "react-chartjs-2";

/** @type {import("chart.js").LineControllerDatasetOptions} */
const structure = {
  datasets: [
    {
      label: 'Level',
      data: [],
      fill: false,
      backgroundColor: 'rgb(255, 99, 132)',
      borderColor: 'rgba(255, 99, 132, 0.2)',
    },
  ],
};

const getNumberFromString = (string) => {
  const number = parseInt(string.replace(/[^0-9]/g, ""), 10);
  return isNaN(number) ? 0 : number;
};

export default function ImpactCard({ data = [], labels, title }) {
  structure.labels = labels;
  structure.datasets[0].data = data.map(d => getNumberFromString(d));
  console.log(structure.datasets[0].data, labels);

  return (
    <div className="text-left p-5 bg-gray-800 rounded-md">
      <p className="text-2xl">{title}</p>
      <Line data={structure} />
      <input type="text" className="w-full" placeholder="%" className="rounded-md w-full py-2 px-3 bg-gray-700 mt-5" />
    </div>
  );
}