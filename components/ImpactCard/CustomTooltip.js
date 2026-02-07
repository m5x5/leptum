import { capitalize } from "../../utils";
import { mentionsToPlainText } from "../ui/mention-input";

function CustomTooltip({ active, payload, label }) {
  if (!(active && payload && payload.length)) return null;

  const item = payload[0];
  return (
    <div className="bg-card border border-border p-4 rounded-lg">
      <div className="text-lg text-foreground">{mentionsToPlainText(item.payload.activity)}</div>
      <div className="tooltip-content">
        <ul>
          <li key={item.id} className="flex items-center justify-start pt-1">
            <span
              style={{ backgroundColor: item.fill }}
              className="h-5 w-5 inline-block rounded-lg m-1"
            ></span>
            <span className="text-foreground">
              {capitalize(item.dataKey)}: {item.value}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
CustomTooltip.displayName = "CustomTooltip";
export default CustomTooltip;
