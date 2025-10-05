import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { conversationService } from '@/services/conversation.service';
import { ConversationWithMessages } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatRelativeTime, getLeadQualityColor, getStatusColor } from '@/lib/utils';

const ConversationDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadConversation(id);
    }
  }, [id]);

  const loadConversation = async (conversationId: string) => {
    try {
      const data = await conversationService.getConversation(conversationId);
      setConversation(data);
    } catch (error) {
      console.error('Failed to load conversation:', error);
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

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Conversation not found</h2>
        <Link to="/conversations">
          <Button className="mt-4">Back to Conversations</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/conversations">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {conversation.customerName || conversation.customerPhone}
              </h1>
              <Badge className={getStatusColor(conversation.status)}>
                {conversation.status}
              </Badge>
              {conversation.leadQuality && (
                <Badge className={getLeadQualityColor(conversation.leadQuality)}>
                  {conversation.leadQuality}
                </Badge>
              )}
            </div>
            <p className="text-gray-600 mt-1">{conversation.customerPhone}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          <Button>Takeover</Button>
        </div>
      </div>

      {/* Messages */}
      <Card variant="bordered" className="p-6">
        <div className="space-y-4">
          {conversation.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-primary-600 text-white'
                }`}
              >
                <p className="text-sm mb-1">{message.content}</p>
                <p
                  className={`text-xs ${
                    message.role === 'user' ? 'text-gray-500' : 'text-primary-100'
                  }`}
                >
                  {formatRelativeTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ConversationDetailsPage;
