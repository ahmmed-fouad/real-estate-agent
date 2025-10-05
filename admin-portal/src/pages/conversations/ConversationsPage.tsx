import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { conversationService } from '@/services/conversation.service';
import { Conversation } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatRelativeTime, getLeadQualityColor, getStatusColor } from '@/lib/utils';

const ConversationsPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await conversationService.getConversations({ page: 1, limit: 20 });
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-600 mt-1">Manage customer conversations</p>
        </div>
      </div>

      {/* Filters */}
      <Card variant="bordered" className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Search conversations..."
              leftIcon={<Search className="h-5 w-5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
            Filters
          </Button>
        </div>
      </Card>

      {/* Conversations List */}
      <Card variant="bordered">
        <div className="divide-y divide-gray-200">
          {conversations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <Link
                key={conversation.id}
                to={`/conversations/${conversation.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {conversation.customerName || conversation.customerPhone}
                      </h3>
                      <Badge className={getStatusColor(conversation.status)} size="sm">
                        {conversation.status}
                      </Badge>
                      {conversation.leadQuality && (
                        <Badge className={getLeadQualityColor(conversation.leadQuality)} size="sm">
                          {conversation.leadQuality}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{conversation.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {formatRelativeTime(conversation.lastActivityAt)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Score: {conversation.leadScore}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default ConversationsPage;
