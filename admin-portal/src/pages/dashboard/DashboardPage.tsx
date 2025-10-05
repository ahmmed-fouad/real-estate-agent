import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  Building2, 
  TrendingUp,
  Plus,
  Clock,
  Activity,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { agentService } from '@/services/agent.service';
import { conversationService } from '@/services/conversation.service';
import { AgentStats, Conversation } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatNumber, formatRelativeTime, getStatusColor } from '@/lib/utils';

const DashboardPage = () => {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsData, conversationsData] = await Promise.all([
        agentService.getStats(),
        conversationService.getConversations({ page: 1, limit: 5 })
      ]);
      setStats(statsData);
      setRecentActivity(conversationsData.data || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Conversations',
      value: stats?.totalConversations || 0,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%',
    },
    {
      title: 'Active Conversations',
      value: stats?.activeConversations || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8%',
    },
    {
      title: 'New Leads',
      value: stats?.totalLeads || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+15%',
    },
    {
      title: 'Response Time Avg',
      value: `${stats?.averageResponseTime.toFixed(1) || 0}s`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '-5%',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/properties/add">
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              Add Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} variant="bordered" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
                </p>
                <p className="text-xs text-green-600 mt-1">{stat.change} from last month</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Customer Satisfaction */}
      {stats && (
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Satisfaction Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">4.7/5.0</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Based on {stats.totalConversations} conversations</p>
              <p className="text-xs text-green-600 mt-1">+0.3 from last month</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Activity Feed & Lead Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <Card variant="bordered" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <Link to="/conversations">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((conversation) => (
                <Link
                  key={conversation.id}
                  to={`/conversations/${conversation.id}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm text-gray-900">
                          {conversation.customerName || conversation.customerPhone}
                        </p>
                        <Badge className={getStatusColor(conversation.status)} size="sm">
                          {conversation.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{conversation.customerPhone}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(conversation.lastActivityAt)}
                      </p>
                    </div>
                    {conversation.leadScore && (
                      <div className="ml-3">
                        <p className="text-xs text-gray-500">Score</p>
                        <p className="text-sm font-semibold text-gray-900">{conversation.leadScore}</p>
                      </div>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </Card>

        {/* Lead Quality Distribution */}
        {stats && (
          <Card variant="bordered" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Quality Distribution</h2>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-900">Hot Leads</span>
                  <span className="text-2xl font-bold text-red-600">{stats.hotLeads}</span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${(stats.hotLeads / stats.totalLeads) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-900">Warm Leads</span>
                  <span className="text-2xl font-bold text-yellow-600">{stats.warmLeads}</span>
                </div>
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{ width: `${(stats.warmLeads / stats.totalLeads) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Cold Leads</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.coldLeads}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(stats.coldLeads / stats.totalLeads) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/properties/add">
          <Card variant="bordered" className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <Building2 className="h-8 w-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Add Property</h3>
            <p className="text-sm text-gray-600 mt-1">Create a new property listing</p>
          </Card>
        </Link>
        
        <Link to="/conversations">
          <Card variant="bordered" className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <MessageSquare className="h-8 w-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Conversations</h3>
            <p className="text-sm text-gray-600 mt-1">Manage customer conversations</p>
          </Card>
        </Link>
        
        <Link to="/analytics">
          <Card variant="bordered" className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <TrendingUp className="h-8 w-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Analytics</h3>
            <p className="text-sm text-gray-600 mt-1">View performance reports</p>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
