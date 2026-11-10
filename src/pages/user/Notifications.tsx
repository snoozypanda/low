import {
  Bell,
  BellRing,
  CheckCheck,
  Clock3,
  CreditCard,
  Info,
  MessageSquare,
  Ticket,
  Trophy,
  Truck,
  Undo2,
} from 'lucide-react'
import { useState } from 'react'
import { EmptyState, Button, Tabs, cn } from '../../components/ui'
import { useT } from '../../i18n'
import { formatDateTime, timeAgo } from '../../lib/format'
import { useMyNotifications, useStore } from '../../store/useStore'
import type { NotificationKind } from '../../types'

type NotifTab = 'app' | 'sms'

const kindStyles: Record<NotificationKind, { icon: typeof Bell; wrap: string; label: string }> = {
  entry: { icon: Ticket, wrap: 'bg-brand-tint text-brand-dark', label: 'Entry' },
  closing: { icon: Clock3, wrap: 'bg-[#FFF5E6] text-[#9A5B00]', label: 'Closing' },
  won: { icon: Trophy, wrap: 'bg-brand-tint text-brand-dark', label: 'Winner' },
  refund: { icon: Undo2, wrap: 'bg-[#EAF2FF] text-[#1D5FB8]', label: 'Refund' },
  system: { icon: Info, wrap: 'bg-page text-ink-muted', label: 'System' },
  fulfilment: { icon: Truck, wrap: 'bg-[#F1EBFF] text-[#6236B4]', label: 'Fulfilment' },
  payment: { icon: CreditCard, wrap: 'bg-[#FDECEF] text-accent', label: 'Payment' },
}

export default function Notifications() {
  const t = useT()
  const language = useStore((state) => state.language)
  const notifications = useMyNotifications()
  const markNotificationRead = useStore((state) => state.markNotificationRead)
  const markAllNotificationsRead = useStore((state) => state.markAllNotificationsRead)
  const [tab, setTab] = useState<NotifTab>('app')

  const unread = notifications.filter((n) => !n.read).length
  const smsItems = notifications.filter((n) => n.sms)
  const shown = tab === 'app' ? notifications : smsItems

  return (
    <div className="min-h-full bg-page pb-5">
      <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">{t('notifications')}</h2>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {unread ? `${unread} ${t('unread').toLowerCase()}` : t('markAllRead')}
          </p>
        </div>
        {unread ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
            onClick={markAllNotificationsRead}
          >
            {t('markAllRead')}
          </Button>
        ) : null}
      </div>

      <div className="px-4">
        <Tabs
          items={[
            { value: 'app', label: t('inApp'), count: notifications.length },
            { value: 'sms', label: t('smsInbox'), count: smsItems.length },
          ]}
          value={tab}
          onChange={(value) => setTab(value as NotifTab)}
        />
      </div>

      <div className="space-y-2 px-4 pt-3">
        {shown.length ? (
          tab === 'app' ? (
            shown.map((notification) => {
              const style = kindStyles[notification.kind]
              const Icon = style.icon
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markNotificationRead(notification.id)}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-2xl border p-3 text-left shadow-card transition active:scale-[0.997]',
                    notification.read ? 'border-line bg-white' : 'border-[#CFE3C6] bg-gradient-to-br from-white to-brand-soft',
                  )}
                >
                  <span className={cn('flex h-9 w-9 flex-none items-center justify-center rounded-xl', style.wrap)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-[12px] leading-snug', notification.read ? 'font-semibold text-ink' : 'font-extrabold text-ink')}>
                        {language === 'am' ? notification.titleAm : notification.title}
                      </p>
                      {!notification.read ? <span className="mt-1 h-2 w-2 flex-none rounded-full bg-brand" /> : null}
                    </div>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-muted">
                      {language === 'am' ? notification.bodyAm : notification.body}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[8.5px] font-semibold text-ink-soft">
                      <span className="rounded-full bg-page px-1.5 py-0.5 uppercase tracking-wide">{style.label}</span>
                      {notification.sms ? (
                        <span className="flex items-center gap-0.5 text-brand-dark">
                          <MessageSquare className="h-2.5 w-2.5" /> SMS
                        </span>
                      ) : null}
                      <span className="ml-auto">{timeAgo(notification.createdAt)}</span>
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="rounded-2xl border border-line bg-[#EEF2EC] p-3">
              <div className="flex items-center gap-2 pb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-ink">{t('smsPreview')}</p>
                  <p className="text-[8.5px] text-ink-soft">{t('smsDemoNote')}</p>
                </div>
              </div>
              <div className="space-y-2">
                {shown.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markNotificationRead(notification.id)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-end gap-1.5">
                      <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm">
                        <p className="text-[8px] font-bold uppercase tracking-wide text-brand-dark">{t('smsFrom')}</p>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-ink">
                          {language === 'am' ? notification.bodyAm : notification.body}
                        </p>
                        <p className="mt-1 text-right text-[7.5px] text-ink-soft">
                          {formatDateTime(notification.createdAt, language)}
                        </p>
                      </div>
                      {!notification.read ? <span className="mb-2 h-2 w-2 flex-none rounded-full bg-brand" /> : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          <EmptyState
            icon={tab === 'app' ? <BellRing className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            title={t('noNotifications')}
            body={t('noNotificationsBody')}
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-medium text-ink-soft">
        <Bell className="h-2.5 w-2.5" /> {t('smsDemoNote')}
      </div>
    </div>
  )
}
