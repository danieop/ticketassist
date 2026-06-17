"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/auth-client';
import { apiBaseUrl } from '@/lib/workflow-api';
import { authFetch } from '@/lib/auth-client';

type NotificationType =
  | 'WORKFLOW_COMPLETED' | 'WORKFLOW_FAILED' | 'WORKFLOW_SUBMITTED'
  | 'REVIEW_APPROVED' | 'REVIEW_REJECTED' | 'REVIEW_NEEDS_INFO'
  | 'REGISTRATION_APPROVED';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: {
    workflowRunId?: string;
    ticketId?: string;
    ticketTitle?: string;
    decision?: string;
    comment?: string;
  };
  createdAt: string;
}

function getIcon(type: NotificationType): string {
  switch (type) {
    case 'WORKFLOW_COMPLETED': return '✅';
    case 'WORKFLOW_FAILED': return '❌';
    case 'WORKFLOW_SUBMITTED': return '📋';
    case 'REVIEW_APPROVED': return '👍';
    case 'REVIEW_REJECTED': return '👎';
    case 'REVIEW_NEEDS_INFO': return '❓';
    case 'REGISTRATION_APPROVED': return '🎉';
    default: return '🔔';
  }
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return 'just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // SSE connection
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const es = new EventSource(`${apiBaseUrl}/api/notifications/stream?token=${token}`);

    es.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse(e.data);
        setUnreadCount(data.unreadCount ?? 0);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data) as Notification;
        setNotifications((prev) => [data, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } catch { /* ignore parse errors */ }
    });

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    async function fetchInitial() {
      try {
        const [notifRes, countRes] = await Promise.all([
          authFetch(`${apiBaseUrl}/api/notifications?limit=20`),
          authFetch(`${apiBaseUrl}/api/notifications/unread-count`),
        ]);

        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data);
        }

        if (countRes.ok) {
          const data = await countRes.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch { /* ignore fetch errors */ }
    }

    fetchInitial();
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await authFetch(`${apiBaseUrl}/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await authFetch(`${apiBaseUrl}/api/notifications/read-all`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);

    const meta = notification.metadata;

    switch (notification.type) {
      case 'WORKFLOW_COMPLETED':
      case 'WORKFLOW_FAILED':
        if (meta?.workflowRunId) router.push(`/developer/workflow/${meta.workflowRunId}`);
        break;
      case 'WORKFLOW_SUBMITTED':
        router.push('/mentor');
        break;
      case 'REVIEW_APPROVED':
      case 'REVIEW_REJECTED':
      case 'REVIEW_NEEDS_INFO':
        if (meta?.workflowRunId) router.push(`/developer/workflow/${meta.workflowRunId}`);
        break;
      case 'REGISTRATION_APPROVED':
        router.push('/developer');
        break;
    }
  }, [markAsRead, router]);

  return (
    <div className="notification-bell" ref={containerRef}>
      <button className="notification-bell-button" onClick={() => setIsOpen(!isOpen)} aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="notification-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  className={`notification-item ${!n.read ? 'notification-item--unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className="notification-item-icon">{getIcon(n.type)}</span>
                  <div className="notification-item-content">
                    <span className="notification-item-title">{n.title}</span>
                    <span className="notification-item-message">{n.message}</span>
                    <span className="notification-item-time">{relativeTime(n.createdAt)}</span>
                  </div>
                  {!n.read && <span className="notification-item-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
