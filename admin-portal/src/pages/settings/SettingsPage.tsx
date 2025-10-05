import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Bell, MessageSquare, Clock, Phone, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { agentService } from '@/services/agent.service';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { Agent, AgentSettings } from '@/types';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
  companyName: z.string().optional(),
  whatsappNumber: z.string().optional(),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const SettingsPage = () => {
  const { agent, setAgent } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Settings state
  const [greetingMessage, setGreetingMessage] = useState('');
  const [closingMessage, setClosingMessage] = useState('');
  const [escalationTriggers, setEscalationTriggers] = useState<string[]>([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false);
  const [workingHours, setWorkingHours] = useState<Record<string, { start: string; end: string; enabled: boolean }>>({});
  const [notifications, setNotifications] = useState({
    email: true,
    whatsapp: false,
    sms: false,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: agent?.fullName || '',
      phoneNumber: agent?.phoneNumber || '',
      companyName: agent?.companyName || '',
      whatsappNumber: agent?.whatsappNumber || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profile = await agentService.getProfile();
      setAgent(profile);

      // Load settings from agent
      if (profile.settings) {
        setGreetingMessage(profile.settings.greetingMessage || '');
        setClosingMessage(profile.settings.closingMessage || '');
        setEscalationTriggers(profile.settings.escalationTriggers || []);
        
        if (profile.settings.workingHours) {
          setWorkingHoursEnabled(profile.settings.workingHours.enabled || false);
          setWorkingHours(profile.settings.workingHours.schedule || {});
        }

        if (profile.settings.notificationPreferences) {
          setNotifications(profile.settings.notificationPreferences);
        }
      }

      // Initialize working hours if empty
      if (Object.keys(workingHours).length === 0) {
        const defaultHours: Record<string, { start: string; end: string; enabled: boolean }> = {};
        DAYS_OF_WEEK.forEach((day) => {
          defaultHours[day.key] = { start: '09:00', end: '17:00', enabled: true };
        });
        setWorkingHours(defaultHours);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (data: ProfileFormData) => {
    setIsSavingProfile(true);
    try {
      const updated = await agentService.updateProfile(data);
      setAgent(updated);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setIsSavingPassword(true);
    try {
      await authService.changePassword(data.oldPassword, data.newPassword);
      passwordForm.reset();
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSettingsSave = async () => {
    setIsSavingSettings(true);
    try {
      const settings: AgentSettings = {
        greetingMessage,
        closingMessage,
        escalationTriggers,
        workingHours: {
          enabled: workingHoursEnabled,
          timezone: 'Africa/Cairo',
          schedule: workingHours,
        },
        notificationPreferences: notifications,
        autoResponseEnabled: true,
      };

      await agentService.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const addEscalationTrigger = () => {
    if (newTrigger.trim() && !escalationTriggers.includes(newTrigger.trim())) {
      setEscalationTriggers([...escalationTriggers, newTrigger.trim()]);
      setNewTrigger('');
    }
  };

  const removeEscalationTrigger = (trigger: string) => {
    setEscalationTriggers(escalationTriggers.filter((t) => t !== trigger));
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card variant="bordered" className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <User className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
        </div>

        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              error={profileForm.formState.errors.fullName?.message}
              {...profileForm.register('fullName')}
            />

            <Input
              label="Email"
              type="email"
              value={agent?.email}
              disabled
              helperText="Email cannot be changed"
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number"
              error={profileForm.formState.errors.phoneNumber?.message}
              {...profileForm.register('phoneNumber')}
            />

            <Input
              label="WhatsApp Number"
              type="tel"
              placeholder="Enter your WhatsApp number"
              error={profileForm.formState.errors.whatsappNumber?.message}
              {...profileForm.register('whatsappNumber')}
            />

            <div className="md:col-span-2">
              <Input
                label="Company Name"
                placeholder="Enter your company name"
                error={profileForm.formState.errors.companyName?.message}
                {...profileForm.register('companyName')}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSavingProfile} leftIcon={<Save className="h-4 w-4" />}>
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card variant="bordered" className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <User className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        </div>

        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              error={passwordForm.formState.errors.oldPassword?.message}
              {...passwordForm.register('oldPassword')}
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm new password"
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword')}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSavingPassword} leftIcon={<Save className="h-4 w-4" />}>
              Change Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Response Customization */}
      <Card variant="bordered" className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <MessageSquare className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Response Customization</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Greeting Message
            </label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              placeholder="e.g., Hello! Welcome to our real estate service. How can I help you today?"
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              This message will be sent when a customer first contacts you
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Closing Message
            </label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              placeholder="e.g., Thank you for your interest! Feel free to reach out if you have more questions."
              value={closingMessage}
              onChange={(e) => setClosingMessage(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              This message will be sent when ending a conversation
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Escalation Triggers
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Keywords that will trigger agent notification
            </p>
            <div className="flex space-x-2 mb-2">
              <Input
                placeholder="e.g., complaint, urgent, manager"
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEscalationTrigger();
                  }
                }}
              />
              <Button type="button" onClick={addEscalationTrigger}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {escalationTriggers.map((trigger) => (
                <span
                  key={trigger}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                >
                  {trigger}
                  <button
                    type="button"
                    onClick={() => removeEscalationTrigger(trigger)}
                    className="ml-2 text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Working Hours */}
      <Card variant="bordered" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Working Hours</h2>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={workingHoursEnabled}
              onChange={(e) => setWorkingHoursEnabled(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable working hours</span>
          </label>
        </div>

        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day.key} className="flex items-center space-x-4">
              <label className="flex items-center min-w-[120px]">
                <input
                  type="checkbox"
                  checked={workingHours[day.key]?.enabled ?? true}
                  onChange={(e) =>
                    setWorkingHours({
                      ...workingHours,
                      [day.key]: {
                        ...workingHours[day.key],
                        enabled: e.target.checked,
                        start: workingHours[day.key]?.start || '09:00',
                        end: workingHours[day.key]?.end || '17:00',
                      },
                    })
                  }
                  disabled={!workingHoursEnabled}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{day.label}</span>
              </label>

              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="time"
                  value={workingHours[day.key]?.start || '09:00'}
                  onChange={(e) =>
                    setWorkingHours({
                      ...workingHours,
                      [day.key]: {
                        ...workingHours[day.key],
                        start: e.target.value,
                        end: workingHours[day.key]?.end || '17:00',
                        enabled: workingHours[day.key]?.enabled ?? true,
                      },
                    })
                  }
                  disabled={!workingHoursEnabled || !workingHours[day.key]?.enabled}
                  className="block rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="time"
                  value={workingHours[day.key]?.end || '17:00'}
                  onChange={(e) =>
                    setWorkingHours({
                      ...workingHours,
                      [day.key]: {
                        ...workingHours[day.key],
                        start: workingHours[day.key]?.start || '09:00',
                        end: e.target.value,
                        enabled: workingHours[day.key]?.enabled ?? true,
                      },
                    })
                  }
                  disabled={!workingHoursEnabled || !workingHours[day.key]?.enabled}
                  className="block rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-500">
          When working hours are enabled, the AI will inform customers when you're unavailable
        </p>
      </Card>

      {/* Notification Preferences */}
      <Card variant="bordered" className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-xs text-gray-500">Receive notifications via email</p>
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.whatsapp}
                onChange={(e) =>
                  setNotifications({ ...notifications, whatsapp: e.target.checked })
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">WhatsApp Notifications</p>
                <p className="text-xs text-gray-500">Receive notifications via WhatsApp</p>
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.sms}
                onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">SMS Notifications</p>
                <p className="text-xs text-gray-500">Receive notifications via SMS</p>
              </div>
            </div>
          </label>
        </div>
      </Card>

      {/* WhatsApp Configuration */}
      {agent?.whatsappNumber && (
        <Card variant="bordered" className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Phone className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">WhatsApp Configuration</h2>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">WhatsApp Connected</p>
                <p className="text-xs text-green-700 mt-1">Number: {agent.whatsappNumber}</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            To change your WhatsApp number, please update it in your profile settings
          </p>
        </Card>
      )}

      {/* Save All Settings */}
      <div className="flex justify-end">
        <Button
          onClick={handleSettingsSave}
          isLoading={isSavingSettings}
          leftIcon={<Save className="h-4 w-4" />}
          size="lg"
        >
          Save All Settings
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
