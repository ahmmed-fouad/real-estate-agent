import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Send,
  User,
  Phone,
  MapPin,
  DollarSign,
  Home,
  Calendar,
  TrendingUp,
  Bot,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { conversationService } from '@/services/conversation.service';
import { ConversationWithMessages } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Input from '@/components/ui/Input';
import {
  formatRelativeTime,
  formatCurrency,
  getLeadQualityColor,
  getStatusColor,
  downloadFile,
} from '@/lib/utils';

const ConversationDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTakenOver, setIsTakenOver] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadConversation(id);
    }
  }, [id]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const loadConversation = async (conversationId: string) => {
    try {
      const data = await conversationService.getConversation(conversationId);
      setConversation(data);
      setIsTakenOver(data.status === 'waiting_agent');
    } catch (error) {
      toast.error('Failed to load conversation');
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeover = async () => {
    if (!id) return;

    try {
      await conversationService.takeoverConversation(id);
      setIsTakenOver(true);
      toast.success('Conversation taken over successfully');
      
      // Reload to get updated status
      loadConversation(id);
    } catch (error) {
      toast.error('Failed to takeover conversation');
    }
  };

  const handleSendMessage = async () => {
    if (!id || !newMessage.trim() || !isTakenOver) return;

    setIsSending(true);
    try {
      await conversationService.sendMessage(id, newMessage.trim());
      setNewMessage('');
      toast.success('Message sent');
      
      // Reload to show new message
      loadConversation(id);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleExport = async (format: 'json' | 'text' | 'csv') => {
    if (!id) return;

    setIsExporting(true);
    try {
      const blob = await conversationService.exportConversation(id, format);
      const filename = `conversation_${id}_${Date.now()}.${format}`;
      downloadFile(blob, filename);
      toast.success('Conversation exported successfully');
    } catch (error) {
      toast.error('Failed to export conversation');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;

    try {
      await conversationService.closeConversation(id);
      toast.success('Conversation closed');
      loadConversation(id);
    } catch (error) {
      toast.error('Failed to close conversation');
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

  const extractedInfo = conversation.metadata?.extractedInfo;

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
          <div className="relative">
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => handleExport('json')}
              isLoading={isExporting}
            >
              Export
            </Button>
          </div>
          {!isTakenOver && conversation.status !== 'closed' && (
            <Button onClick={handleTakeover} leftIcon={<UserCheck className="h-4 w-4" />}>
              Takeover
            </Button>
          )}
          {isTakenOver && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages - 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          {/* Takeover Status */}
          {isTakenOver && (
            <Card variant="bordered" className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center space-x-2 text-blue-800">
                <UserCheck className="h-5 w-5" />
                <p className="font-medium">You've taken over this conversation</p>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                You can now send messages directly to the customer. The AI is paused.
              </p>
            </Card>
          )}

          {/* Messages */}
          <Card variant="bordered" className="p-6">
            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
              {conversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div className={`flex items-start space-x-2 max-w-[80%]`}>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-gray-100 text-gray-900'
                          : message.role === 'agent'
                          ? 'bg-green-600 text-white'
                          : 'bg-primary-600 text-white'
                      }`}
                    >
                      {message.role !== 'user' && (
                        <div className="flex items-center space-x-1 mb-1">
                          {message.role === 'agent' ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                          <span className="text-xs font-medium opacity-75">
                            {message.role === 'agent' ? 'Agent' : 'AI Assistant'}
                          </span>
                        </div>
                      )}
                      <p className="text-sm mb-1 whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs ${
                          message.role === 'user'
                            ? 'text-gray-500'
                            : 'text-white opacity-75'
                        }`}
                      >
                        {formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                    {message.role !== 'user' && (
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === 'agent' ? 'bg-green-600' : 'bg-primary-600'
                        }`}
                      >
                        {message.role === 'agent' ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </Card>

          {/* Send Message Input */}
          {isTakenOver && conversation.status !== 'closed' && (
            <Card variant="bordered" className="p-4">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                    rows={3}
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  isLoading={isSending}
                  disabled={!newMessage.trim()}
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  Send
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </Card>
          )}
        </div>

        {/* Customer Information Sidebar - 1/3 width */}
        <div className="space-y-4">
          {/* Customer Details */}
          <Card variant="bordered" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-sm text-gray-900">
                    {conversation.customerName || 'Not provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="text-sm text-gray-900">{conversation.customerPhone}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Lead Score</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          conversation.leadScore >= 70
                            ? 'bg-green-600'
                            : conversation.leadScore >= 40
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${conversation.leadScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {conversation.leadScore}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Started</p>
                  <p className="text-sm text-gray-900">
                    {formatRelativeTime(conversation.startedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Last Activity</p>
                  <p className="text-sm text-gray-900">
                    {formatRelativeTime(conversation.lastActivityAt)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Extracted Preferences */}
          {extractedInfo && Object.keys(extractedInfo).length > 0 && (
            <Card variant="bordered" className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Extracted Preferences
              </h2>
              
              <div className="space-y-4">
                {extractedInfo.budget && (
                  <div className="flex items-start space-x-3">
                    <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Budget</p>
                      <p className="text-sm text-gray-900">
                        {formatCurrency(extractedInfo.budget, 'EGP')}
                      </p>
                    </div>
                  </div>
                )}

                {extractedInfo.location && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Preferred Location</p>
                      <p className="text-sm text-gray-900">{extractedInfo.location}</p>
                    </div>
                  </div>
                )}

                {extractedInfo.propertyType && (
                  <div className="flex items-start space-x-3">
                    <Home className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Property Type</p>
                      <p className="text-sm text-gray-900">{extractedInfo.propertyType}</p>
                    </div>
                  </div>
                )}

                {extractedInfo.bedrooms && (
                  <div className="flex items-start space-x-3">
                    <Home className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Bedrooms</p>
                      <p className="text-sm text-gray-900">{extractedInfo.bedrooms}</p>
                    </div>
                  </div>
                )}

                {extractedInfo.urgency && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Urgency</p>
                      <p className="text-sm text-gray-900">{extractedInfo.urgency}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Conversation Stats */}
          <Card variant="bordered" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stats</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Messages</span>
                <span className="text-sm font-medium text-gray-900">
                  {conversation.messages.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Customer Messages</span>
                <span className="text-sm font-medium text-gray-900">
                  {conversation.messages.filter((m) => m.role === 'user').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">AI Responses</span>
                <span className="text-sm font-medium text-gray-900">
                  {conversation.messages.filter((m) => m.role === 'assistant').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Agent Messages</span>
                <span className="text-sm font-medium text-gray-900">
                  {conversation.messages.filter((m) => m.role === 'agent').length}
                </span>
              </div>
            </div>
          </Card>

          {/* Export Options */}
          <Card variant="bordered" className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Export</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport('json')}
                isLoading={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport('text')}
                isLoading={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as Text
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport('csv')}
                isLoading={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConversationDetailsPage;
