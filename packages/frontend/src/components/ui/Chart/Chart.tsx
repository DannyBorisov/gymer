import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import styles from "./Chart.module.css";

export interface ChartSeries {
  /** Key on each data point this series reads its value from. */
  dataKey: string;
  /** Line/bar color. Defaults to the app's accent green. */
  color?: string;
  /** Tooltip row label for this series, e.g. "Weight". */
  label?: string;
}

export interface ChartProps {
  /** "line" for a trend over time, "bar" for discrete per-point values. */
  type: "line" | "bar";
  data: Record<string, unknown>[];
  /** Key on each data point used as the X-axis category. */
  xKey: string;
  /** One series per line/bar to draw. Currently renders the first entry. */
  series: ChartSeries[];
  height?: number;
  /** Y-axis domain, e.g. ["dataMin - 2", "dataMax + 2"]. Recharts default if omitted. */
  yDomain?: [number | string, number | string];
  yTickFormatter?: (value: number) => string;
  xTickFormatter?: (value: string) => string;
  /** Formats a raw value into the tooltip's [value, label] pair. */
  tooltipFormatter?: (value: number) => [string, string];
  /** Draws a dashed horizontal reference line, e.g. an average. */
  referenceValue?: number;
}

/**
 * A themed chart, wrapping Recharts as an implementation detail. Consumers
 * describe *what* to plot (data, keys, formatters); this owns *how* it looks
 * (axes, tooltip, colors) so every chart in the app stays visually
 * consistent and Recharts specifics never leak into page components.
 */
export const Chart = ({
  type,
  data,
  xKey,
  series,
  height = 160,
  yDomain,
  yTickFormatter,
  xTickFormatter,
  tooltipFormatter,
  referenceValue,
}: ChartProps) => {
  const primary = series[0];
  const color = primary?.color ?? "var(--accent-green)";

  const tooltipProps = {
    contentStyle: {
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-default)",
      borderRadius: "8px",
      padding: "8px 12px",
      fontSize: "12px",
    },
    labelStyle: {
      color: "var(--text-muted)",
      marginBottom: "4px",
    },
    itemStyle: { color: "var(--text-primary)" },
    ...(tooltipFormatter && {
      formatter: (value: number) => tooltipFormatter(value),
    }),
    ...(xTickFormatter && { labelFormatter: xTickFormatter }),
  };

  const axisTick = { fontSize: 10, fill: "var(--text-muted)" };

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={height}>
        {type === "line" ? (
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              tickFormatter={yTickFormatter}
              width={45}
            />
            <Tooltip {...tooltipProps} />
            {referenceValue !== undefined && (
              <ReferenceLine
                y={referenceValue}
                stroke="var(--text-muted)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey={primary.dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: "var(--bg-primary)", stroke: color, strokeWidth: 2, r: 3 }}
              activeDot={{ fill: color, stroke: "var(--bg-primary)", strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey={xKey}
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              tickFormatter={yTickFormatter}
              width={40}
            />
            <Tooltip {...tooltipProps} />
            <Bar dataKey={primary.dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
