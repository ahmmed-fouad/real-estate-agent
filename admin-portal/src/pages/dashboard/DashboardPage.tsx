import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  Building2, 
  TrendingUp,
  Plus
} from 'lucide-react';
import { agentService } from '@/services/agent.service';
import { AgentStats } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { formatNumber } from '@/lib/utils';

const DashboardPage = () => {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await agentService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
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
    },
    {
      title: 'Active Conversations',
      value: stats?.activeConversations || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Properties',
      value: stats?.totalProperties || 0,
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Leads',
      value: stats?.totalLeads || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
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
                  {formatNumber(stat.value)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Lead Quality Distribution */}
      {stats && (
        <Card variant="bordered" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Quality</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.hotLeads}</p>
              <p className="text-sm text-gray-600 mt-1">Hot Leads</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{stats.warmLeads}</p>
              <p className="text-sm text-gray-600 mt-1">Warm Leads</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.coldLeads}</p>
              <p className="text-sm text-gray-600 mt-1">Cold Leads</p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card variant="bordered" className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/properties/add">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
              <Building2 className="h-8 w-8 text-gray-400 mb-2" />
              <h3 className="font-medium text-gray-900">Add Property</h3>
              <p className="text-sm text-gray-600 mt-1">Add a new property to your listings</p>
            </div>
          </Link>
          
          <Link to="/conversations">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
              <MessageSquare className="h-8 w-8 text-gray-400 mb-2" />
              <h3 className="font-medium text-gray-900">View Conversations</h3>
              <p className="text-sm text-gray-600 mt-1">Check recent customer conversations</p>
            </div>
          </Link>
          
          <Link to="/analytics">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
              <TrendingUp className="h-8 w-8 text-gray-400 mb-2" />
              <h3 className="font-medium text-gray-900">View Analytics</h3>
              <p className="text-sm text-gray-600 mt-1">Analyze your performance metrics</p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
