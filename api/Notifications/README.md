# Notification History API

This document covers only the PHP API added for notification history. It does not document FCM sending, notification creation, Service Worker behavior, or frontend mock replacement.

## Endpoints

| Feature | Method | URL |
| --- | --- | --- |
| List notifications | GET | /TABI/api/Notifications/List.php |
| Unread count | GET | /TABI/api/Notifications/UnreadCount.php |
| Mark one as read | PATCH | /TABI/api/Notifications/MarkRead.php?recipientId={recipientId} |
| Mark all as read | PATCH | /TABI/api/Notifications/MarkAllRead.php |

A small fallback router is also available with /TABI/api/Notifications/index.php?action=list, unread-count, mark-read, or read-all. The project mostly uses direct PHP file URLs, so prefer the URLs above.

## Authentication

All endpoints require a logged-in PHP session. The API reads the user from $_SESSION["user_id"]. It never accepts user_id from query parameters or request body.

Unauthenticated response:

~~~json
{
  "success": false,
  "message": "Login is required."
}
~~~

HTTP status: 401.

## List Notifications

GET /TABI/api/Notifications/List.php

Query parameters:

| Name | Description |
| --- | --- |
| category | all, unread, chat, schedule, survey, system. Default: all |
| limit | Integer from 1 to 50. Default: 20 |
| offset | Integer 0 or greater. Default: 0 |

member and split_bill do not have dedicated tabs, so they are included in all and unread.

Expired notifications are excluded with this condition: expires_at IS NULL OR expires_at > NOW().

Rows are ordered by notification_recipients.created_at DESC, recipient_id DESC.

The API fetches limit + 1 rows internally to calculate hasMore, then returns at most limit rows.

Example response:

~~~json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "recipientId": 15,
        "notificationId": 10,
        "category": "chat",
        "subtype": "message",
        "title": "New message",
        "body": "A chat message was received.",
        "targetType": "chat_room",
        "targetId": 5,
        "actionPath": "/TABI/chat/5",
        "detailData": null,
        "isRead": false,
        "readAt": null,
        "createdAt": "2026-07-22 18:00:00",
        "receivedAt": "2026-07-22 18:00:00",
        "expiresAt": null
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "returnedCount": 1,
      "hasMore": false
    }
  }
}
~~~

## detail_data

The MySQL JSON value is decoded in PHP and returned as an array/object. If the JSON is invalid, the API does not stop the whole response; it returns null for detailData.

## action_path

action_path is returned only when it starts with /TABI/ or equals /TABI. External URLs, javascript:, data:, and protocol-relative URLs are returned as null. The DB value is not modified.

## Unread Count

GET /TABI/api/Notifications/UnreadCount.php

Expired notifications are excluded.

~~~json
{
  "success": true,
  "data": {
    "unreadCount": 125,
    "badgeText": "99+"
  }
}
~~~

When unreadCount is 0, badgeText is null.

## Mark One As Read

PATCH /TABI/api/Notifications/MarkRead.php?recipientId=15

recipientId means notification_recipients.recipient_id. The update uses both recipient_id and the logged-in user_id, so another user's notification cannot be updated.

Already-read notifications are not treated as errors. This makes repeated requests safe.

~~~json
{
  "success": true,
  "message": "Marked as read.",
  "data": {
    "recipientId": 15,
    "isRead": true,
    "readAt": "2026-07-22 18:30:00"
  }
}
~~~

If the recipient does not exist for the logged-in user, the API returns HTTP 404.

## Mark All As Read

PATCH /TABI/api/Notifications/MarkAllRead.php

Only non-expired unread notifications for the logged-in user are updated. The operation runs in a transaction, then returns the updated count and remaining unread count.

~~~json
{
  "success": true,
  "message": "All notifications were marked as read.",
  "data": {
    "updatedCount": 5,
    "unreadCount": 0
  }
}
~~~

Zero unread notifications is still a success.

## Error Statuses

| HTTP | Meaning |
| --- | --- |
| 400 | Invalid category, limit, offset, or recipientId |
| 401 | Not logged in |
| 403 | Cross-origin update request rejected |
| 404 | Notification recipient not found for the logged-in user |
| 405 | Unsupported method |
| 500 | Database processing failed |

## Security Notes

- user_id is read only from the PHP session.
- SQL uses PDO prepared statements.
- Responses do not include SQL text, DB connection info, FCM tokens, token_hash values, PHP exception details, or stack traces.
- PATCH endpoints reuse the existing notification API style of Origin/Referer host checks.
- Final notification delivery decisions should still be made server-side by checking notification_settings and user_devices.

## Not Implemented Here

- FCM HTTP v1 sending
- Notification creation API
- Admin notification delivery
- Frontend mock data replacement
- Service Worker changes
- onMessage handling
- Database table or SQL file changes
