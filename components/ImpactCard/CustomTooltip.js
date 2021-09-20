import { capitalize } from "../../utils";

export default function ({ active, payload, label }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-lg">{item.payload.activity}</div>
        <div className="tooltip-content">
          <ul>
            <li key={item.id} className="flex items-center justify-start pt-1">
              <span
                style={{ backgroundColor: item.fill }}
                className="h-5 w-5 inline-block rounded-lg m-1"
              ></span>
              <span className="">
                {capitalize(item.dataKey)}: {item.value}
              </span>
            </li>
          </ul>
        </div>
      </div>
    );
  }
  return null;
}
