import { AreaChart, ResponsiveContainer, XAxis } from "recharts";

export default function SummaryChart({ impacts }) {
  return (
    <ResponsiveContainer width="auto" maxHeight="50vw" height="100%" aspect={1}>
      <AreaChart data={impacts}>
        <XAxis dataKey="activity" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
