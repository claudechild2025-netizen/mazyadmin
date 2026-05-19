'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { FunnelStep } from '@/lib/queries';

/**
 * Completion funnel — алхам тус бүр дээр хэдэн оролцогч хүрсэн вэ?
 *
 * Hi-fi-уу үгүй, гэхдээ зорилго чухал — дипломын ажилд "хүүхдүүд хаана зогссон бэ?"
 * гэдгийг харуулах нэг screenshot.
 *
 * Drop-off хувийг bar дээр шууд бичиж тавьна — chart-ыг "уншихгүй" комисс ч ойлгоно.
 */
type Props = {
  data: FunnelStep[];
};

export function CompletionFunnel({ data }: Props) {
  const hasData = data.some((d) => d.count > 0);
  const max = Math.max(...data.map((d) => d.count), 1);
  const enriched = data.map((d, i) => ({
    ...d,
    pct: data[0]?.count ? Math.round((d.count / data[0].count) * 100) : 0,
    label: d.label_mn,
  }));

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">
        Хичээлийн алхам бүр дээрх оролцоо
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Алхам бүрд хэдэн оролцогч хүрсэн вэ. Drop-off хувь нь эхний алхамтай харьцуулсан.
      </p>

      {!hasData ? (
        <div className="mt-4 flex h-[480px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
          Одоохондоо өгөгдөл байхгүй. Mazy app-аар lesson дуусгасны дараа энд харагдана.
        </div>
      ) : (
      <div className="mt-4 h-[480px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={enriched}
            layout="vertical"
            margin={{ top: 8, right: 48, left: 60, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, max]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 12, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
              formatter={((v: any, _name: any, item: any) => [
                `${v} оролцогч (${item.payload.pct}%)`,
                item.payload.label,
              ]) as any}
            />
            <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]}>
              <LabelList
                dataKey="pct"
                position="right"
                formatter={((v: any) => `${v}%`) as any}
                style={{ fontSize: 11, fill: '#475569' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}
