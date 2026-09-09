// frontend/src/components/common/Charts/IndicatorChart.tsx
import React, { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, Paper, ToggleButtonGroup, ToggleButton } from '@mui/material';
import GoogleIcon from '../GoogleIcon';

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface IndicatorChartProps {
  title: string;
  data: DataPoint[];
  lines: { key: string; name: string; color: string }[];
  type?: 'line' | 'area' | 'bar' | 'pie';
  height?: number;
  showToggle?: boolean;
  unit?: string;
  target?: number;
}

const COLORS = ['#2E7D32', '#4CAF50', '#81C784', '#A5D6A7', '#1B5E20'];

type TooltipValue = string | number | readonly (string | number)[] | undefined;

export const IndicatorChart: React.FC<IndicatorChartProps> = ({
  title,
  data,
  lines,
  type: defaultType = 'line',
  height = 300,
  showToggle = true,
  unit = '',
  target,
}) => {
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar' | 'pie'>(defaultType);

  const formatTooltipValue = (value: TooltipValue) => {
    const displayValue = Array.isArray(value) ? value.join(', ') : value ?? '';
    return `${displayValue}${unit}`;
  };

  const handleChartTypeChange = (_event: React.MouseEvent<HTMLElement>, newType: 'line' | 'area' | 'bar' | 'pie' | null) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="name" stroke="#616161" />
            <YAxis stroke="#616161" tickFormatter={(value) => `${value}${unit}`} />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={3}
                dot={{ r: 4, fill: line.color }}
                activeDot={{ r: 6 }}
              />
            ))}
            {target && (
              <Line
                type="monotone"
                dataKey={() => target}
                name="Cible"
                stroke="#FF8F00"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="name" stroke="#616161" />
            <YAxis stroke="#616161" tickFormatter={(value) => `${value}${unit}`} />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            {lines.map((line) => (
              <Area
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                fill={line.color}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="name" stroke="#616161" />
            <YAxis stroke="#616161" tickFormatter={(value) => `${value}${unit}`} />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            {lines.map((line, index) => (
              <Bar key={line.key} dataKey={line.key} name={line.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </BarChart>
        );
      
      case 'pie': {
        const pieData = data.map((item) => ({
          name: item.name,
          value: item[lines[0]?.key] as number,
        }));
        return (
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name}: ${(((percent ?? 0) * 100).toFixed(0))}%`}
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
          </PieChart>
        );
      }
      
      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: '10px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        {showToggle && (
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            size="small"
            sx={{ '& .MuiToggleButton-root': { px: 2 } }}
          >
            <ToggleButton value="line">
              <GoogleIcon name="show_chart" size={24} />
            </ToggleButton>
            <ToggleButton value="area">
              <GoogleIcon name="trending_up" size={24} />
            </ToggleButton>
            <ToggleButton value="bar">
              <GoogleIcon name="bar_chart" size={24} />
            </ToggleButton>
            <ToggleButton value="pie">
              <GoogleIcon name="pie_chart" size={24} />
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </Paper>
  );
};