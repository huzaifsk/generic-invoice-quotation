
import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';
import { api } from '../services/api';
import { useAppContext } from '../hooks/useAppContext';

const ReportCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">{title}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
    </div>
);

type RangeKey = '1d' | '1w' | '1m' | '1y' | 'all';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
    { key: '1d', label: '1 day' },
    { key: '1w', label: '1 week' },
    { key: '1m', label: '1 month' },
    { key: '1y', label: '1 year' },
    { key: 'all', label: 'All' },
];

const numberFormat = new Intl.NumberFormat('en-US');

const toValueSeries = (monthlyRevenue: { name: string; revenue: number }[]) =>
    monthlyRevenue.map((item) => ({ label: item.name, value: Number(item.revenue || 0) }));

const takeLastValues = (series: { label: string; value: number }[], count: number) => {
    if (!series.length) {
        return Array.from({ length: count }, () => 0);
    }
    const raw = series.slice(-count).map((point) => point.value);
    if (raw.length >= count) return raw;
    const pad = Array.from({ length: count - raw.length }, (_, idx) => raw[idx % raw.length]);
    return [...pad, ...raw];
};

const buildChartData = (range: RangeKey, monthlyRevenue: { name: string; revenue: number }[]) => {
    const baseSeries = toValueSeries(monthlyRevenue);

    if (range === '1w') {
        const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const values = takeLastValues(baseSeries, 7);
        return labels.map((label, index) => ({ label, value: values[index] }));
    }

    if (range === '1d') {
        const labels = ['00', '04', '08', '12', '16', '20'];
        const values = takeLastValues(baseSeries, 6);
        return labels.map((label, index) => ({ label, value: values[index] }));
    }

    if (range === '1m') {
        const labels = ['W1', 'W2', 'W3', 'W4'];
        const values = takeLastValues(baseSeries, 4);
        return labels.map((label, index) => ({ label, value: values[index] }));
    }

    if (range === '1y') {
        return baseSeries.slice(-12).map((point) => ({
            label: point.label.slice(0, 3),
            value: point.value,
        }));
    }

    return baseSeries.map((point) => ({ label: point.label, value: point.value }));
};

const ChartTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string; currency: string }> = ({ active, payload, label, currency }) => {
    if (!active || !payload?.length) return null;
    const value = Number(payload[0]?.value || 0);

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
            <p className="font-semibold text-slate-900">{label}</p>
            <p>{new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)}</p>
        </div>
    );
};

const Reports: React.FC = () => {
    const { companyInfo } = useAppContext();
    const [reportData, setReportData] = useState({
        totalRevenue: 0,
        totalUnpaid: 0,
        totalVatCollected: 0,
        monthlyRevenue: [] as { name: string; revenue: number }[],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [range, setRange] = useState<RangeKey>('1w');
    const [activeIndex, setActiveIndex] = useState(2);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await api.getReportOverview();
                setReportData(data);
                setError('');
            } catch {
                setError('Failed to load reports.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const chartData = useMemo(
        () => buildChartData(range, reportData.monthlyRevenue),
        [range, reportData.monthlyRevenue]
    );

    useEffect(() => {
        if (!chartData.length) {
            setActiveIndex(0);
            return;
        }
        setActiveIndex(Math.min(Math.floor(chartData.length / 2), chartData.length - 1));
    }, [range, chartData.length]);

    const activeValue = chartData[activeIndex]?.value || 0;
    const maxValue = Math.max(...chartData.map((item) => item.value), 0);
    const yAxisMax = maxValue > 0 ? Math.ceil(maxValue * 1.15) : 100;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: companyInfo?.currency || 'AED' }).format(amount);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1">
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Insights</p>
                <h1 className="text-3xl font-semibold text-slate-900">Reports</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <ReportCard title="Total Revenue" value={formatCurrency(reportData.totalRevenue)} />
                <ReportCard title="Total Unpaid" value={formatCurrency(reportData.totalUnpaid)} />
                <ReportCard title="VAT Collected" value={formatCurrency(reportData.totalVatCollected)} />
            </div>
            {error && <p className="text-sm text-slate-600">{error}</p>}

            <section className="space-y-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Monthly View</p>
                    <h2 className="text-2xl font-semibold text-slate-900">Revenue Trend</h2>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6">
                    <div className="mx-auto mb-6 w-full max-w-2xl rounded-2xl bg-slate-100 p-1.5">
                        <div className="grid grid-cols-5 gap-1">
                            {RANGE_OPTIONS.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setRange(option.key)}
                                    className={`${
                                        range === option.key
                                            ? 'ui-btn-secondary border-(--primary-100) bg-white text-(--text-strong)'
                                            : 'bg-transparent text-slate-600'
                                    } ui-focus-ring rounded-xl px-2 sm:px-3 py-2 text-[11px] sm:text-sm font-semibold`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm text-slate-500">Selected Value</p>
                        <p className="text-lg font-semibold text-(--primary-400)">{numberFormat.format(activeValue)}</p>
                    </div>

                    <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 18, right: 8, left: -20, bottom: 0 }}
                        >
                            <CartesianGrid vertical={false} strokeDasharray="8 10" stroke="rgba(100, 116, 139, 0.2)" />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                domain={[0, yAxisMax]}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={<ChartTooltip currency={companyInfo?.currency || 'AED'} />}
                            />
                            <Bar
                                dataKey="value"
                                barSize={32}
                                radius={[16, 16, 16, 16]}
                                onClick={(_data, index) => setActiveIndex(index)}
                            >
                                {chartData.map((item, index) => (
                                    <Cell
                                        key={`${item.label}-${index}`}
                                        fill={index === activeIndex ? 'var(--primary-300)' : 'color-mix(in srgb, var(--border-soft) 72%, white)'}
                                    />
                                ))}
                                <LabelList
                                    dataKey="value"
                                    content={(props: any) => {
                                        const { index, x, y, width, value } = props;
                                        if (index !== activeIndex || x == null || y == null || width == null) return null;
                                        const text = numberFormat.format(Number(value || 0));
                                        const bubbleWidth = Math.max(56, text.length * 9 + 20);
                                        const bubbleX = x + width / 2 - bubbleWidth / 2;
                                        const bubbleY = y - 52;

                                        return (
                                            <g>
                                                <rect x={bubbleX} y={bubbleY} rx={14} ry={14} width={bubbleWidth} height={34} fill="var(--primary-300)" />
                                                <path d={`M ${x + width / 2 - 7} ${bubbleY + 34} L ${x + width / 2 + 7} ${bubbleY + 34} L ${x + width / 2} ${bubbleY + 43} Z`} fill="var(--primary-300)" />
                                                <text x={x + width / 2} y={bubbleY + 22} textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">
                                                    {text}
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                </div>
                {loading && <p className="text-sm text-slate-500">Loading report data...</p>}
            </section>
        </div>
    );
};

export default Reports;
