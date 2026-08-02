"use client";

import { Pie, PieChart, ResponsiveContainer } from "recharts";

type ChartData = {
  name: string;
  value: number;
  fill: string;
};

export default function PieChartWithPaddingAngle({
  isAnimationActive = true,
  data = [],
}: {
  isAnimationActive?: boolean;
  data?: ChartData[];
}) {
  return (
    <div style={{ width: "100%", height: 250, minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={data.length > 0 ? data : [{ name: "Empty", value: 1, fill: "#ccc" }]}
            innerRadius="72%"
            outerRadius="100%"
            cornerRadius="50%"
            paddingAngle={6}
            dataKey="value"
            isAnimationActive={isAnimationActive}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
