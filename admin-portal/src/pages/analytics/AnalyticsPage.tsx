import { useEffect, useState } from 'react';
import { Calendar, Download, TrendingUp, Users, MessageSquare, Target } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Input from '@/components/ui/Input';
import { analyticsService } from '@/services/analytics.service';
import {
  AnalyticsOverview,
  ConversationMetrics,
  LeadMetrics,
  PropertyMetrics,
} from '@/types';
import { formatNumber, downloadFile } from '@/lib/utils';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AnalyticsPage = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [conversationMetrics, setConversationMetrics] = useState<ConversationMetrics[]>([]);
  const [leadMetrics, setLeadMetrics] = useState<LeadMetrics[]>([]);
  const [propertyMetrics, setPropertyMetrics] = useState<PropertyMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [overviewData, conversationData, leadData, propertyData] = await Promise.all([
        analyticsService.getOverview({ startDate, endDate }),
        analyticsService.getConversationMetrics({ startDate, endDate, groupBy: 'day' }),
        analyticsService.getLeadMetrics({ startDate, endDate, groupBy: 'day' }),
        analyticsService.getPropertyMetrics({ startDate, endDate, limit: 10 }),
      ]);

      setOverview(overviewData);
      setConversationMetrics(conversationData);
      setLeadMetrics(leadData);
      setPropertyMetrics(propertyData);
    } catch (error) {
      toast.error('Failed to load analytics');
      console.error('Analytics error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsExporting(true);
    try {
      const blob = await analyticsService.exportReport({
        startDate,
        endDate,
        format,
      });
      const filename = `analytics_${startDate}_to_${endDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      downloadFile(blob, filename);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Calculate lead distribution for pie chart
  const leadDistribution = overview
    ? [
        { name: 'Hot Leads', value: overview.hotLeads, color: '#ef4444' },
        { name: 'Warm Leads', value: overview.warmLeads, color: '#f59e0b' },
        { name: 'Cold Leads', value: overview.coldLeads, color: '#0ea5e9' },
      ]
    : [];

  // Calculate conversion funnel data
  const funnelData = overview
    ? [
        { stage: 'Total Conversations', count: overview.totalConversations },
        { stage: 'Active Conversations', count: overview.activeConversations },
        { stage: 'Total Leads', count: overview.totalLeads },
        { stage: 'Hot Leads', count: overview.hotLeads },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">View detailed analytics and insights</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => handleExport('excel')}
            isLoading={isExporting}
          >
            Export Excel
          </Button>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => handleExport('pdf')}
            isLoading={isExporting}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card variant="bordered" className="p-4">
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={loadAnalytics}>Apply</Button>
        </div>
      </Card>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card variant="bordered" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatNumber(overview.totalConversations)}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card variant="bordered" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Conversations</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatNumber(overview.activeConversations)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card variant="bordered" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatNumber(overview.totalLeads)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card variant="bordered" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview.conversionRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts Row 1: Conversations Over Time & Response Time Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations Over Time */}
        <Card variant="bordered" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversations Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={conversationMetrics}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#0ea5e9"
                fillOpacity={1}
                fill="url(#colorTotal)"
                name="Total"
              />
              <Area
                type="monotone"
                dataKey="active"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
                name="Active"
              />
              <Area
                type="monotone"
                dataKey="closed"
                stroke="#6b7280"
                fill="#6b7280"
                fillOpacity={0.3}
                name="Closed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Response Time Trends */}
        <Card variant="bordered" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Time Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conversationMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Conversations"
              />
              <Line
                type="monotone"
                dataKey="escalated"
                stroke="#ef4444"
                strokeWidth={2}
                name="Escalated"
              />
            </LineChart>
          </ResponsiveContainer>
          {overview && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Response Time</span>
                <span className="text-lg font-semibold text-gray-900">
                  {overview.averageResponseTime.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">Escalation Rate</span>
                <span className="text-lg font-semibold text-gray-900">
                  {overview.escalationRate.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 2: Lead Distribution & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Quality Distribution */}
        <Card variant="bordered" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Quality Distribution</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {leadDistribution.map((item) => (
              <div key={item.name} className="text-center">
                <div
                  className="w-4 h-4 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-sm text-gray-600">{item.name}</p>
                <p className="text-lg font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Lead Conversion Funnel */}
        <Card variant="bordered" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Conversion Funnel</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="count" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
          {overview && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-900 font-medium">Conversion Rate</span>
                <Badge variant="info" size="lg">
                  {overview.conversionRate.toFixed(1)}%
                </Badge>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 3: Lead Trends & Top Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Trends Over Time */}
        <Card variant="bordered" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Trends Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={leadMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="hot"
                stroke="#ef4444"
                strokeWidth={2}
                name="Hot Leads"
              />
              <Line
                type="monotone"
                dataKey="warm"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Warm Leads"
              />
              <Line
                type="monotone"
                dataKey="cold"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Cold Leads"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Performing Properties */}
        <Card variant="bordered" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Performing Properties
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={propertyMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="propertyName" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="inquiries" fill="#0ea5e9" name="Inquiries" />
              <Bar dataKey="viewings" fill="#10b981" name="Viewings" />
              <Bar dataKey="conversions" fill="#f59e0b" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Customer Inquiry Topics (if data available) */}
      {overview && (
        <Card variant="bordered" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Avg. Conversation Length</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {overview.averageConversationLength.toFixed(1)} msgs
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Avg. Response Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {overview.averageResponseTime.toFixed(1)}s
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Escalation Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {overview.escalationRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {overview.conversionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsPage;
